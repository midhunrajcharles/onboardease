import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Employee {
  id: string
  name: string
  role: string
  email: string
  team: string
  mentorId: string | null
  startDate: string
  progress: number
  day: number
  totalDays: number
  status: 'onboarding' | 'completed'
  risk: 'low' | 'high'
  initials: string
  color: string
  resumeFileName?: string
  resumeContent?: string   // simulated extracted text
  bio?: string             // short bio for new hire
}

export interface SubTask {
  id: string
  title: string
  status: 'pending' | 'done'
}

export interface SupportingLink {
  label: string
  url: string
}

export type FeedbackVisibility = 'admin' | 'hr' | 'mentor' | 'employee'

export interface TaskFeedback {
  id: string
  text: string
  addedBy: string                   // display name
  addedByRole: FeedbackVisibility
  createdAt: string
  visibility: FeedbackVisibility[]  // who can see this feedback
}

// ─── Playground persisted state (saved per task per user) ─────────────────────
export interface PlaygroundCodeFile {
  id: string; name: string; language: string; content: string
}
export interface PlaygroundMailAttachment {
  name: string; size: string; ext: string
}
export interface PlaygroundMailMessage {
  id: string; from: string; fromEmail: string; to: string; toEmail: string
  subject: string; body: string; timestamp: string
  attachments: PlaygroundMailAttachment[]; direction: 'sent' | 'received'
}
export interface PlaygroundMailProspect {
  name: string; email: string; company: string; role: string; initials: string; color: string
}
export interface PlaygroundMailThread {
  id: string; subject: string; prospect: PlaygroundMailProspect
  messages: PlaygroundMailMessage[]; lastAt: string; unread: boolean
}
export interface PlaygroundState {
  codeFiles?: PlaygroundCodeFile[]
  codeActiveId?: string
  mailThreads?: PlaygroundMailThread[]
  mailView?: 'inbox' | 'sent'
  lastSaved?: string
}

export interface Task {
  id: string
  title: string
  description: string
  category: string
  estimatedTime: string
  priority?: 'low' | 'medium' | 'high'
  assignedTo: string          // employee id
  assignedBy: 'admin' | 'hr' | 'mentor'
  assignedByName: string
  status: 'pending' | 'in-progress' | 'done'
  createdAt: string
  order?: number              // display order within employee task list
  subtasks?: SubTask[]
  supportingDocs?: string[]        // document ids
  supportingLinks?: SupportingLink[]
  requiresInput?: boolean
  inputPrompt?: string
  inputValue?: string
  feedback?: TaskFeedback[]   // feedback on completed tasks
  playgroundEnabled?: boolean  // mentor sandbox mode — new hire can try without affecting real progress
  playgroundType?: 'engineering' | 'marketing' | 'leadership' | 'sales' | 'hr-operations' | 'product-strategy'
  playgroundState?: PlaygroundState  // persisted playground content per user
}

export interface Document {
  id: string
  name: string
  type: string
  size: string
  status: 'processed' | 'processing'
  uploadedBy: string
  taskCount?: number
  date: string
  content: string   // simulated extracted content for AI
  fileData?: string // base64 data URL of the actual uploaded file (not persisted to localStorage)
}

export interface MentorUser {
  id: string
  name: string
  specialty: string
  department: string
  initials: string
  color: string
}

export interface Meeting {
  id: string
  title: string
  date: string        // ISO date e.g. "2026-03-01"
  time: string        // e.g. "10:00 AM"
  mentorId: string
  employeeId: string
  description?: string
  link?: string
}

export interface Notification {
  id: string
  type:
    | 'task_assigned'       // new hire received a task
    | 'task_created'        // task created by hr / admin / mentor (cross-role)
    | 'task_status_changed' // new hire changed task status
    | 'task_feedback_added' // feedback added on a task
    | 'employee_added'      // new hire joined onboarding
    | 'employee_removed'    // new hire removed
    | 'mentor_assigned'     // mentor assigned to a new hire
  message: string
  createdAt: string
  read: boolean           // kept for compatibility
  readBy: string[]        // per-user read tracking — stores userIds who have read this
  targetRoles: Array<'admin' | 'hr' | 'mentor' | 'employee'>
  mentorId?: string       // narrows mentor notifications to a specific mentor
  employeeId?: string     // narrows employee notifications to a specific new hire
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: string
  content: string
  type: 'text' | 'image' | 'file'
  fileName?: string
  fileData?: string   // base64 (not persisted)
  fileType?: string
  createdAt: string
  readBy: string[]    // list of user ids who read this
}

export interface ChatConversation {
  id: string
  name?: string           // group name; undefined for direct
  type: 'direct' | 'group'
  participants: string[]  // user ids
  createdAt: string
  lastMessageAt?: string
}

export interface CompanySettings {
  name: string
  industry: string
  teamSize: string
  about: string
}

interface AppState {
  currentRole: 'admin' | 'hr' | 'mentor' | 'employee' | null
  currentUserId: string | null
  employees: Employee[]
  tasks: Task[]
  documents: Document[]
  mentors: MentorUser[]
  notifications: Notification[]
  conversations: ChatConversation[]
  chatMessages: ChatMessage[]
  meetings: Meeting[]
  companySettings: CompanySettings
}

type Action =
  | { type: 'SCHEDULE_MEETING'; payload: Meeting }
  | { type: 'DELETE_CONVERSATION'; payload: { id: string } }
  | { type: 'SET_ROLE'; payload: { role: AppState['currentRole']; userId?: string } }
  | { type: 'LOGOUT' }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'ADD_TASKS'; payload: Task[] }
  | { type: 'UPDATE_TASK_STATUS'; payload: { id: string; status: Task['status'] } }
  | { type: 'UPDATE_SUBTASK_STATUS'; payload: { taskId: string; subtaskId: string; status: SubTask['status'] } }
  | { type: 'UPDATE_TASK_INPUT'; payload: { taskId: string; inputValue: string } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'REMOVE_TASK'; payload: { id: string } }
  | { type: 'REORDER_TASK'; payload: { id: string; direction: 'up' | 'down'; employeeId: string } }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_EMPLOYEE_RESUME'; payload: { id: string; resumeFileName: string; resumeContent: string } }
  | { type: 'REMOVE_EMPLOYEE'; payload: { id: string } }
  | { type: 'ADD_MENTOR';    payload: MentorUser }
  | { type: 'REMOVE_MENTOR'; payload: { id: string } }
  | { type: 'REMOVE_DOCUMENT'; payload: { id: string } }
  | { type: 'MARK_NOTIFICATIONS_READ' }
  | { type: 'MARK_MENTOR_NOTIFICATIONS_READ'; payload: { mentorId: string } }
  | { type: 'MARK_NOTIFICATIONS_READ_FOR_USER'; payload: { userId: string } }
  | { type: 'ADD_TASK_FEEDBACK'; payload: { taskId: string; feedback: TaskFeedback } }
  | { type: 'UPDATE_EMPLOYEE_BIO'; payload: { id: string; bio: string } }
  | { type: 'SET_MENTOR_PLAYGROUND'; payload: { mentorName: string; enabled: boolean } }
  | { type: 'CREATE_CONVERSATION'; payload: ChatConversation }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'MARK_CHAT_READ'; payload: { conversationId: string; userId: string } }
  | { type: 'UPDATE_COMPANY_SETTINGS'; payload: CompanySettings }

// ─── Static UUIDs for all users ───────────────────────────────────────────────

export const USER_UUIDS = {
  // Employees
  EMP_1: 'd290f1ee-6c54-4b01-90e6-d701748f0851',  // Jordan Lee
  EMP_2: '7c9e6679-7425-40de-944b-e07fc1f90ae7',  // Priya Kapoor
  EMP_3: 'e4b65014-79c4-4a29-a20e-b6adaef744b2',  // Marcus Stone
  EMP_4: '52a98ff7-1c88-4b56-a82c-8b85f3d9e541',  // Aiko Tanaka
  // Mentors
  MENTOR_1: '4b8a5e9f-2d7c-4f3a-8e1b-9c0a6d4f2e17', // Sarah Chen
  MENTOR_2: '6f3d2a1b-8e7c-4d5f-9a2e-1b0c8f7d3e4a', // Mike Johnson
  MENTOR_3: '3a7f1c9e-5b2d-4e8a-b6f0-2c4d7e1f9a3b', // Priya Patel
  // Admin & HR (static identities)
  ADMIN: 'a0000000-0000-4000-8000-000000000001',
  HR:    'b0000000-0000-4000-8000-000000000002',
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const COLORS = ['#2B85DC', '#4EA0EB', '#7DBCF5', '#B3D8FF', '#1F6EC4', '#1558A8']

export const initialMentors: MentorUser[] = [
  { id: USER_UUIDS.MENTOR_1, name: 'Sarah Chen',   specialty: 'Engineering & Architecture',    department: 'Engineering', initials: 'SC', color: '#2B85DC' },
  { id: USER_UUIDS.MENTOR_2, name: 'Mike Johnson', specialty: 'Sales & Business Development',  department: 'Sales',       initials: 'MJ', color: '#4EA0EB' },
  { id: USER_UUIDS.MENTOR_3, name: 'Priya Patel',  specialty: 'Design & Product',              department: 'Product',     initials: 'PP', color: '#7DBCF5' },
]

const initialEmployees: Employee[] = [
  { id: USER_UUIDS.EMP_1, name: 'Jordan Lee',    role: 'Software Engineer',    email: 'jordan@company.com',   team: 'Engineering', mentorId: USER_UUIDS.MENTOR_1, startDate: 'Feb 24, 2026', progress: 22, day: 2,  totalDays: 30, status: 'onboarding', risk: 'low',  initials: 'JL', color: COLORS[0] },
  { id: USER_UUIDS.EMP_2, name: 'Priya Kapoor',  role: 'Product Manager',      email: 'priya.k@company.com',  team: 'Product',     mentorId: USER_UUIDS.MENTOR_3, startDate: 'Feb 20, 2026', progress: 54, day: 6,  totalDays: 30, status: 'onboarding', risk: 'low',  initials: 'PK', color: COLORS[1] },
  { id: USER_UUIDS.EMP_3, name: 'Marcus Stone',  role: 'Sales Representative', email: 'marcus@company.com',   team: 'Sales',       mentorId: USER_UUIDS.MENTOR_2, startDate: 'Feb 17, 2026', progress: 31, day: 9,  totalDays: 21, status: 'onboarding', risk: 'high', initials: 'MS', color: COLORS[2] },
  { id: USER_UUIDS.EMP_4, name: 'Aiko Tanaka',   role: 'UX Designer',          email: 'aiko@company.com',     team: 'Design',      mentorId: USER_UUIDS.MENTOR_3, startDate: 'Feb 10, 2026', progress: 78, day: 16, totalDays: 21, status: 'onboarding', risk: 'low',  initials: 'AT', color: COLORS[3] },
]

const initialDocuments: Document[] = [
  { id: 'doc-1', name: 'Employee Handbook v3.2', type: 'PDF', size: '2.4 MB', status: 'processed', uploadedBy: 'admin', taskCount: 32, date: 'Feb 20', content: 'Company values: innovation, collaboration, integrity. Communication policy: use Slack for quick messages, email for formal comms. Work hours: flexible 9-5. Benefits: health, dental, vision, 401k. PTO: 15 days/year. Code of conduct: respect all team members. Performance reviews: quarterly. Promotion cycle: annual. Remote work: hybrid 3 days in office.' },
  { id: 'doc-2', name: 'IT Security Policy', type: 'PDF', size: '1.1 MB', status: 'processed', uploadedBy: 'hr', taskCount: 15, date: 'Feb 18', content: 'All employees must complete security training within first week. MFA required on all accounts. Password policy: minimum 12 characters. VPN required for remote work. Data classification: public, internal, confidential, restricted. Incident reporting: contact security@company.com. No personal devices for company data. Regular security audits. Phishing awareness training required annually.' },
  { id: 'doc-3', name: 'Engineering Onboarding Guide', type: 'PDF', size: '3.2 MB', status: 'processed', uploadedBy: 'admin', taskCount: 28, date: 'Feb 15', content: 'Tech stack: React, TypeScript, Node.js, PostgreSQL, AWS. Repository: GitHub - clone main repo, set up dev environment. Code review: all PRs require 2 approvals. Testing: unit tests required, 80% coverage. CI/CD: automated pipeline with GitHub Actions. Deployment: staging → production. Architecture: microservices. Documentation: all APIs must be documented. Pair programming: first 2 weeks with buddy. Sprint cycle: 2 weeks, daily standups at 10am.' },
  { id: 'doc-4', name: 'Sales Playbook 2026', type: 'PDF', size: '1.8 MB', status: 'processed', uploadedBy: 'admin', taskCount: 20, date: 'Feb 12', content: 'Sales process: prospect, qualify, demo, proposal, close. CRM: Salesforce - mandatory for all deals. Target: $50k quota per month. Product knowledge: complete all 8 product certification modules. Discovery calls: BANT framework. Demo script: follow standard demo deck. Objection handling: pricing, competition, timing. Pipeline management: weekly review with manager. Commission structure: 8% on closed deals. Territory assignment: by region.' },
]

const initialMeetings: Meeting[] = [
  { id: 'meet-1', title: '1:1 Onboarding Sync',    date: '2026-03-01', time: '10:00 AM', mentorId: USER_UUIDS.MENTOR_1, employeeId: USER_UUIDS.EMP_1, description: 'Weekly sync to review onboarding progress and address any blockers', link: 'https://meet.google.com/abc-defg-hij' },
  { id: 'meet-2', title: 'Tech Stack Deep Dive',    date: '2026-03-03', time: '2:00 PM',  mentorId: USER_UUIDS.MENTOR_1, employeeId: USER_UUIDS.EMP_1, description: 'Walkthrough of the React + TypeScript codebase and system architecture', link: 'https://zoom.us/j/123456789' },
  { id: 'meet-3', title: 'Code Review Walkthrough', date: '2026-03-06', time: '11:00 AM', mentorId: USER_UUIDS.MENTOR_1, employeeId: USER_UUIDS.EMP_1, description: 'Review your first PR together and learn team code review standards' },
  { id: 'meet-4', title: 'Product Roadmap Review',  date: '2026-03-02', time: '11:00 AM', mentorId: USER_UUIDS.MENTOR_3, employeeId: USER_UUIDS.EMP_2, description: 'Overview of Q1 product roadmap and how your role contributes', link: 'https://meet.google.com/xyz-uvwx-yz' },
  { id: 'meet-5', title: 'CRM Demo & Walkthrough',  date: '2026-03-04', time: '3:00 PM',  mentorId: USER_UUIDS.MENTOR_2, employeeId: USER_UUIDS.EMP_3, description: 'Live demo of Salesforce CRM and your territory pipeline setup' },
]

const initialTasks: Task[] = [
  { id: 'task-init-1', title: 'Complete company overview module', description: 'Watch company overview video and complete knowledge check', category: 'Learning',   estimatedTime: '20 min', assignedTo: USER_UUIDS.EMP_1, assignedBy: 'hr',     assignedByName: 'HR Team',     status: 'done',        createdAt: '2026-02-24' },
  { id: 'task-init-2', title: 'Set up Slack workspace',           description: 'Install Slack, join all required channels, update profile',       category: 'Tools',      estimatedTime: '5 min',  assignedTo: USER_UUIDS.EMP_1, assignedBy: 'admin',  assignedByName: 'Admin',       status: 'done',        createdAt: '2026-02-24' },
  { id: 'task-init-3', title: 'Meet your buddy Sarah Chen',       description: 'Schedule and complete first 1:1 with your assigned mentor',       category: 'People',     estimatedTime: '30 min', assignedTo: USER_UUIDS.EMP_1, assignedBy: 'admin',  assignedByName: 'Admin',       status: 'in-progress', createdAt: '2026-02-24' },
  { id: 'task-init-4', title: 'Review employee handbook',         description: 'Read all sections and acknowledge receipt',                        category: 'Compliance', estimatedTime: '45 min', assignedTo: USER_UUIDS.EMP_1, assignedBy: 'hr',     assignedByName: 'HR Team',     status: 'pending',     createdAt: '2026-02-24' },
  { id: 'task-init-5', title: 'Complete IT security training',    description: 'Finish the mandatory cybersecurity awareness course',              category: 'Compliance', estimatedTime: '30 min', assignedTo: USER_UUIDS.EMP_2, assignedBy: 'hr',     assignedByName: 'HR Team',     status: 'done',        createdAt: '2026-02-20' },
  { id: 'task-init-6', title: 'Set up product management tools',  description: 'Access Jira, Confluence, and Figma with required permissions',    category: 'Tools',      estimatedTime: '20 min', assignedTo: USER_UUIDS.EMP_2, assignedBy: 'admin',  assignedByName: 'Admin',       status: 'done',        createdAt: '2026-02-20' },
  { id: 'task-init-7', title: 'Salesforce CRM walkthrough',       description: 'Complete CRM tour and enter first 5 mock deals',                  category: 'Tools',      estimatedTime: '60 min', assignedTo: USER_UUIDS.EMP_3, assignedBy: 'mentor', assignedByName: 'Mike Johnson', status: 'pending',     createdAt: '2026-02-17' },
]

// ─── Notification Factory ─────────────────────────────────────────────────────

function makeNotif(
  type: Notification['type'],
  message: string,
  targetRoles: Notification['targetRoles'],
  extras?: { mentorId?: string; employeeId?: string }
): Notification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    readBy: [],
    targetRoles,
    ...extras,
  }
}

// ─── Load/Save from localStorage ─────────────────────────────────────────────

const STORAGE_KEY    = 'onboardease_state'
// Bump this version whenever IDs or data shape changes — forces a clean reset
const STORAGE_VERSION = '3'
const VERSION_KEY     = 'onboardease_version'

function loadState(): Partial<AppState> {
  try {
    // If the stored version doesn't match, wipe old data so stale IDs don't
    // cause broken mentor-mentee lookups or missing task assignments.
    const storedVersion = localStorage.getItem(VERSION_KEY)
    if (storedVersion !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION)
      return {}
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      employees: state.employees,
      tasks: state.tasks,
      mentors:  state.mentors,
      notifications: state.notifications,
      conversations: state.conversations,
      meetings: state.meetings,
      // Strip fileData from chat messages before persisting
      chatMessages: state.chatMessages.map(({ fileData: _fd, ...m }) => m),
      // Strip fileData (binary) before persisting to avoid bloating localStorage
      documents: state.documents.map(({ fileData: _fd, ...d }) => d),
      companySettings: state.companySettings,
    }))
  } catch {}
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SCHEDULE_MEETING':
      return { ...state, meetings: [...state.meetings, action.payload] }
    case 'DELETE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(c => c.id !== action.payload.id),
        chatMessages:  state.chatMessages.filter(m => m.conversationId !== action.payload.id),
      }
    case 'SET_ROLE':
      return { ...state, currentRole: action.payload.role, currentUserId: action.payload.userId || null }
    case 'LOGOUT':
      return { ...state, currentRole: null, currentUserId: null }
    case 'ADD_EMPLOYEE': {
      const emp = action.payload
      const newNotifs: Notification[] = [...state.notifications]
      // Admin + HR notified about any new hire
      newNotifs.push(makeNotif('employee_added', `New employee ${emp.name} (${emp.role}) has been added to onboarding`, ['admin', 'hr']))
      // Assigned mentor notified
      if (emp.mentorId) {
        newNotifs.push(makeNotif('mentor_assigned', `${emp.name} (${emp.role}) has been assigned to you as a mentee`, ['mentor'], { mentorId: emp.mentorId }))
      }
      return { ...state, employees: [...state.employees, emp], notifications: newNotifs }
    }
    case 'ADD_TASK': {
      const task = action.payload
      const employee = state.employees.find(e => e.id === task.assignedTo)
      const empName  = employee?.name ?? 'employee'
      const newNotifs: Notification[] = [...state.notifications]
      // Admin always gets notified of any task creation
      newNotifs.push(makeNotif('task_created', `${task.assignedByName} created task "${task.title}" for ${empName}`, ['admin']))
      // New hire always notified when a task is assigned to them
      newNotifs.push(makeNotif('task_assigned', `New task "${task.title}" has been assigned to you`, ['employee'], { employeeId: task.assignedTo }))
      // HR notified when a mentor creates a task
      if (task.assignedBy === 'mentor') {
        newNotifs.push(makeNotif('task_created', `Mentor ${task.assignedByName} created task "${task.title}" for ${empName}`, ['hr']))
      }
      // Mentor notified when HR or Admin creates a task for their mentee
      if ((task.assignedBy === 'hr' || task.assignedBy === 'admin') && employee?.mentorId) {
        newNotifs.push(makeNotif('task_created', `${task.assignedByName} created task "${task.title}" for your mentee ${empName}`, ['mentor'], { mentorId: employee.mentorId }))
      }
      return { ...state, tasks: [...state.tasks, task], notifications: newNotifs }
    }
    case 'ADD_TASKS': {
      const tasks = action.payload
      const newNotifs: Notification[] = [...state.notifications]
      if (tasks.length > 0) {
        // Group by assignee for clean per-employee notifications
        const byAssignee: Record<string, Task[]> = {}
        tasks.forEach(t => { byAssignee[t.assignedTo] = [...(byAssignee[t.assignedTo] ?? []), t] })
        Object.entries(byAssignee).forEach(([empId, empTasks]) => {
          const employee       = state.employees.find(e => e.id === empId)
          const empName        = employee?.name ?? 'employee'
          const count          = empTasks.length
          const assignedBy     = empTasks[0].assignedBy
          const assignedByName = empTasks[0].assignedByName
          const label          = `${count} task${count > 1 ? 's' : ''}`
          // Admin
          newNotifs.push(makeNotif('task_created', `${assignedByName} created ${label} for ${empName}`, ['admin']))
          // New hire
          newNotifs.push(makeNotif('task_assigned', `${count} new task${count > 1 ? 's have' : ' has'} been assigned to you`, ['employee'], { employeeId: empId }))
          // HR ← mentor created
          if (assignedBy === 'mentor') {
            newNotifs.push(makeNotif('task_created', `Mentor ${assignedByName} created ${label} for ${empName}`, ['hr']))
          }
          // Mentor ← hr/admin created
          if ((assignedBy === 'hr' || assignedBy === 'admin') && employee?.mentorId) {
            newNotifs.push(makeNotif('task_created', `${assignedByName} created ${label} for your mentee ${empName}`, ['mentor'], { mentorId: employee.mentorId }))
          }
        })
      }
      return { ...state, tasks: [...state.tasks, ...tasks], notifications: newNotifs }
    }
    case 'UPDATE_TASK_STATUS': {
      const task       = state.tasks.find(t => t.id === action.payload.id)
      const newStatus  = action.payload.status
      const newNotifs: Notification[] = [...state.notifications]
      if (task) {
        const employee   = state.employees.find(e => e.id === task.assignedTo)
        const empName    = employee?.name ?? 'employee'
        const statusVerb = newStatus === 'done' ? 'completed' : newStatus === 'in-progress' ? 'started' : 'updated'
        // Admin always notified on any task status change by new hire
        newNotifs.push(makeNotif('task_status_changed', `${empName} ${statusVerb} task "${task.title}"`, ['admin']))
        // Mentor notified when their mentee updates a task
        if (employee?.mentorId) {
          newNotifs.push(makeNotif('task_status_changed', `Your mentee ${empName} ${statusVerb} task "${task.title}"`, ['mentor'], { mentorId: employee.mentorId }))
        }
        // HR notified when one of their tasks is completed
        if (task.assignedBy === 'hr' && newStatus === 'done') {
          newNotifs.push(makeNotif('task_status_changed', `${empName} completed your task "${task.title}"`, ['hr']))
        }
      }
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, status: action.payload.status } : t),
        notifications: newNotifs,
      }
    }
    case 'UPDATE_SUBTASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.taskId
            ? { ...t, subtasks: (t.subtasks ?? []).map(s => s.id === action.payload.subtaskId ? { ...s, status: action.payload.status } : s) }
            : t
        )
      }
    case 'UPDATE_TASK_INPUT':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.taskId ? { ...t, inputValue: action.payload.inputValue } : t
        )
      }
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        )
      }
    case 'REMOVE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload.id) }
    case 'SET_MENTOR_PLAYGROUND':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.assignedBy === 'mentor' && t.assignedByName === action.payload.mentorName
            ? { ...t, playgroundEnabled: action.payload.enabled }
            : t
        )
      }
    case 'REORDER_TASK': {
      const empTasks = state.tasks.filter(t => t.assignedTo === action.payload.employeeId)
      const sorted   = [...empTasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const idx      = sorted.findIndex(t => t.id === action.payload.id)
      if (idx === -1) return state
      const swapIdx  = action.payload.direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return state
      // Swap order values
      const orderA = sorted[idx].order ?? idx
      const orderB = sorted[swapIdx].order ?? swapIdx
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id === sorted[idx].id)    return { ...t, order: orderB }
          if (t.id === sorted[swapIdx].id) return { ...t, order: orderA }
          return t
        }),
      }
    }
    case 'REMOVE_EMPLOYEE': {
      const removedEmp = state.employees.find(e => e.id === action.payload.id)
      const newNotifs: Notification[] = [...state.notifications]
      const empName = removedEmp?.name ?? 'An employee'
      // Admin + HR always notified
      newNotifs.push(makeNotif('employee_removed', `${empName} was removed from onboarding`, ['admin', 'hr']))
      // Mentor notified if the employee had an assigned mentor
      if (removedEmp?.mentorId) {
        newNotifs.push(makeNotif('employee_removed', `Your mentee ${empName} has been removed from onboarding`, ['mentor'], { mentorId: removedEmp.mentorId }))
      }
      const removedConvIds = state.conversations
        .filter(c => c.participants.includes(action.payload.id))
        .map(c => c.id)
      return {
        ...state,
        employees:     state.employees.filter(e => e.id !== action.payload.id),
        tasks:         state.tasks.filter(t => t.assignedTo !== action.payload.id),
        notifications: newNotifs,
        conversations: state.conversations.filter(c => !removedConvIds.includes(c.id)),
        chatMessages:  state.chatMessages.filter(m => !removedConvIds.includes(m.conversationId)),
      }
    }
    case 'ADD_MENTOR':
      return { ...state, mentors: [...state.mentors, action.payload] }
    case 'REMOVE_MENTOR':
      return {
        ...state,
        mentors:   state.mentors.filter(m => m.id !== action.payload.id),
        // Unassign employees whose mentor was removed
        employees: state.employees.map(e =>
          e.mentorId === action.payload.id ? { ...e, mentorId: null } : e
        ),
      }
    case 'ADD_DOCUMENT':
      return { ...state, documents: [action.payload, ...state.documents] }
    case 'REMOVE_DOCUMENT':
      return { ...state, documents: state.documents.filter(d => d.id !== action.payload.id) }
    case 'MARK_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({
          ...n, read: true,
          readBy: n.readBy.includes(USER_UUIDS.HR) ? n.readBy : [...n.readBy, USER_UUIDS.HR],
        })),
      }
    case 'MARK_MENTOR_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.mentorId === action.payload.mentorId
            ? { ...n, read: true, readBy: n.readBy.includes(action.payload.mentorId) ? n.readBy : [...n.readBy, action.payload.mentorId] }
            : n
        ),
      }
    case 'MARK_NOTIFICATIONS_READ_FOR_USER': {
      const { userId } = action.payload
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.readBy.includes(userId) ? n : { ...n, read: true, readBy: [...n.readBy, userId] }
        ),
      }
    }
    case 'ADD_TASK_FEEDBACK': {
      const task = state.tasks.find(t => t.id === action.payload.taskId)
      const fb   = action.payload.feedback
      const newNotifs: Notification[] = [...state.notifications]
      if (task) {
        const employee = state.employees.find(e => e.id === task.assignedTo)
        const empName  = employee?.name ?? 'employee'
        // New hire notified when anyone (mentor/admin/hr) adds feedback on their task
        if (fb.addedByRole !== 'employee') {
          newNotifs.push(makeNotif('task_feedback_added', `${fb.addedBy} added feedback on your task "${task.title}"`, ['employee'], { employeeId: task.assignedTo }))
        }
        // Admin notified when mentor or hr adds feedback
        if (fb.addedByRole !== 'admin') {
          newNotifs.push(makeNotif('task_feedback_added', `${fb.addedBy} added feedback on "${task.title}" for ${empName}`, ['admin']))
        }
      }
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.taskId
            ? { ...t, feedback: [...(t.feedback ?? []), fb] }
            : t
        ),
        notifications: newNotifs,
      }
    }
    case 'UPDATE_EMPLOYEE_BIO':
      return {
        ...state,
        employees: state.employees.map(e =>
          e.id === action.payload.id ? { ...e, bio: action.payload.bio } : e
        ),
      }
    case 'CREATE_CONVERSATION':
      return { ...state, conversations: [...state.conversations, action.payload] }
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
        conversations: state.conversations.map(c =>
          c.id === action.payload.conversationId
            ? { ...c, lastMessageAt: action.payload.createdAt }
            : c
        ),
      }
    case 'MARK_CHAT_READ':
      return {
        ...state,
        chatMessages: state.chatMessages.map(m =>
          m.conversationId === action.payload.conversationId &&
          !m.readBy.includes(action.payload.userId)
            ? { ...m, readBy: [...m.readBy, action.payload.userId] }
            : m
        ),
      }
    case 'UPDATE_EMPLOYEE_RESUME':
      return {
        ...state,
        employees: state.employees.map(e =>
          e.id === action.payload.id
            ? { ...e, resumeFileName: action.payload.resumeFileName, resumeContent: action.payload.resumeContent }
            : e
        )
      }
    case 'UPDATE_COMPANY_SETTINGS':
      return { ...state, companySettings: action.payload }
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<Action>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const persisted = loadState()
  const initialState: AppState = {
    currentRole: null,
    currentUserId: null,
    mentors: persisted.mentors ?? initialMentors,
    employees: persisted.employees ?? initialEmployees,
    tasks: persisted.tasks ?? initialTasks,
    documents: persisted.documents ?? initialDocuments,
    notifications: (persisted as any).notifications ?? [],
    conversations: (persisted as any).conversations ?? [],
    chatMessages:  (persisted as any).chatMessages  ?? [],
    meetings:      (persisted as any).meetings      ?? initialMeetings,
    companySettings: (persisted as any).companySettings ?? {
      name: 'Acme Corp',
      industry: 'SaaS / Software',
      teamSize: '15-30 employees',
      about: 'Acme Corp is a fast-growing SaaS company dedicated to building innovative tools that help teams collaborate and scale effectively.',
    },
  }
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => { saveState(state) }, [
    state.employees,
    state.tasks,
    state.documents,
    state.conversations,
    state.chatMessages,
    state.notifications,
    state.mentors,
    state.meetings,
    state.companySettings,
  ])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
