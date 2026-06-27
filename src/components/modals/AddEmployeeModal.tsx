import { useState, useRef } from 'react'
import { X, Upload, User, Mail, Briefcase, Users, Calendar, CheckCircle, UserCheck, FileText } from 'lucide-react'
import { useApp, initialMentors, Employee } from '../../context/AppContext'

interface Props { onClose: () => void }

const COLORS = ['#2B85DC', '#4EA0EB', '#7DBCF5', '#B3D8FF', '#1F6EC4', '#1558A8', '#0E4290', '#072F70']

const TEAMS = ['Engineering', 'Product', 'Sales', 'Marketing', 'Design', 'Operations', 'Finance', 'Customer Success']

// Simulated resume content based on role
function simulateResumeContent(role: string, name: string): string {
  const r = role.toLowerCase()
  if (r.includes('engineer') || r.includes('developer') || r.includes('dev')) {
    return `${name} — Software Engineer. Skills: React, TypeScript, Node.js, PostgreSQL, AWS, Docker. Experience: 3 years full-stack development. Built scalable SaaS products. Strong in system design and code review. Education: B.S. Computer Science. Proficient in agile methodologies, CI/CD pipelines, and test-driven development.`
  }
  if (r.includes('design') || r.includes('ux') || r.includes('ui')) {
    return `${name} — UX Designer. Skills: Figma, Adobe XD, user research, prototyping, design systems, accessibility (WCAG). Experience: 2 years creating user-centered digital experiences. Conducted 50+ user interviews. Built 3 design systems from scratch. Education: B.A. Graphic Design. Expertise in information architecture and usability testing.`
  }
  if (r.includes('sales')) {
    return `${name} — Sales Representative. Skills: Salesforce CRM, MEDDIC qualification, demo delivery, objection handling, pipeline management. Experience: 2 years B2B SaaS sales. Consistently 110% of quota. Closed $800k ARR in last role. Education: B.S. Business Administration. Strong in discovery calls and value-based selling.`
  }
  if (r.includes('product') || r.includes('pm')) {
    return `${name} — Product Manager. Skills: Roadmap planning, user story writing, Jira, data analysis, stakeholder management, A/B testing. Experience: 3 years SaaS product management. Launched 4 major features. Reduced churn by 18% through improved onboarding. Education: MBA. Strong in cross-functional collaboration and data-driven decision making.`
  }
  if (r.includes('market')) {
    return `${name} — Marketing Manager. Skills: Content strategy, SEO, Google Analytics, HubSpot, social media, paid acquisition. Experience: 3 years B2B marketing. Grew organic traffic 200%. Managed $500k/year ad spend. Education: B.S. Marketing. Strong in demand generation and brand storytelling.`
  }
  return `${name} — ${role}. Experienced professional with strong background in their field. Skilled in collaboration, problem-solving, and delivering results. Brings diverse experience and is eager to contribute to the team's goals. Education: Bachelor's degree in relevant field.`
}

export default function AddEmployeeModal({ onClose }: Props) {
  const { state, dispatch } = useApp()
  const [form, setForm] = useState({ name: '', email: '', role: '', team: TEAMS[0], mentorId: '', startDate: new Date().toISOString().split('T')[0], bio: '' })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required'
    if (!form.role.trim()) e.role = 'Role/position is required'
    if (!form.mentorId) e.mentorId = 'Please assign a mentor'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFileChange = (file: File | null) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
    setResumeFile(file)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))

    const initials = form.name.split(' ').map(n => n[0].toUpperCase()).join('').slice(0, 2)
    const color    = COLORS[state.employees.length % COLORS.length]
    const id       = `emp-${Date.now()}`
    const resumeContent = resumeFile ? simulateResumeContent(form.role, form.name) : undefined

    const employee: Employee = {
      id, name: form.name.trim(), role: form.role.trim(), email: form.email.trim(),
      team: form.team, mentorId: form.mentorId || null,
      startDate: new Date(form.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      progress: 0, day: 1, totalDays: 30, status: 'onboarding', risk: 'low',
      initials, color,
      resumeFileName: resumeFile?.name,
      resumeContent,
      bio: form.bio.trim() || undefined,
    }

    dispatch({ type: 'ADD_EMPLOYEE', payload: employee })
    setSaving(false)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  if (done) return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm w-full animate-bounce-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-brown-900 mb-2">Employee Added! 🎉</h3>
        <p className="text-brown-500 text-sm">
          {form.name} has been added and their mentor notified.
        </p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brown-200 bg-gradient-to-r from-brown-500 to-brown-700 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">Add New Employee</h2>
            <p className="text-white/70 text-sm mt-0.5">They'll appear in HR and the assigned mentor's dashboard</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-brown-800 mb-1.5">
              <span className="flex items-center gap-1.5"><User size={14} /> Full Name *</span>
            </label>
            <input className={`input-field ${errors.name ? 'border-red-400' : ''}`} placeholder="e.g. Jordan Lee" value={form.name} onChange={e => set('name', e.target.value)} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-brown-800 mb-1.5">
              <span className="flex items-center gap-1.5"><Mail size={14} /> Work Email *</span>
            </label>
            <input className={`input-field ${errors.email ? 'border-red-400' : ''}`} type="email" placeholder="jordan@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Role + Team */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brown-800 mb-1.5">
                <span className="flex items-center gap-1.5"><Briefcase size={14} /> Job Title *</span>
              </label>
              <input className={`input-field ${errors.role ? 'border-red-400' : ''}`} placeholder="e.g. Software Engineer" value={form.role} onChange={e => set('role', e.target.value)} />
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-brown-800 mb-1.5">
                <span className="flex items-center gap-1.5"><Users size={14} /> Team</span>
              </label>
              <select className="input-field" value={form.team} onChange={e => set('team', e.target.value)}>
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-brown-800 mb-1.5">
              <span className="flex items-center gap-1.5"><Calendar size={14} /> Start Date</span>
            </label>
            <input className="input-field" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>

          {/* Mentor assignment */}
          <div>
            <label className="block text-sm font-semibold text-brown-800 mb-2">
              <span className="flex items-center gap-1.5"><UserCheck size={14} className="text-teal-600" /> Assign Mentor *</span>
            </label>
            <div className="space-y-2">
              {initialMentors.map(mentor => (
                <label
                  key={mentor.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    form.mentorId === mentor.id ? 'border-brown-500 bg-brown-50' : 'border-brown-200 hover:border-brown-300'
                  }`}
                >
                  <input type="radio" name="mentor" value={mentor.id} checked={form.mentorId === mentor.id} onChange={() => set('mentorId', mentor.id)} className="sr-only" />
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: mentor.color }}>
                    {mentor.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-brown-900 text-sm">{mentor.name}</p>
                    <p className="text-xs text-brown-500">{mentor.specialty}</p>
                  </div>
                  {form.mentorId === mentor.id && <CheckCircle size={16} className="text-brown-500 ml-auto" />}
                </label>
              ))}
            </div>
            {errors.mentorId && <p className="text-red-500 text-xs mt-1">{errors.mentorId}</p>}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-brown-800 mb-1.5">
              <span className="flex items-center gap-1.5"><FileText size={14} /> Short Bio <span className="text-brown-400 font-normal">(optional)</span></span>
            </label>
            <textarea
              className="input-field resize-none text-sm"
              rows={3}
              placeholder="A short intro about this new hire — background, interests, fun fact…"
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              maxLength={300}
            />
            <p className="text-xs text-brown-400 mt-1 text-right">{form.bio.length}/300</p>
          </div>

          {/* Resume upload */}
          <div>
            <label className="block text-sm font-semibold text-brown-800 mb-1.5">
              <span className="flex items-center gap-1.5"><Upload size={14} /> Upload Resume <span className="text-brown-400 font-normal">(optional)</span></span>
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                dragOver ? 'border-brown-500 bg-brown-50' : resumeFile ? 'border-green-400 bg-green-50' : 'border-brown-200 hover:border-brown-400'
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]) }}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
              {resumeFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle size={20} className="text-green-600" />
                  <div className="text-left">
                    <p className="font-semibold text-green-800 text-sm">{resumeFile.name}</p>
                    <p className="text-xs text-green-600">{(resumeFile.size / 1024).toFixed(0)} KB — AI will analyze this resume</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={22} className="text-brown-400 mx-auto mb-2" />
                  <p className="text-sm text-brown-600 font-medium">Drop resume here or click to browse</p>
                  <p className="text-xs text-brown-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                </>
              )}
            </div>
            {resumeFile && <p className="text-xs text-brown-500 mt-1.5">✨ The mentor can use this resume to generate personalized onboarding tasks with AI</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Adding...</>
            ) : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}
