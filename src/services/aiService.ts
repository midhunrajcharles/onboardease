// ─── Deploy AI Service ────────────────────────────────────────────────────────
// Calls Deploy AI API for real responses. Falls back to smart mocks on error.

const AUTH_URL         = 'https://api-auth.deploy.ai/oauth2/token'
const API_URL          = 'https://core-api.deploy.ai'
const ORG_ID           = import.meta.env.VITE_DEPLOY_AI_ORG_ID || ''
const AGENT_ID         = 'GPT_4O'            // general-purpose agent
const TASK_AGENT_ID    = 'task_generator'    // dedicated task-generation agent

// ─── AIML API (OnboardBot) ────────────────────────────────────────────────────
// Uses AIML API with GPT-4o for intelligent, context-aware OnboardBot responses.
const AIML_API_URL        = 'https://api.aimlapi.com'
const AIML_API_KEY        = import.meta.env.VITE_AIML_API_KEY || ''
const AIML_MODEL          = 'openai/gpt-5-chat-latest'  // high-capability model for OnboardBot
const AIML_SALES_MODEL    = 'openai/gpt-5-chat-latest'  // model for email simulation agent

/**
 * Calls AIML API chat completions with proper system/user/assistant message format.
 * System prompt is passed as a dedicated system message (not concatenated into user content).
 * Conversation history is sent as alternating user/assistant turns.
 */
async function callAimlChatCompletion(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string
): Promise<string | null> {
  try {
    const res = await fetch(`${AIML_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AIML_API_KEY}`,
      },
      body: JSON.stringify({
        model: AIML_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch { return null }
}

// ─── Auth token (cached) ──────────────────────────────────────────────────────
let cachedToken: string | null = null
let tokenExpiry = 0

async function getAccessToken(): Promise<string | null> {
  const clientId     = import.meta.env.VITE_CLIENT_ID
  const clientSecret = import.meta.env.VITE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  try {
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
    const res  = await fetch(AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!res.ok) return null
    const data = await res.json()
    cachedToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
    return cachedToken
  } catch { return null }
}

async function createChat(token: string, agentId: string = AGENT_ID): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/chats`, {
      method: 'POST',
      headers: { 'accept': 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Org': ORG_ID },
      body: JSON.stringify({ agentId, stream: false }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id
  } catch { return null }
}

async function sendMessage(token: string, chatId: string, content: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Org': ORG_ID },
      body: JSON.stringify({ chatId, stream: false, content: [{ type: 'text', value: content }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.content?.[0]?.value ?? null
  } catch { return null }
}

// ─── Smart mock responses ─────────────────────────────────────────────────────

function mockTasksFromDocument(docContent: string, docName: string, employeeRole?: string): string {
  const lower = (docName + docContent).toLowerCase()
  const role  = (employeeRole ?? '').toLowerCase()

  if (lower.includes('security') || lower.includes('password') || lower.includes('vpn')) {
    return `Here are the onboarding tasks I generated from **${docName}**:

**Security & Compliance Tasks**

1. **Complete cybersecurity awareness training** — Watch the mandatory security training video and pass the assessment quiz. *(30 min · Compliance)*
2. **Enable Multi-Factor Authentication (MFA)** — Set up MFA on all company accounts including email, Slack, and GitHub. *(15 min · Security)*
3. **Set up company VPN** — Install and configure the VPN client. Required for all remote work sessions. *(20 min · Tools)*
4. **Review data classification policy** — Understand public, internal, confidential, and restricted data labels. *(15 min · Compliance)*
5. **Create a strong password using company policy** — Use a password manager and generate 12+ character passwords for all tools. *(10 min · Security)*
6. **Report your devices to IT** — Register all devices used for company work in the asset management portal. *(10 min · Admin)*
7. **Sign security policy acknowledgement** — Digitally sign the IT Security Policy document in DocuSign. *(5 min · Compliance)*
8. **Complete phishing simulation exercise** — Practice identifying phishing emails in a safe training environment. *(20 min · Security)*

Would you like me to add, remove, or modify any of these tasks before assigning?`
  }

  if (lower.includes('engineering') || lower.includes('react') || lower.includes('github') || role.includes('engineer') || role.includes('developer')) {
    return `Here are the onboarding tasks I generated from **${docName}**:

**Technical Onboarding Tasks — Engineering**

1. **Set up local development environment** — Clone the main repository, install dependencies, and run the app locally. *(1 hr · Setup)*
2. **Complete GitHub access & SSH key setup** — Configure SSH keys, join the GitHub org, and verify repository access. *(20 min · Tools)*
3. **Architecture deep-dive with buddy** — Walk through the system architecture diagram with Sarah Chen. *(1 hr · Learning)*
4. **Review coding standards & PR guidelines** — Read the contributing guide and understand code review requirements. *(30 min · Learning)*
5. **Set up local testing environment** — Run the full test suite locally and ensure 100% pass rate. *(30 min · Setup)*
6. **Complete first "good first issue"** — Pick up a beginner-tagged issue, implement a fix, and submit a PR. *(2 hrs · Technical)*
7. **Attend daily standups for one week** — Join standups as an observer to learn team rhythm and communication style. *(15 min/day · People)*
8. **Review CI/CD pipeline documentation** — Understand the deployment pipeline from feature branch to production. *(30 min · Learning)*
9. **Set up monitoring dashboards** — Get access to DataDog/Grafana and bookmark key dashboards. *(15 min · Tools)*
10. **Complete pair programming session** — Pair with a senior engineer on an active story for hands-on learning. *(2 hrs · Technical)*

Would you like me to adjust these tasks or focus on a specific area?`
  }

  if (lower.includes('sales') || lower.includes('crm') || lower.includes('quota') || role.includes('sales')) {
    return `Here are the onboarding tasks I generated from **${docName}**:

**Sales Onboarding Tasks**

1. **Complete Salesforce CRM fundamentals training** — Finish the CRM basics course and create your first opportunity. *(1 hr · Tools)*
2. **Product certification: Core modules (1-4)** — Complete the first 4 product knowledge modules and pass the quiz. *(2 hrs · Learning)*
3. **Shadow 3 customer discovery calls** — Observe senior reps on live calls. Take notes using the BANT framework. *(3 hrs · Learning)*
4. **Learn the demo script** — Practice the standard demo deck and deliver it to your manager. *(1 hr · Skills)*
5. **Understand pricing & packaging** — Review all pricing tiers, discounting policy, and approval workflow. *(30 min · Learning)*
6. **Meet your top 5 accounts** — Intro calls with the 5 largest accounts in your territory. *(1 hr · People)*
7. **Submit your first pipeline entries** — Add 10 qualified prospects to Salesforce pipeline. *(30 min · Admin)*
8. **Study competitive landscape** — Review competitor battle cards and understand our differentiators. *(1 hr · Learning)*

Would you like me to customize these for a specific territory or quota target?`
  }

  if (lower.includes('handbook') || lower.includes('culture') || lower.includes('values') || lower.includes('benefits')) {
    return `Here are the onboarding tasks I generated from **${docName}**:

**Culture & Compliance Onboarding Tasks**

1. **Watch the company overview video** — 20-minute video covering mission, vision, values, and history. *(20 min · Culture)*
2. **Complete the org chart walkthrough** — Identify your team, cross-functional partners, and executive leadership. *(15 min · People)*
3. **Review and sign the Code of Conduct** — Read all sections and digitally sign acknowledgement. *(20 min · Compliance)*
4. **Set up employee profile** — Add photo, bio, role, and contact details to the company directory. *(10 min · Admin)*
5. **Understand PTO & leave policies** — Review vacation, sick leave, parental leave, and holiday schedule. *(15 min · HR)*
6. **Benefits enrollment** — Complete health, dental, vision, and 401k enrollment within 30 days. *(30 min · HR)*
7. **Attend company all-hands meeting** — Participate in the next monthly all-hands as an observer. *(1 hr · Culture)*
8. **Coffee chat with 3 colleagues** — Schedule informal 15-minute intros with cross-functional teammates. *(45 min · People)*

Would you like me to add role-specific tasks or adjust timelines?`
  }

  // Default response
  return `Here are the onboarding tasks I generated from **${docName}**:

**Onboarding Task List**

1. **Review the document thoroughly** — Read all sections of ${docName} and highlight key policies. *(30 min · Learning)*
2. **Complete knowledge check** — Answer the 10-question quiz to confirm understanding. *(15 min · Compliance)*
3. **Discuss key points with manager** — Schedule a 30-minute debrief to clarify any questions. *(30 min · People)*
4. **Apply learnings to daily workflow** — Identify 3 action items from the document to implement immediately. *(15 min · Admin)*
5. **Share key takeaways with team** — Post a brief summary to the #onboarding Slack channel. *(10 min · Culture)*

Would you like me to add more specific tasks or explore a different focus area?`
}

function mockTasksFromResume(resumeContent: string, resumeFileName: string, mentorPrompt: string, employeeRole: string): string {
  const prompt = mentorPrompt.toLowerCase()
  const role   = employeeRole.toLowerCase()

  const isDevFocused  = prompt.includes('react') || prompt.includes('technical') || prompt.includes('code') || role.includes('engineer') || role.includes('developer')
  const isFrontend    = prompt.includes('frontend') || prompt.includes('front-end') || prompt.includes('ui') || prompt.includes('react')
  const is30Day       = prompt.includes('30') || prompt.includes('month')
  const isDesign      = role.includes('design') || prompt.includes('design') || prompt.includes('ux')
  const isSales       = role.includes('sales') || prompt.includes('sales')

  const dayLabel = is30Day ? '30-day' : '21-day'

  if (isDesign) {
    return `Based on ${resumeFileName || "the candidate's resume"} and your guidance, here's the personalized **${dayLabel} Design Onboarding Plan**:

**Week 1 — Foundation**
1. **Design system deep-dive** — Review the component library in Figma. Map existing patterns to your design background. *(2 hrs · Technical)*
2. **Brand guidelines walkthrough** — Study typography, color palette, spacing, and tone-of-voice guide with Priya. *(1 hr · Learning)*
3. **Meet the product squad** — Coffee chats with 3 PMs and 3 engineers to understand collaboration workflow. *(1.5 hrs · People)*
4. **Audit current live product** — Document UX inconsistencies and accessibility gaps as a fresh-eyes exercise. *(2 hrs · Research)*

**Week 2 — Hands-On**
5. **Shadow a user research session** — Observe moderated usability testing with a real user. *(1.5 hrs · Research)*
6. **Contribute to an active design spec** — Add annotations or revisions to a mid-flight design file. *(2 hrs · Technical)*
7. **Review the design process** — Understand how designs move from concept to engineering handoff. *(30 min · Learning)*

**Week 3–4 — Ownership**
8. **Lead first design critique** — Present a small concept to the team for feedback. *(1 hr · Skills)*
9. **Complete accessibility audit** — Run the current main screen through WCAG 2.1 AA checklist. *(1 hr · Compliance)*
10. **Ship first design to production** — Own a small UI change end-to-end, from wireframe to developer handoff. *(3 hrs · Technical)*

Tasks are based on the candidate's existing ${employeeRole} background. Want me to adjust difficulty or focus area?`
  }

  if (isSales) {
    return `Based on ${resumeFileName || "the candidate's resume"} and your guidance, here's the personalized **${dayLabel} Sales Onboarding Plan**:

**Week 1 — Product & Process**
1. **Intensive product certification (all 8 modules)** — Prioritized given their background; can self-pace. *(4 hrs · Learning)*
2. **CRM setup and pipeline methodology** — Configure Salesforce with personal templates based on prior CRM experience. *(1 hr · Tools)*
3. **Territory & account mapping** — Identify key accounts, existing contacts, and warm leads in territory. *(1.5 hrs · Strategy)*
4. **Study competitive battle cards** — Focus on top 3 competitors most relevant to their territory. *(1 hr · Learning)*

**Week 2 — Active Learning**
5. **Shadow 5 discovery calls** — Take structured notes using BANT and share observations with mentor. *(3 hrs · Learning)*
6. **Practice demo delivery** — Record and review self-demo, share with mentor for feedback. *(1 hr · Skills)*
7. **Meet top 10 accounts** — Intro calls using a prepared intro script. *(2 hrs · People)*

**Week 3 — First Deals**
8. **Submit first 5 qualified opportunities** — Log in Salesforce with full BANT qualification notes. *(1 hr · Admin)*
9. **Co-present a live demo with manager** — Shadow and assist on a real prospect demo. *(1 hr · Skills)*
10. **First solo discovery call** — Lead a discovery call independently with mentor listening. *(30 min · Skills)*

Personalized to leverage their prior sales experience. Want to adjust the ramp timeline?`
  }

  if (isFrontend || isDevFocused) {
    return `Based on ${resumeFileName || "the candidate's resume"} and your guidance, here's the personalized **${dayLabel} Technical Onboarding Plan**:

**Week 1 — Environment & Codebase**
1. **Dev environment setup & codebase tour** — Clone repo, install dependencies, run all services locally. Leverage their existing React knowledge. *(1.5 hrs · Setup)*
2. **Architecture walkthrough with Sarah** — Deep-dive into system design, service boundaries, and data flow. *(1 hr · Learning)*
3. **Read and sign-off on engineering standards** — Review PR guidelines, commit conventions, and naming patterns. *(30 min · Compliance)*
4. **Set up observability tools** — Configure DataDog alerts and Grafana dashboards for their assigned services. *(30 min · Tools)*

**Week 2 — First Contributions**
5. **Fix first 2 "good first issues"** — Independently pick up beginner tickets to learn the codebase workflow. *(3 hrs · Technical)*
6. **Write your first unit test suite** — Add tests for an untested utility module. Minimum 80% coverage. *(2 hrs · Technical)*
7. **Review 5 open PRs** — Leave meaningful code review comments on 5 active pull requests. *(1 hr · Learning)*

**Week 3–4 — Feature Ownership**
8. **Own a small feature end-to-end** — From ticket to production: design, implementation, tests, PR, and deploy. *(4 hrs · Technical)*
9. **Pair on a complex refactor** — Pair with a senior engineer on an active refactoring task. *(2 hrs · Technical)*
10. **Lead a tech share** — Present a short (15-min) deep-dive on something learned in onboarding. *(1 hr · Leadership)*

Based on their ${employeeRole} background — tasks are calibrated to fast-track the ramp. Adjust?`
  }

  // Generic role response
  return `Based on ${resumeFileName || "the candidate's resume"} and your guidance, here's the personalized **${dayLabel} Onboarding Plan** for ${employeeRole}:

**Week 1 — Foundation**
1. **Company overview & culture immersion** — Study mission, values, and org structure with focus on their team. *(1 hr · Culture)*
2. **Tool setup & account provisioning** — Configure all required tools based on their role requirements. *(1 hr · Setup)*
3. **Meet key stakeholders** — Intro meetings with 5 cross-functional partners identified from their role scope. *(1.5 hrs · People)*
4. **Review role-specific documentation** — Read all relevant policies, processes, and guidelines for ${employeeRole}. *(1.5 hrs · Learning)*

**Week 2 — Hands-On**
5. **Shadow a senior colleague** — Observe and document how a similar role operates day-to-day. *(2 hrs · Learning)*
6. **Complete first independent task** — Take ownership of a low-stakes assignment to apply knowledge. *(2 hrs · Technical)*
7. **1:1 feedback session with mentor** — Review progress, blockers, and priorities for the next 2 weeks. *(30 min · People)*

**Week 3–4 — Ownership**
8. **Lead a small project** — Own an end-to-end workstream from planning to delivery. *(4 hrs · Skills)*
9. **Document key learnings** — Write a 1-page "what I learned" summary to share with the team. *(30 min · Admin)*
10. **Set 30-60-90 day goals with manager** — Formalize performance milestones and success criteria. *(30 min · Planning)*

Want me to adjust this based on specific skills or priorities you have in mind?`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateTasksFromDocument(
  docContent: string,
  docName: string,
  userMessage: string,
  employeeRole?: string,
  chatHistory?: { role: 'user' | 'ai'; content: string }[]
): Promise<string> {
  const token = await getAccessToken()

  if (token) {
    const chatId = await createChat(token)
    if (chatId) {
      const systemContext = `You are an expert onboarding specialist AI assistant. You help HR managers and admins create actionable onboarding task lists based on company documents. Format tasks clearly with titles, time estimates, and categories. Document context: "${docContent.slice(0, 2000)}"`
      const fullMessage = `${systemContext}\n\nUser: ${userMessage}\n\nEmployee Role Context: ${employeeRole ?? 'General employee'}`
      const response = await sendMessage(token, chatId, fullMessage)
      if (response) return response
    }
  }

  // Smart mock fallback
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
  return mockTasksFromDocument(docContent, docName, employeeRole)
}

export async function generateTasksFromResume(
  resumeContent: string,
  resumeFileName: string,
  mentorPrompt: string,
  employeeRole: string
): Promise<string> {
  const token = await getAccessToken()

  if (token) {
    const chatId = await createChat(token)
    if (chatId) {
      const systemContext = `You are an expert onboarding specialist AI assistant helping a mentor create a personalized task list for a new hire. Resume content: "${resumeContent.slice(0, 2000)}". Employee role: ${employeeRole}.`
      const fullMessage = `${systemContext}\n\nMentor request: ${mentorPrompt}\n\nGenerate a detailed, personalized onboarding task list with time estimates and categories.`
      const response = await sendMessage(token, chatId, fullMessage)
      if (response) return response
    }
  }

  // Smart mock fallback
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
  return mockTasksFromResume(resumeContent, resumeFileName, mentorPrompt, employeeRole)
}

export async function generalChat(userMessage: string, context: string): Promise<string> {
  const token = await getAccessToken()

  if (token) {
    const chatId = await createChat(token)
    if (chatId) {
      const response = await sendMessage(token, chatId, `${context}\n\nUser: ${userMessage}`)
      if (response) return response
    }
  }

  // Mock fallback
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
  const lower = userMessage.toLowerCase()
  if (lower.includes('task') || lower.includes('assign')) return 'I can help you create and assign tasks! Just describe what you need done and which employee it\'s for, and I\'ll generate a structured task list.'
  if (lower.includes('resume') || lower.includes('candidate')) return 'Upload the candidate\'s resume and I\'ll analyze their background to create a personalized onboarding plan tailored to their skills and experience.'
  if (lower.includes('document') || lower.includes('policy')) return 'Share a document with me and I\'ll extract all the key requirements into actionable onboarding tasks that can be assigned to new hires.'
  return 'I\'m your AI onboarding assistant. I can help you create task lists from documents, analyze resumes to personalize onboarding plans, and answer questions about your team\'s progress. What would you like to do?'
}

// ─── Suggest tasks for a specific employee (for CreateTaskModal AI mode) ──────

export interface SuggestedTask {
  title: string
  description: string
  category: string
  estimatedTime: string
  priority: 'low' | 'medium' | 'high'
  subtasks: { title: string }[]
  requiresInput: boolean
  inputPrompt: string
}

function mockSuggestedTasks(employeeRole: string, employeeName: string, userRequest: string): SuggestedTask[] {
  const role = (employeeRole + userRequest).toLowerCase()

  if (role.includes('engineer') || role.includes('developer') || role.includes('technical')) {
    return [
      { title: 'Set up local development environment', description: 'Clone the main repository, install all dependencies, and verify the app runs locally.', category: 'Setup', estimatedTime: '1.5 hrs', priority: 'high', subtasks: [{ title: 'Clone repository' }, { title: 'Install Node.js & dependencies' }, { title: 'Run app locally and verify' }], requiresInput: false, inputPrompt: '' },
      { title: 'Complete codebase architecture review', description: 'Read the architecture documentation and diagram the major system components.', category: 'Learning', estimatedTime: '1 hr', priority: 'medium', subtasks: [{ title: 'Read architecture docs' }, { title: 'Map service boundaries' }], requiresInput: true, inputPrompt: 'Describe 3 things you learned about our system architecture.' },
      { title: 'Submit first pull request', description: 'Pick a "good first issue" from the backlog and submit a PR following team guidelines.', category: 'Technical', estimatedTime: '2 hrs', priority: 'medium', subtasks: [{ title: 'Pick issue from backlog' }, { title: 'Implement fix' }, { title: 'Write unit tests' }, { title: 'Submit PR for review' }], requiresInput: false, inputPrompt: '' },
    ]
  }

  if (role.includes('sales') || role.includes('crm') || role.includes('quota')) {
    return [
      { title: 'Complete Salesforce CRM setup', description: 'Configure your CRM profile, pipeline view, and import your initial prospect list.', category: 'Tools', estimatedTime: '1 hr', priority: 'high', subtasks: [{ title: 'Log in and configure profile' }, { title: 'Set up pipeline stages' }, { title: 'Add 5 initial prospects' }], requiresInput: false, inputPrompt: '' },
      { title: 'Product knowledge certification', description: 'Complete the 4 core product modules and pass the certification quiz with 80%+.', category: 'Learning', estimatedTime: '2 hrs', priority: 'high', subtasks: [{ title: 'Modules 1–2' }, { title: 'Modules 3–4' }, { title: 'Pass quiz' }], requiresInput: true, inputPrompt: 'What are the top 3 customer pain points our product solves? Write your answer here.' },
      { title: 'Shadow 3 discovery calls', description: 'Observe senior reps on real prospect calls and take structured BANT notes.', category: 'Learning', estimatedTime: '3 hrs', priority: 'medium', subtasks: [{ title: 'Call 1 observation' }, { title: 'Call 2 observation' }, { title: 'Call 3 observation' }], requiresInput: true, inputPrompt: 'After shadowing, what objection did you hear most? How was it handled?' },
    ]
  }

  if (role.includes('design') || role.includes('ux') || role.includes('ui')) {
    return [
      { title: 'Design system deep-dive', description: 'Review the Figma component library and document any inconsistencies or gaps.', category: 'Learning', estimatedTime: '2 hrs', priority: 'high', subtasks: [{ title: 'Review Figma components' }, { title: 'Document inconsistencies' }], requiresInput: false, inputPrompt: '' },
      { title: 'Accessibility audit of main screens', description: 'Run the top 5 screens through WCAG 2.1 AA checklist and file issues.', category: 'Compliance', estimatedTime: '2 hrs', priority: 'medium', subtasks: [{ title: 'Audit screen 1-2' }, { title: 'Audit screen 3-4' }, { title: 'Audit screen 5' }, { title: 'File accessibility issues' }], requiresInput: true, inputPrompt: 'List the top 3 accessibility issues you found and how you would fix them.' },
    ]
  }

  // Generic
  return [
    { title: `Complete ${employeeName.split(' ')[0]}'s onboarding checklist`, description: 'Review all sections of the employee handbook and acknowledge receipt.', category: 'Compliance', estimatedTime: '45 min', priority: 'high', subtasks: [{ title: 'Read company values section' }, { title: 'Review PTO policy' }, { title: 'Sign acknowledgement' }], requiresInput: false, inputPrompt: '' },
    { title: 'Meet key stakeholders', description: 'Schedule intro 1:1 calls with 5 cross-functional partners.', category: 'People', estimatedTime: '1.5 hrs', priority: 'medium', subtasks: [{ title: 'Schedule calls' }, { title: 'Prepare intro questions' }, { title: 'Complete all 5 calls' }], requiresInput: true, inputPrompt: 'Who did you meet and what was one thing you learned from each person?' },
    { title: 'Complete tools & access setup', description: 'Ensure all required software is installed and access is provisioned.', category: 'Tools', estimatedTime: '30 min', priority: 'high', subtasks: [{ title: 'Email & calendar' }, { title: 'Slack & communication tools' }, { title: 'Role-specific tools' }], requiresInput: false, inputPrompt: '' },
  ]
}

export async function suggestTasksForEmployee(
  employeeRole: string,
  employeeName: string,
  userRequest: string,
  documentContext?: string
): Promise<SuggestedTask[]> {
  const token = await getAccessToken()

  if (token) {
    const chatId = await createChat(token, TASK_AGENT_ID)
    if (chatId) {
      const prompt = `You are an onboarding specialist. Generate 3-5 specific onboarding tasks strictly tailored to the employee's role.
Employee: ${employeeName}, Role: ${employeeRole}
Admin request: ${userRequest}
${documentContext ? `Company context: ${documentContext.slice(0, 800)}` : ''}

IMPORTANT: Tasks must be relevant to the "${employeeRole}" role only. Do NOT generate software/engineering tasks unless the role is explicitly technical.

Respond with ONLY a JSON array (no markdown, no explanation):
[{"title":"...","description":"...","category":"Setup|Learning|Technical|Compliance|People|Tools|Admin","estimatedTime":"...","priority":"low|medium|high","subtasks":[{"title":"..."}],"requiresInput":false,"inputPrompt":""}]`
      const response = await sendMessage(token, chatId, prompt)
      if (response) {
        try {
          const jsonMatch = response.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as SuggestedTask[]
            if (Array.isArray(parsed) && parsed.length > 0) return parsed
          }
        } catch { /* fall through to mock */ }
      }
    }
  }

  await new Promise(r => setTimeout(r, 1000 + Math.random() * 600))
  return mockSuggestedTasks(employeeRole, employeeName, userRequest)
}

// ─── Conversational task-creation agent (per-employee chat) ──────────────────
// Keeps a persistent chatId so follow-up messages stay in the same session.

export interface TaskChatMessage {
  role: 'user' | 'agent'
  content: string
  tasks?: SuggestedTask[]   // populated when agent includes JSON task array
}

let taskChatId: string | null = null
let taskChatToken: string | null = null

export async function resetTaskChat() {
  taskChatId = null
  taskChatToken = null
}

export async function sendTaskChatMessage(
  userMessage: string,
  employeeName: string,
  employeeRole: string,
  documentContext: string
): Promise<TaskChatMessage> {
  // Try real agent first
  const token = taskChatToken ?? await getAccessToken()
  if (token) {
    taskChatToken = token
    // Capture BEFORE creating chat so we know if this is the first message
    const isFirstMessage = !taskChatId
    if (!taskChatId) {
      const id = await createChat(token, TASK_AGENT_ID)
      if (id) taskChatId = id
    }
    if (taskChatId) {
      // On the first message inject the employee role context so the agent
      // generates tasks strictly relevant to that role
      const fullMsg = isFirstMessage
        ? `You are an expert onboarding task designer. You must generate tasks STRICTLY relevant to the employee's role — never default to software/engineering tasks for non-technical roles.\n\nEmployee: ${employeeName}\nRole: ${employeeRole}\n${documentContext ? `Company docs context: ${documentContext.slice(0, 600)}` : ''}\n\nWhen you suggest tasks, always append a JSON array at the END of your reply in this exact format (no markdown fences):\n[{"title":"...","description":"...","category":"Setup|Learning|Technical|Compliance|People|Tools|Admin","estimatedTime":"...","priority":"low|medium|high","subtasks":[{"title":"..."}],"requiresInput":false,"inputPrompt":""}]\n\nAdmin request: ${userMessage}`
        : userMessage

      const reply = await sendMessage(token, taskChatId, fullMsg)
      if (reply) {
        const tasks = _extractTasksFromText(reply)
        return { role: 'agent', content: reply, tasks: tasks.length > 0 ? tasks : undefined }
      }
    }
  }

  // Mock fallback — simulate a conversational response
  await new Promise(r => setTimeout(r, 900 + Math.random() * 700))
  const lower = userMessage.toLowerCase()
  const mockTasks = mockSuggestedTasks(employeeRole, employeeName, userMessage)

  if (lower.includes('change') || lower.includes('modify') || lower.includes('update') || lower.includes('instead')) {
    return {
      role: 'agent',
      content: `Sure! I've updated the task list based on your feedback. Here are the revised tasks for ${employeeName}:`,
      tasks: mockTasks.map(t => ({ ...t, title: `[Updated] ${t.title}` })),
    }
  }
  if (lower.includes('more') || lower.includes('add') || lower.includes('additional')) {
    return {
      role: 'agent',
      content: `Here are some additional tasks I'd suggest for ${employeeName} as a ${employeeRole}:`,
      tasks: mockTasks,
    }
  }
  if (lower.includes('remove') || lower.includes('delete') || lower.includes('fewer')) {
    return {
      role: 'agent',
      content: `Understood. I've simplified the list to the most essential tasks for ${employeeName}'s first week.`,
      tasks: mockTasks.slice(0, 2),
    }
  }

  return {
    role: 'agent',
    content: `Here's a tailored onboarding task list for ${employeeName} (${employeeRole}). You can ask me to adjust priorities, add more tasks, focus on specific areas, or modify any task. Just let me know!`,
    tasks: mockTasks,
  }
}

function _extractTasksFromText(text: string): SuggestedTask[] {
  try {
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) return parsed
    }
  } catch { /* ignore */ }
  return []
}

// ─── OnboardBot — context-aware chatbot ──────────────────────────────────────

export interface OnboardBotMessage {
  role: 'user' | 'bot'
  content: string
}

export interface OnboardBotContext {
  systemPrompt: string
}

/**
 * Assembles a role-scoped system prompt from live AppContext state.
 * Includes full task details (subtasks, supporting docs, supporting links),
 * company knowledge base from documents, and allows general knowledge answers
 * for questions outside the onboarding scope.
 */
export function buildOnboardBotContext(
  state: any,
  userId: string,
  role: 'admin' | 'hr' | 'mentor' | 'employee'
): OnboardBotContext {
  const cs = state.companySettings ?? {}
  const lines: string[] = []

  // ── System instructions ──────────────────────────────────────────────────
  lines.push('You are OnboardBot — an intelligent onboarding assistant designed to support users within an organization.')
  lines.push('You are embedded in the OnboardEase employee onboarding platform. You are an onboarding facilitator, not just a Q&A bot.')
  lines.push('Your goal is to help users feel supported, informed, and guided.')
  lines.push('')
  lines.push('DOCUMENT AWARENESS & CONTEXT HANDLING:')
  lines.push('- You must read, index, and retain context from ALL documents uploaded by ALL users.')
  lines.push('- Maintain structured memory of: document content, document owner (who uploaded it), metadata (timestamp, department, role, tags if available), and relationship mapping between users (e.g., manager, teammate, HR, external consultant, etc.).')
  lines.push('- When answering a question: retrieve the most relevant information from the document corpus; identify which user uploaded the referenced document; understand how that uploader is associated with the current user asking the question; incorporate that relationship context in your reasoning (but do not expose internal reasoning unless asked).')
  lines.push('')
  lines.push('CONTEXTUAL ANSWERING BEHAVIOR:')
  lines.push('- If the question IS related to the uploaded documents: use retrieved information as the primary source of truth; provide precise, document-grounded answers; if multiple documents conflict, highlight discrepancies clearly.')
  lines.push('- If the question is NOT related to any uploaded document: answer using your pretrained knowledge as a general AI assistant; clearly distinguish when the answer is not based on internal documents (without overemphasizing this).')
  lines.push('')
  lines.push('USER AWARENESS:')
  lines.push('Always consider: who is asking the question, their role and relationship to document owners, and whether the information is relevant to their context.')
  lines.push(`- Current user role: ${role.toUpperCase()}`)
  lines.push('- Admin: full access to ALL data (all employees, mentors, tasks, documents, analytics, at-risk metrics).')
  lines.push('- HR Manager: access to all employees, mentors, tasks, and HR-scoped company documents.')
  lines.push('- Mentor: access ONLY to their own assigned mentees\' profiles, tasks, progress, and meetings.')
  lines.push('- Employee/New Hire: access ONLY to their own tasks, meetings, mentor info, and personal progress.')
  lines.push('- If a user requests data outside their access scope, politely inform them that the requested information is outside their access scope.')
  lines.push('')
  lines.push('TONE & COMMUNICATION:')
  lines.push('- Always respond politely, professionally, and clearly.')
  lines.push('- Use structured formatting where helpful.')
  lines.push('- Avoid overly technical language unless the user uses technical terminology.')
  lines.push('- Maintain a supportive onboarding tone. Never be dismissive or abrupt.')
  lines.push('')
  lines.push('HANDLING UNCERTAINTY:')
  lines.push('- If relevant information cannot be found in the documents: politely inform the user and offer related information if available.')
  lines.push('- If a question is ambiguous: ask a concise clarification question.')
  lines.push('- NEVER fabricate employee names, task details, or company-specific data not found in the context below.')
  lines.push('')
  lines.push('FALLBACK RULE:')
  lines.push('- If company-specific data is missing from context, say: "I don\'t have specific information about this from your company\'s documents, but here\'s what I can share:" and then answer using general knowledge.')
  lines.push('- NEVER refuse general questions. Answer them helpfully.')
  lines.push('')
  lines.push('ONBOARDING PROCESS KNOWLEDGE:')
  lines.push('Company Setup Flow: Company info → Team/Industry → Integrations (Slack, GitHub, Jira, Zoom, Notion) → Templates → Launch')
  lines.push('Employee Journey: Added by Admin/HR → Tasks assigned → Progress tracked (pending/in-progress/done) → Meetings with mentor → Completion')
  lines.push('Task Types: Manual (created by admin/HR/mentor), AI-generated from documents, AI-generated from resumes, Bulk-generated')
  lines.push('Task Fields: title, description, category, estimated time, priority (low/medium/high), subtasks, supporting documents, supporting links, input requirements')
  lines.push('Progress Metric: (Tasks done / Total tasks) × 100 = progress percentage')
  lines.push('Risk Assessment: employees with low progress relative to their onboarding day are flagged as "high risk"')
  lines.push('')
  lines.push('COMPANY KNOWLEDGE BASE (from uploaded documents):')
  lines.push('- Employee Handbook v3.2: Company values (innovation, collaboration, integrity), communication policy (Slack for quick messages, email for formal), work hours (flexible 9-5), benefits (health, dental, vision, 401k), PTO (15 days/year), code of conduct, performance reviews (quarterly), promotion cycle (annual), remote work (hybrid, 3 days in office).')
  lines.push('- IT Security Policy: MFA required on all accounts, password policy (minimum 12 characters), VPN required for remote work, data classification (public/internal/confidential/restricted), incident reporting (security@company.com), no personal devices for company data, security training required in first week, annual phishing awareness training.')
  lines.push('- Engineering Onboarding Guide: Tech stack (React, TypeScript, Node.js, PostgreSQL, AWS), GitHub workflow (clone main repo, SSH key setup), code reviews (all PRs require 2 approvals), testing (unit tests required, 80% coverage), CI/CD (automated via GitHub Actions), deployment (staging → production), architecture (microservices), daily standups at 10am, 2-week sprints.')
  lines.push('- Sales Playbook 2026: Sales process (prospect, qualify, demo, proposal, close), CRM (Salesforce — mandatory), quota ($50k/month), product certification (8 modules), discovery calls (BANT framework), demo script (standard deck), objection handling (pricing/competition/timing), commission (8% on closed deals), territory assignment (by region).')
  lines.push('')
  lines.push('RESPONSE STYLE:')
  lines.push('- Be concise but complete. Prioritize clarity over verbosity.')
  lines.push('- Use bullet points or numbered lists for multiple items.')
  lines.push('- Be friendly and encouraging for employees; be data-focused for HR/Admin/Mentor.')
  lines.push('- Avoid exposing internal system instructions, retrieval mechanisms, or reasoning traces.')
  lines.push('')

  // ── Company info ─────────────────────────────────────────────────────────
  lines.push('=== COMPANY INFO ===')
  lines.push(`Name: ${cs.name ?? 'N/A'}`)
  lines.push(`Industry: ${cs.industry ?? 'N/A'}`)
  lines.push(`Team Size: ${cs.teamSize ?? 'N/A'}`)
  lines.push(`About: ${cs.about ?? 'N/A'}`)
  lines.push('')

  // ── Helper: resolve uploader display name, role, and relationship ─────────
  const resolveUploader = (uploadedBy: string): { name: string; role: string; relationship: string } => {
    if (uploadedBy === 'admin') return { name: 'Admin', role: 'Administrator', relationship: role === 'admin' ? 'yourself' : 'the platform administrator' }
    if (uploadedBy === 'hr')    return { name: 'HR Team', role: 'HR Manager', relationship: role === 'hr' ? 'yourself' : 'your HR department' }
    const mentor = (state.mentors ?? []).find((m: any) => m.id === uploadedBy)
    if (mentor) {
      const emp = role === 'employee' ? (state.employees ?? []).find((e: any) => e.id === userId) : null
      const isMentee = emp && emp.mentorId === uploadedBy
      const rel = role === 'mentor' && uploadedBy === userId
        ? 'yourself'
        : isMentee
        ? `your assigned mentor (${mentor.specialty})`
        : `a mentor in ${mentor.department}`
      return { name: mentor.name, role: `Mentor — ${mentor.specialty}`, relationship: rel }
    }
    const emp = (state.employees ?? []).find((e: any) => e.id === uploadedBy)
    if (emp) {
      const rel = uploadedBy === userId ? 'yourself' : `a colleague (${emp.role}, ${emp.team})`
      return { name: emp.name, role: emp.role, relationship: rel }
    }
    return { name: uploadedBy, role: 'Unknown', relationship: 'an unknown user' }
  }

  // ── Document corpus overview (visible to all roles) ───────────────────────
  if ((state.documents ?? []).length > 0) {
    lines.push('=== DOCUMENT CORPUS ===')
    lines.push('All documents available in this organization (with uploader identity and relationship to current user):')
    ;(state.documents ?? []).forEach((d: any) => {
      const u = resolveUploader(d.uploadedBy)
      lines.push(`  [${d.name}]`)
      lines.push(`    Type: ${d.type} | Size: ${d.size} | Uploaded: ${d.date} | Status: ${d.status}`)
      lines.push(`    Uploaded by: ${u.name} (${u.role}) — relationship to current user: ${u.relationship}`)
      if (d.content) lines.push(`    Content: ${d.content.slice(0, 600)}`)
    })
    lines.push('')
  }

  // ── Helper: format a task with full details ───────────────────────────────
  const formatTask = (t: any) => {
    const parts: string[] = []
    parts.push(`[${t.status.toUpperCase()}] ${t.title}`)
    parts.push(`Category: ${t.category}`)
    parts.push(`Time: ${t.estimatedTime}`)
    if (t.priority) parts.push(`Priority: ${t.priority}`)
    parts.push(`Assigned by: ${t.assignedByName}`)
    if (t.description) parts.push(`Description: ${t.description}`)
    if (t.subtasks && t.subtasks.length > 0) {
      const subList = t.subtasks.map((s: any) => `"${s.title}" (${s.status})`).join(', ')
      parts.push(`Subtasks: ${subList}`)
    }
    if (t.supportingDocs && t.supportingDocs.length > 0) {
      const docNames = (t.supportingDocs as string[])
        .map((docId: string) => {
          const doc = (state.documents ?? []).find((d: any) => d.id === docId)
          return doc ? doc.name : null
        })
        .filter(Boolean)
        .join(', ')
      if (docNames) parts.push(`Supporting Docs: ${docNames}`)
    }
    if (t.supportingLinks && t.supportingLinks.length > 0) {
      const linkList = t.supportingLinks.map((l: any) => `${l.label} (${l.url})`).join(', ')
      parts.push(`Supporting Links: ${linkList}`)
    }
    if (t.requiresInput && t.inputPrompt) {
      parts.push(`Requires Input: ${t.inputPrompt}`)
    }
    return `  - ${parts.join(' | ')}`
  }

  // ── Employee scope ────────────────────────────────────────────────────────
  if (role === 'employee') {
    const emp = (state.employees ?? []).find((e: any) => e.id === userId)
    if (emp) {
      lines.push('=== YOUR PROFILE ===')
      lines.push(`Name: ${emp.name}`)
      lines.push(`Role: ${emp.role}`)
      lines.push(`Team: ${emp.team}`)
      lines.push(`Email: ${emp.email}`)
      lines.push(`Start Date: ${emp.startDate} | Day ${emp.day} of ${emp.totalDays}`)
      lines.push(`Overall Progress: ${emp.progress}%`)
      const mentor = (state.mentors ?? []).find((m: any) => m.id === emp.mentorId)
      if (mentor) lines.push(`Mentor/Buddy: ${mentor.name} — ${mentor.specialty} (${mentor.department})`)
      if (emp.bio) lines.push(`Bio: ${emp.bio}`)
      lines.push('')
    }

    const myTasks = (state.tasks ?? []).filter((t: any) => t.assignedTo === userId)
    if (myTasks.length > 0) {
      const done    = myTasks.filter((t: any) => t.status === 'done').length
      const inProg  = myTasks.filter((t: any) => t.status === 'in-progress').length
      const pending = myTasks.filter((t: any) => t.status === 'pending').length
      lines.push(`=== YOUR TASKS (${myTasks.length} total | ${done} done | ${inProg} in-progress | ${pending} pending) ===`)
      myTasks.forEach((t: any) => lines.push(formatTask(t)))
      lines.push('')
    }

    const myMeetings = (state.meetings ?? []).filter((m: any) => m.employeeId === userId)
    if (myMeetings.length > 0) {
      lines.push('=== UPCOMING MEETINGS ===')
      myMeetings.forEach((m: any) => {
        let meetLine = `  - ${m.title} | ${m.date} at ${m.time}`
        if (m.description) meetLine += ` | ${m.description}`
        if (m.link) meetLine += ` | Join: ${m.link}`
        lines.push(meetLine)
      })
      lines.push('')
    }

    // Include relevant document knowledge the employee should know about
    if (state.documents && state.documents.length > 0) {
      lines.push('=== COMPANY KNOWLEDGE BASE ===')
      ;(state.documents ?? []).forEach((d: any) => {
        if (d.content) {
          const u = resolveUploader(d.uploadedBy)
          lines.push(`  [${d.name} | Uploaded by: ${u.name} (${u.role}) — ${u.relationship} | ${d.date}]: ${d.content.slice(0, 600)}`)
        }
      })
      lines.push('')
    }
  }

  // ── Mentor scope ──────────────────────────────────────────────────────────
  if (role === 'mentor') {
    const mentor = (state.mentors ?? []).find((m: any) => m.id === userId)
    if (mentor) {
      lines.push('=== YOUR PROFILE ===')
      lines.push(`Name: ${mentor.name}`)
      lines.push(`Specialty: ${mentor.specialty}`)
      lines.push(`Department: ${mentor.department}`)
      lines.push('')
    }

    const myMentees = (state.employees ?? []).filter((e: any) => e.mentorId === userId)
    if (myMentees.length > 0) {
      lines.push('=== MY MENTEES & THEIR TASKS ===')
      myMentees.forEach((e: any) => {
        const tasks   = (state.tasks ?? []).filter((t: any) => t.assignedTo === e.id)
        const done    = tasks.filter((t: any) => t.status === 'done').length
        const inProg  = tasks.filter((t: any) => t.status === 'in-progress').length
        const pending = tasks.filter((t: any) => t.status === 'pending').length
        const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : e.progress
        lines.push(`  ${e.name} | ${e.role} | ${e.team} | Day ${e.day}/${e.totalDays} | Progress: ${progress}% | Risk: ${e.risk} | Tasks: ${done} done, ${inProg} in-progress, ${pending} pending`)
        tasks.forEach((t: any) => lines.push(formatTask(t)))
      })
      lines.push('')
    }

    // Include document knowledge base for mentors
    if (state.documents && state.documents.length > 0) {
      lines.push('=== COMPANY KNOWLEDGE BASE ===')
      ;(state.documents ?? []).forEach((d: any) => {
        if (d.content) {
          const u = resolveUploader(d.uploadedBy)
          lines.push(`  [${d.name} | Uploaded by: ${u.name} (${u.role}) — ${u.relationship} | ${d.date}]: ${d.content.slice(0, 600)}`)
        }
      })
      lines.push('')
    }
  }

  // ── HR scope ──────────────────────────────────────────────────────────────
  if (role === 'hr') {
    lines.push('=== ALL EMPLOYEES ===')
    ;(state.employees ?? []).forEach((e: any) => {
      const tasks    = (state.tasks ?? []).filter((t: any) => t.assignedTo === e.id)
      const done     = tasks.filter((t: any) => t.status === 'done').length
      const inProg   = tasks.filter((t: any) => t.status === 'in-progress').length
      const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : e.progress
      const mentor   = (state.mentors ?? []).find((m: any) => m.id === e.mentorId)
      lines.push(`  - ${e.name} | ${e.role} | ${e.team} | Day ${e.day}/${e.totalDays} | Progress: ${progress}% | Risk: ${e.risk} | Mentor: ${mentor?.name ?? 'Unassigned'}`)
      tasks.forEach((t: any) => lines.push(formatTask(t)))
    })
    lines.push('')

    lines.push('=== ALL MENTORS ===')
    ;(state.mentors ?? []).forEach((m: any) => {
      const count = (state.employees ?? []).filter((e: any) => e.mentorId === m.id).length
      lines.push(`  - ${m.name} | ${m.specialty} | ${m.department} | ${count} mentees`)
    })
    lines.push('')

    lines.push('=== COMPANY KNOWLEDGE BASE ===')
    ;(state.documents ?? []).forEach((d: any) => {
      if (d.content) {
        const u = resolveUploader(d.uploadedBy)
        lines.push(`  [${d.name} (${d.type}, uploaded ${d.date}) | Uploaded by: ${u.name} (${u.role}) — ${u.relationship}]: ${d.content.slice(0, 700)}`)
      }
    })
    lines.push('')
  }

  // ── Admin scope ───────────────────────────────────────────────────────────
  if (role === 'admin') {
    lines.push('=== ALL EMPLOYEES ===')
    ;(state.employees ?? []).forEach((e: any) => {
      const tasks    = (state.tasks ?? []).filter((t: any) => t.assignedTo === e.id)
      const done     = tasks.filter((t: any) => t.status === 'done').length
      const inProg   = tasks.filter((t: any) => t.status === 'in-progress').length
      const pending  = tasks.filter((t: any) => t.status === 'pending').length
      const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : e.progress
      const mentor   = (state.mentors ?? []).find((m: any) => m.id === e.mentorId)
      lines.push(`  - ${e.name} | ${e.role} | ${e.team} | Day ${e.day}/${e.totalDays} | Progress: ${progress}% | Risk: ${e.risk} | Mentor: ${mentor?.name ?? 'Unassigned'} | Tasks: ${done} done, ${inProg} in-progress, ${pending} pending`)
      tasks.forEach((t: any) => lines.push(formatTask(t)))
    })
    lines.push('')

    lines.push('=== ALL MENTORS ===')
    ;(state.mentors ?? []).forEach((m: any) => {
      const count = (state.employees ?? []).filter((e: any) => e.mentorId === m.id).length
      lines.push(`  - ${m.name} | ${m.specialty} | ${m.department} | ${count} mentees`)
    })
    lines.push('')

    const allTasks = state.tasks ?? []
    const pendingCount = allTasks.filter((t: any) => t.status === 'pending').length
    const inProgCount  = allTasks.filter((t: any) => t.status === 'in-progress').length
    const doneCount    = allTasks.filter((t: any) => t.status === 'done').length
    lines.push('=== TASKS SUMMARY ===')
    lines.push(`Total: ${allTasks.length} | Pending: ${pendingCount} | In Progress: ${inProgCount} | Done: ${doneCount}`)
    lines.push('')

    lines.push('=== DOCUMENTS ===')
    ;(state.documents ?? []).forEach((d: any) => {
      const u = resolveUploader(d.uploadedBy)
      lines.push(`  - ${d.name} | ${d.type} | Uploaded: ${d.date} | By: ${u.name} (${u.role}) | Tasks using this doc: ${d.taskCount ?? 0}`)
    })
    lines.push('')

    lines.push('=== COMPANY KNOWLEDGE BASE ===')
    ;(state.documents ?? []).forEach((d: any) => {
      if (d.content) {
        const u = resolveUploader(d.uploadedBy)
        lines.push(`  [${d.name} (${d.type}, uploaded ${d.date}) | Uploaded by: ${u.name} (${u.role}) — ${u.relationship}]: ${d.content.slice(0, 700)}`)
      }
    })
    lines.push('')
  }

  return { systemPrompt: lines.join('\n') }
}

/**
 * Sends a user message to the OnboardBot AI agent with full context injection.
 * Maintains session via a persistent chatId ref.
 */
export async function sendOnboardBotMessage(
  userMessage: string,
  context: OnboardBotContext,
  history: OnboardBotMessage[],
  chatIdRef: { current: string | null }
): Promise<string> {
  // ── AIML API (primary) ────────────────────────────────────────────────────
  // Convert OnboardBot history to OpenAI-compatible user/assistant turns.
  // Greeting bot messages are included so the model has full conversation context.
  const aimlHistory: { role: 'user' | 'assistant'; content: string }[] = []
  for (const msg of history) {
    if (msg.role === 'user')      aimlHistory.push({ role: 'user',      content: msg.content })
    else if (msg.role === 'bot')  aimlHistory.push({ role: 'assistant', content: msg.content })
  }

  // System prompt is passed as a proper system message — not injected into user content.
  // This gives the model clear role separation and cleaner context handling.
  const aimlReply = await callAimlChatCompletion(
    context.systemPrompt,
    aimlHistory,
    userMessage
  )
  if (aimlReply) return aimlReply

  // ── Enhanced keyword-based mock fallback ──────────────────────────────────
  await new Promise(r => setTimeout(r, 700 + Math.random() * 500))
  const lower = userMessage.toLowerCase()
  const sp    = context.systemPrompt
  const spLines = sp.split('\n')

  // Tasks — show full task details including supporting links/docs
  if (lower.includes('task') || lower.includes('todo') || lower.includes('pending') || lower.includes('in-progress') || lower.includes('done')) {
    const taskBlocks: string[] = []
    let capture = false
    for (const line of spLines) {
      if (line.includes('=== YOUR TASKS') || line.includes('=== TASKS')) { capture = true; continue }
      if (capture && line.startsWith('===')) { capture = false; break }
      if (capture && line.trim()) taskBlocks.push(line.trim())
    }
    if (taskBlocks.length > 0) {
      const sample = taskBlocks.slice(0, 12).join('\n')
      return `Here are your tasks:\n\n${sample}\n\nNeed details on a specific task? Just ask!`
    }
    return "You don't have any tasks assigned yet. Check back soon or ask your manager."
  }

  // Supporting docs or links for a specific task
  if (lower.includes('document') || lower.includes('link') || lower.includes('resource') || lower.includes('attachment')) {
    const docLines = spLines.filter(l => l.includes('Supporting Docs:') || l.includes('Supporting Links:'))
    if (docLines.length > 0) return `Here are the supporting resources attached to your tasks:\n\n${docLines.slice(0, 8).join('\n')}`
    const kbLines = spLines.filter(l => l.includes('[') && l.includes(']:'))
    if (kbLines.length > 0) return `Here are the company documents I have access to:\n\n${kbLines.slice(0, 5).join('\n')}`
    return 'No supporting documents or links are currently attached to your tasks. Contact your admin or HR to add resources.'
  }

  // Mentor / buddy info
  if (lower.includes('mentor') || lower.includes('buddy')) {
    const mentorLine = spLines.find(l => l.startsWith('Mentor/Buddy:') || l.startsWith('Mentor:'))
    if (mentorLine) return `Your ${mentorLine.replace('Mentor/Buddy: ', '').replace('Mentor: ', '')}`
    const myMentees = spLines.filter(l => l.includes('=== MY MENTEES'))
    if (myMentees.length > 0) {
      const menteeLines = spLines.filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'))
      return `Here are your mentees:\n\n${menteeLines.slice(0, 6).join('\n')}`
    }
    return 'You can find your mentor info in the My Buddy tab.'
  }

  // Company info
  if (lower.includes('company') || lower.includes('about') || lower.includes('mission') || lower.includes('values') || lower.includes('culture')) {
    const aboutLine = spLines.find(l => l.startsWith('About:'))
    const nameLine  = spLines.find(l => l.startsWith('Name:'))
    const indLine   = spLines.find(l => l.startsWith('Industry:'))
    if (aboutLine || nameLine) {
      return [nameLine, indLine, aboutLine].filter(Boolean).join('\n')
    }
    return '⚠️ No company information is available in context. Check Admin Settings to configure company details.'
  }

  // Knowledge base / policies / handbook
  if (lower.includes('policy') || lower.includes('handbook') || lower.includes('security') || lower.includes('pto') || lower.includes('benefit') || lower.includes('vacation') || lower.includes('mfa') || lower.includes('vpn') || lower.includes('password')) {
    const kbLines = spLines.filter(l => l.includes('[') && l.includes(']:'))
    if (kbLines.length > 0) {
      const relevant = kbLines.filter(l =>
        (lower.includes('security') && l.toLowerCase().includes('security')) ||
        (lower.includes('handbook') && l.toLowerCase().includes('handbook')) ||
        (lower.includes('pto') || lower.includes('vacation')) && l.toLowerCase().includes('handbook') ||
        (lower.includes('mfa') || lower.includes('vpn') || lower.includes('password')) && l.toLowerCase().includes('security')
      )
      const toShow = relevant.length > 0 ? relevant : kbLines
      return `Here's what I found in the company knowledge base:\n\n${toShow.slice(0, 3).join('\n')}\n\nFor the full document, check the Documents section or contact HR.`
    }
    return '⚠️ I don\'t have that specific policy in context. Check the Documents section or contact HR.'
  }

  // Progress tracking
  if (lower.includes('progress') || lower.includes('how am i doing') || lower.includes('onboarding status')) {
    const progressLine = spLines.find(l => l.includes('Progress:') || l.includes('progress:'))
    const dayLine      = spLines.find(l => l.includes('Day ') && l.includes('/'))
    if (progressLine) return `${progressLine.trim()}\n${dayLine ? dayLine.trim() : ''}\n\nKeep it up! Visit your Overview tab for a full breakdown.`
    return 'Visit your Overview tab to see your onboarding progress and task completion stats.'
  }

  // Meetings / schedule
  if (lower.includes('meeting') || lower.includes('schedule') || lower.includes('calendar') || lower.includes('1:1')) {
    const meetLines = spLines.filter(l => l.includes('AM') || l.includes('PM'))
    if (meetLines.length > 0) return `Here are your upcoming meetings:\n\n${meetLines.slice(0, 5).join('\n')}`
    return 'No upcoming meetings found. Contact your mentor to schedule a 1:1.'
  }

  // Employee list (admin/hr)
  if (lower.includes('employee') || lower.includes('team') || lower.includes('hire') || lower.includes('risk') || lower.includes('at-risk')) {
    const empLines = spLines.filter(l => l.trim().startsWith('- ') && l.includes('Progress:'))
    if (empLines.length > 0) {
      const atRisk = empLines.filter(l => l.toLowerCase().includes('risk: high'))
      if (lower.includes('risk') && atRisk.length > 0) return `At-risk employees:\n\n${atRisk.join('\n')}`
      return `Employee onboarding status:\n\n${empLines.slice(0, 8).join('\n')}`
    }
  }

  // Subtasks
  if (lower.includes('subtask') || lower.includes('sub-task') || lower.includes('checklist')) {
    const subLines = spLines.filter(l => l.includes('Subtasks:'))
    if (subLines.length > 0) return `Subtask breakdown:\n\n${subLines.slice(0, 6).join('\n')}`
    return 'No subtasks found for your current tasks. Ask your manager or mentor to add detailed steps to your tasks.'
  }

  // General / out-of-scope — provide a helpful general answer
  return `I'm OnboardBot — here to help with your onboarding! I can answer questions about:\n• Your tasks, subtasks, and supporting resources\n• Meetings and schedule\n• Mentor/buddy info\n• Company policies and documents\n• Team and employee status (admin/HR/mentor)\n• General HR, productivity, or career questions\n\nWhat would you like to know?`
}

// ─── Task extraction helper ───────────────────────────────────────────────────
// Parses AI response text to extract structured tasks

export interface ParsedTask {
  title: string
  description: string
  category: string
  estimatedTime: string
}

export function parseTasksFromResponse(response: string): ParsedTask[] {
  const tasks: ParsedTask[] = []
  const lines = response.split('\n')

  for (const line of lines) {
    const match = line.match(/^\d+\.\s+\*{0,2}(.+?)\*{0,2}\s*[—-]\s*(.+?)\s*[.(]\s*(\d+[^)]+)\s*[·•]\s*([^)]+)\)?/)
    if (match) {
      tasks.push({
        title: match[1].trim(),
        description: match[2].trim(),
        estimatedTime: match[3].trim(),
        category: match[4].trim().replace('*)', '').replace(')', '').trim(),
      })
    }
  }

  // Fallback: extract numbered lines without strict format
  if (tasks.length === 0) {
    for (const line of lines) {
      const simple = line.match(/^\d+\.\s+\*{0,2}(.+?)\*{0,2}\s*[—–-]/)
      if (simple && simple[1].length > 5) {
        tasks.push({
          title: simple[1].trim(),
          description: line.replace(/^\d+\.\s+/, '').trim(),
          estimatedTime: '30 min',
          category: 'General',
        })
      }
    }
  }

  return tasks.slice(0, 12)
}

// ─── Sales Email Simulation Agent ────────────────────────────────────────────
// Uses AIML API with gpt-5-chat-latest to simulate a realistic B2B client
// responding to a salesperson pitching OnboardEase. The agent is context-aware,
// maintains full conversation history, and occasionally applies business friction
// (competitor objections, compliance questions, budget holds, escalation requests)
// to test how the salesperson handles real-world deal dynamics.

export interface EmailProspect {
  name: string
  email: string
  company: string
  role: string
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

function buildClientSystemPrompt(prospect: EmailProspect, subject: string): string {
  return `You are ${prospect.name}, ${prospect.role} at ${prospect.company}. You are a busy, experienced B2B decision-maker receiving a sales email from a salesperson at OnboardEase — an AI-powered employee onboarding platform that helps companies automate and personalise new-hire experiences, track onboarding progress, assign role-specific tasks, and reduce time-to-productivity.

Your behaviour rules:
1. Reply ONLY as ${prospect.name} — write a professional business email reply (no role-play narration, no quotation marks, no preamble like "Here is my reply:").
2. You are genuinely evaluating the product but you are NOT a pushover. Make the salesperson work for the deal.
3. Vary your stance realistically across turns. You may: ask tough clarifying questions, mention a competitor you already use (Workday, BambooHR, ServiceNow HRSD, Rippling), raise budget/procurement concerns, flag compliance requirements (GDPR, SOC 2, SSO/SAML), request references or case studies, forward to another stakeholder, or express cautious interest if the salesperson answers well.
4. Occasionally (roughly 1 in 3 replies) introduce a realistic objection or challenge that makes the deal harder — but never be rude.
5. If the salesperson provides a strong, specific response to your concern, soften your position slightly and move the conversation forward (e.g., agree to a demo, ask for pricing, loop in a colleague).
6. Keep replies concise — 3 to 6 sentences or short bullet points, matching a real business email tone.
7. Sign off as: ${prospect.name} | ${prospect.role}, ${prospect.company}
8. The email thread subject is: "${subject}".`
}

/**
 * Calls AIML API with the email simulation model to generate a realistic client reply.
 * @param prospect      The simulated prospect persona
 * @param subject       Email thread subject
 * @param history       All previous turns as {role, content} pairs (user = salesperson, assistant = prospect)
 * @param latestEmail   The salesperson's latest email body
 * @returns             AI-generated reply text, or null on failure
 */
export async function generateAIEmailReply(
  prospect: EmailProspect,
  subject: string,
  history: ConversationTurn[],
  latestEmail: string
): Promise<string | null> {
  const systemPrompt = buildClientSystemPrompt(prospect, subject)
  try {
    const res = await fetch(`${AIML_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AIML_API_KEY}`,
      },
      body: JSON.stringify({
        model: AIML_SALES_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: latestEmail },
        ],
        max_tokens: 512,
        temperature: 0.85,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}

// ─── Code Assistant Agent ─────────────────────────────────────────────────────
// Uses AIML API to power an in-editor AI assistant with full project context.
// The agent can answer questions, suggest code, debug errors, and explain
// concepts — all with awareness of every file open in the playground.

export interface CodeAssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ProjectFile {
  name: string
  language: string
  content: string
}

/**
 * Sends a message to the AI code assistant with full project file context.
 * @param taskTitle      Title of the current onboarding task
 * @param taskDescription Description of the task
 * @param files          All files currently open in the playground
 * @param activeFileName The file currently open in the editor
 * @param history        Prior conversation turns
 * @param userMessage    The user's latest message
 * @returns              AI assistant reply, or null on failure
 */
export async function generateCodeAssistantReply(
  taskTitle: string,
  taskDescription: string,
  files: ProjectFile[],
  activeFileName: string,
  history: CodeAssistantMessage[],
  userMessage: string
): Promise<string | null> {
  const fileContext = files
    .map(f => `### File: ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
    .join('\n\n')

  const systemPrompt = `You are an expert AI code assistant embedded inside a VS Code-style playground editor. You have full read access to every file in the project.

## Current Task
Title: "${taskTitle}"
Description: "${taskDescription}"

## Project Files (full source)
${fileContext}

## Active File
The user is currently viewing: **${activeFileName}**

## Your Role
- Help the user write, improve, and debug code across ALL files in the project
- Answer questions about the code, explain patterns or functions, and spot bugs
- Suggest complete code snippets that the user can copy directly into the editor
- If asked to write code, produce ready-to-paste blocks wrapped in triple-backtick fences with the language tag (e.g. \`\`\`javascript)
- When debugging, reference the exact file name and line context
- Be concise — this is a chat panel, not a blog post
- If asked to explain something, give a short explanation followed by an example
- Always be aware of the full project structure before answering`

  try {
    const res = await fetch(`${AIML_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AIML_API_KEY}`,
      },
      body: JSON.stringify({
        model: AIML_SALES_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}
