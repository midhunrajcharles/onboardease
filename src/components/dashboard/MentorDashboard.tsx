import { useState, useRef, useEffect } from 'react'
import {
  Users, Bot, Sparkles, Send, FileText, ListChecks,
  AlertTriangle, CheckCircle, Calendar, Clock, X, Plus,
  BarChart3, Settings, Bell, Trash2, ChevronRight,
  Edit3, Save, Star, BookOpen, Search, Eye, Upload, FlaskConical
} from 'lucide-react'
import { useApp, initialMentors, Employee, Task } from '../../context/AppContext'
import type { Document } from '../../context/AppContext'
import { generateTasksFromResume, parseTasksFromResponse, ParsedTask } from '../../services/aiService'
import AssignTaskModal from '../modals/AssignTaskModal'
import CreateTaskModal from '../modals/CreateTaskModal'
import EmployeeDetailModal from '../modals/EmployeeDetailModal'
import PDFViewerModal from '../modals/PDFViewerModal'
import AdminChatWidget from '../chat/AdminChatWidget'
import PlaygroundActivityModal from '../modals/PlaygroundActivityModal'

// ─── Local types ──────────────────────────────────────────────────────────────

interface Meeting {
  id: string
  menteeId: string
  title: string
  date: string
  time: string
  type: '1:1' | 'check-in' | 'review'
  notes: string
}

interface ChatMsg {
  id: string
  role: 'user' | 'ai'
  content: string
  tasks?: ParsedTask[]
  timestamp: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDaysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff}d`
}

// ─── ResumeAIChat ─────────────────────────────────────────────────────────────

function ResumeAIChat({
  employee,
  mentorName,
  onClose,
}: {
  employee: Employee
  mentorName: string
  onClose: () => void
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([{
    id: '0', role: 'ai', timestamp: new Date(),
    content: `👋 I'm your AI onboarding specialist.\n\n${employee.resumeFileName
      ? `I've analyzed **${employee.resumeFileName}** for ${employee.name}. They're joining as **${employee.role}**.`
      : `${employee.name} doesn't have a resume uploaded yet, but I can still create a plan based on their role as **${employee.role}**.`
    }\n\nTell me what kind of onboarding plan you'd like me to create:\n• **"Create a 30-day technical plan for a React developer"**\n• **"Build a plan focusing on communication and team integration"**\n• **"Generate a task list for their first week only"**`,
  }])
  const [input, setInput]           = useState('')
  const [typing, setTyping]         = useState(false)
  const [pendingTasks, setPending]  = useState<ParsedTask[] | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || typing) return
    setInput('')
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }])
    setTyping(true)
    const aiText = await generateTasksFromResume(
      employee.resumeContent ?? `${employee.name}, ${employee.role}, ${employee.team} team.`,
      employee.resumeFileName ?? '', msg, employee.role
    )
    const parsed = parseTasksFromResponse(aiText)
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: aiText, tasks: parsed.length > 0 ? parsed : undefined, timestamp: new Date() }])
    if (parsed.length > 0) setPending(parsed)
    setTyping(false)
  }

  const fmt = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[680px] flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 to-teal-800 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white">Resume AI — {employee.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-white/70 text-xs">
                    {employee.resumeFileName ? `📄 ${employee.resumeFileName}` : `${employee.role} · No resume`}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white"><X size={18} /></button>
          </div>
          {employee.resumeContent && (
            <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100 flex-shrink-0">
              <p className="text-xs text-teal-800 line-clamp-2">
                <span className="font-semibold">Resume: </span>{employee.resumeContent}
              </p>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={15} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-white text-brown-800 border border-teal-200 rounded-tl-sm shadow-sm'}`}
                    dangerouslySetInnerHTML={{ __html: fmt(msg.content) }}
                  />
                  {msg.tasks && msg.tasks.length > 0 && (
                    <button onClick={() => { setPending(msg.tasks!); setShowAssign(true) }}
                      className="flex items-center gap-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-lg mt-1 transition-colors">
                      <ListChecks size={14} /> Assign {msg.tasks.length} Tasks to {employee.name}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-white border border-teal-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="px-4 py-2 border-t border-teal-100 flex gap-2 overflow-x-auto flex-shrink-0">
            {['Create 30-day plan', 'Week 1 tasks only', 'Technical deep-dive', 'Team integration focus'].map(p => (
              <button key={p} onClick={() => send(p)}
                className="flex-shrink-0 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1.5 rounded-full hover:bg-teal-100 transition-colors">
                {p}
              </button>
            ))}
          </div>
          <div className="px-4 pb-4 pt-1 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white border border-teal-200 rounded-xl px-4 py-2.5">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Describe the onboarding plan you want to create..."
                className="flex-1 bg-transparent text-sm text-brown-800 placeholder-brown-400 outline-none"
              />
              <button onClick={() => send()} disabled={!input.trim() || typing}
                className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white disabled:opacity-40 hover:bg-teal-700 transition-colors">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {showAssign && pendingTasks && (
        <AssignTaskModal tasks={pendingTasks} preselectedEmployeeId={employee.id}
          onClose={() => setShowAssign(false)} assignedBy="mentor" assignedByName={mentorName} />
      )}
    </>
  )
}

// ─── ScheduleMeetingModal ─────────────────────────────────────────────────────

function ScheduleMeetingModal({
  preselectedMentee,
  mentees,
  onClose,
  onSave,
}: {
  preselectedMentee: Employee | null
  mentees: Employee[]
  onClose: () => void
  onSave: (m: Meeting) => void
}) {
  const [menteeId, setMenteeId] = useState(preselectedMentee?.id ?? mentees[0]?.id ?? '')
  const [title,    setTitle]    = useState('1:1 Check-in')
  const [date,     setDate]     = useState(dayOffset(1))
  const [time,     setTime]     = useState('10:00')
  const [type,     setType]     = useState<Meeting['type']>('1:1')
  const [notes,    setNotes]    = useState('')

  const save = () => {
    if (!menteeId || !title || !date) return
    onSave({ id: `mtg-${Date.now()}`, menteeId, title, date, time, type, notes })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-100">
          <h2 className="font-bold text-brown-900 text-lg flex items-center gap-2">
            <Calendar size={18} className="text-teal-600" /> Schedule Meeting
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-500"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Mentee</label>
            <select value={menteeId} onChange={e => setMenteeId(e.target.value)}
              className="w-full border border-brown-200 rounded-xl px-3 py-2.5 text-sm text-brown-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              {mentees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Meeting Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-brown-200 rounded-xl px-3 py-2.5 text-sm text-brown-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="e.g. Weekly Check-in" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Meeting Type</label>
            <div className="flex gap-2">
              {(['1:1', 'check-in', 'review'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    type === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-brown-600 border-brown-200 hover:bg-brown-50'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brown-600 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-brown-200 rounded-xl px-3 py-2.5 text-sm text-brown-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown-600 mb-1.5">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full border border-brown-200 rounded-xl px-3 py-2.5 text-sm text-brown-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-brown-200 rounded-xl px-3 py-2.5 text-sm text-brown-800 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="Meeting agenda or preparation notes..." />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-brown-200 rounded-xl text-sm font-medium text-brown-600 hover:bg-brown-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={!menteeId || !title || !date}
            className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40">
            Schedule Meeting
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MenteeCard (used in Overview) ───────────────────────────────────────────

function MenteeCard({
  mentee,
  myTasks,
  onDetailClick,
  onScheduleClick,
  onCreateTaskClick,
  onViewPlayground,
}: {
  mentee: Employee
  myTasks: Task[]
  onDetailClick: () => void
  onScheduleClick: () => void
  onCreateTaskClick: () => void
  onViewPlayground: (task: Task) => void
}) {
  const { state } = useApp()
  const done   = myTasks.filter(t => t.status === 'done').length

  // Compute overall progress from ALL tasks assigned to this mentee (not static value)
  const allTasks = state.tasks.filter(t => t.assignedTo === mentee.id)
  const computedProgress = allTasks.length > 0
    ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100)
    : 0

  const status = mentee.risk === 'high' ? 'at-risk' : computedProgress > 70 ? 'ahead' : 'on-track'
  const badgeCls =
    status === 'at-risk' ? 'bg-red-100 text-red-700 border border-red-200'
    : status === 'ahead' ? 'bg-blue-100 text-blue-700 border border-blue-200'
    : 'bg-green-100 text-green-700 border border-green-200'
  const badgeLabel = status === 'at-risk' ? '⚠️ At Risk' : status === 'ahead' ? '🚀 Ahead' : '✅ On Track'

  return (
    <div
      onClick={onDetailClick}
      className="card hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 border-transparent hover:border-teal-200"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ background: mentee.color }}>
            {mentee.initials}
          </div>
          <div>
            <h4 className="font-bold text-brown-900 group-hover:text-teal-700 transition-colors">{mentee.name}</h4>
            <p className="text-sm text-brown-500">{mentee.role} · {mentee.team}</p>
            <p className="text-xs text-brown-400 mt-0.5">Started {mentee.startDate} · Day {mentee.day}/{mentee.totalDays}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allTasks.length > 0 && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeCls}`}>{badgeLabel}</span>
          )}
          <ChevronRight size={16} className="text-brown-300 group-hover:text-teal-500 transition-colors" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between text-xs text-brown-500 mb-1 font-medium"><span>Progress</span><span>{computedProgress}%</span></div>
          <div className="w-full h-2 bg-brown-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${mentee.risk === 'high' ? 'bg-red-400' : 'bg-teal-500'}`} style={{ width: `${computedProgress}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-brown-500 mb-1 font-medium"><span>My Tasks</span><span>{done}/{myTasks.length}</span></div>
          <div className="w-full h-2 bg-brown-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-teal-500" style={{ width: myTasks.length > 0 ? `${(done / myTasks.length) * 100}%` : '0%' }} />
          </div>
        </div>
      </div>

      {/* Resume status */}
      <div className={`mt-4 p-3 rounded-xl border ${mentee.resumeFileName ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2">
          <FileText size={14} className={mentee.resumeFileName ? 'text-green-600' : 'text-amber-600'} />
          <span className="text-xs font-semibold truncate">{mentee.resumeFileName ?? 'No resume uploaded'}</span>
          {mentee.resumeFileName && <span className="ml-auto text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">AI Ready</span>}
        </div>
      </div>

      {/* Playground activity panel — shows each playground task with View button */}
      {myTasks.some(t => t.playgroundEnabled) && (() => {
        const pgTasks = myTasks.filter(t => t.playgroundEnabled)
        return (
          <div className="mt-3 bg-teal-50 border border-teal-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-teal-200">
              <FlaskConical size={12} className="text-teal-600" />
              <span className="text-xs font-bold text-teal-700">Playground Tasks</span>
              <span className="ml-auto text-[10px] font-semibold bg-teal-600 text-white px-1.5 py-0.5 rounded-full">{pgTasks.length}</span>
            </div>
            {pgTasks.map(t => {
              const hasActivity = !!t.playgroundState?.lastSaved
              const typeIcon = t.playgroundType === 'sales' ? '📧' : '💻'
              const typeLabel = t.playgroundType === 'sales' ? 'Sales Mail' : 'Engineering'
              return (
                <div key={t.id} className="flex items-center gap-2 px-3 py-2 border-b border-teal-100 last:border-b-0">
                  <span className="text-xs">{typeIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-teal-800 truncate">{t.title}</p>
                    <p className="text-[10px] text-teal-500">{typeLabel} · {hasActivity ? '🟢 Has activity' : '⚪ No activity yet'}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onViewPlayground(t) }}
                    disabled={!hasActivity}
                    title={hasActivity ? 'View playground activity' : 'No activity yet'}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 ${
                      hasActivity
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-teal-100 text-teal-400 cursor-not-allowed'
                    }`}
                  >
                    <Eye size={10} /> View
                  </button>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Actions */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-brown-100 flex-wrap gap-2">
        <button
          onClick={e => { e.stopPropagation(); onScheduleClick() }}
          className="flex items-center gap-1.5 text-xs font-medium text-brown-600 bg-brown-50 hover:bg-brown-100 px-3 py-1.5 rounded-lg transition-colors border border-brown-200"
        >
          <Calendar size={13} /> Schedule
        </button>
        {/* Simple Create Task — same as the button inside EmployeeDetailModal */}
        <button
          onClick={e => { e.stopPropagation(); onCreateTaskClick() }}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} /> Create Task
        </button>
      </div>
    </div>
  )
}

// ─── OverviewSection ──────────────────────────────────────────────────────────

function OverviewSection({
  myMentees,
  currentMentor,
  onDetailClick,
  onScheduleClick,
  onCreateTaskClick,
  meetings,
}: {
  myMentees: Employee[]
  currentMentor: typeof initialMentors[0]
  onDetailClick: (m: Employee) => void
  onScheduleClick: (m: Employee) => void
  onCreateTaskClick: (m: Employee) => void
  meetings: Meeting[]
}) {
  const { state, dispatch } = useApp()
  const docInputRef = useRef<HTMLInputElement>(null)

  // Playground activity viewer state
  const [pgTask,     setPgTask]     = useState<Task | null>(null)
  const [pgEmployee, setPgEmployee] = useState<Employee | null>(null)

  // Compute progress strictly from task completion — 0% if no tasks assigned
  const getComputedProgress = (emp: Employee) => {
    const tasks = state.tasks.filter(t => t.assignedTo === emp.id)
    return tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
      : 0
  }

  const avgProgress = myMentees.length > 0
    ? Math.round(myMentees.reduce((s, e) => s + getComputedProgress(e), 0) / myMentees.length)
    : 0

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const newDoc: Document = {
        id:         `doc-${Date.now()}`,
        name:       file.name,
        type:       file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
        size:       `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status:     'processed',
        uploadedBy: currentMentor.id,
        date:       new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        content:    `Document: ${file.name}. Contains mentor reference material.`,
        fileData:   reader.result as string,
      }
      dispatch({ type: 'ADD_DOCUMENT', payload: newDoc })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Only show documents uploaded by this specific mentor in the overview panel
  const allDocs = state.documents.filter(d => d.uploadedBy === currentMentor.id)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {currentMentor.initials}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Welcome, {currentMentor.name}!</h2>
            <p className="text-teal-100 text-sm">{currentMentor.specialty} · {myMentees.length} active mentee{myMentees.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users size={20} />,         label: 'My Mentees',    value: myMentees.length,                                                                                            color: 'bg-teal-50 text-teal-700'   },
          { icon: <AlertTriangle size={20} />, label: 'At Risk',       value: myMentees.filter(e => e.risk === 'high').length,                                                              color: 'bg-red-50 text-red-600'     },
          { icon: <ListChecks size={20} />,    label: 'Tasks Assigned', value: state.tasks.filter(t => myMentees.some(e => e.id === t.assignedTo)).length,    color: 'bg-brown-50 text-brown-600' },
          { icon: <CheckCircle size={20} />,   label: 'With Resumes',  value: myMentees.filter(e => !!e.resumeFileName).length,                                                            color: 'bg-green-50 text-green-600' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-sm text-brown-500 font-medium">{s.label}</p>
              <p className="font-bold text-brown-900 text-xl leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left/central: Mentee cards + AI Insights (same as Admin layout) ── */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-brown-900 text-lg flex items-center gap-2">
            My Mentees
            <span className="text-xs font-normal text-brown-400 ml-1">· click a card to view full details</span>
          </h3>
          {myMentees.length === 0 ? (
            <div className="card text-center py-12 text-brown-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No mentees assigned yet</p>
              <p className="text-sm mt-1">Ask your Admin to assign employees to you</p>
            </div>
          ) : (
            myMentees.map(mentee => {
              const myTasks = state.tasks.filter(t => t.assignedTo === mentee.id && t.assignedBy === 'mentor')
              return (
                <MenteeCard key={mentee.id} mentee={mentee} myTasks={myTasks}
                  onDetailClick={() => onDetailClick(mentee)}
                  onScheduleClick={() => onScheduleClick(mentee)}
                  onCreateTaskClick={() => onCreateTaskClick(mentee)}
                  onViewPlayground={t => { setPgTask(t); setPgEmployee(mentee) }} />
              )
            })
          )}

          {/* AI Chat Widget — below mentee cards */}
          <AdminChatWidget
            employeeCount={myMentees.length}
            atRiskCount={myMentees.filter(e => e.risk === 'high').length}
            avgProgress={avgProgress}
            docCount={state.documents.length}
            atRiskNames={myMentees.filter(e => e.risk === 'high').map(e => e.name)}
          />
        </div>

        {/* ── Right panel: AI Insights card + My Documents ── */}
        <div className="space-y-5">
          {/* AI Insights — static insight cards like Admin/HR portal */}
          <div className="card">
            <h3 className="font-bold text-brown-900 mb-4 flex items-center gap-2">
              <Bot size={16} /> AI Insights
            </h3>
            <div className="space-y-3">
              {myMentees.filter(e => e.risk === 'high').length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                  ⚠️ <strong>{myMentees.filter(e => e.risk === 'high').map(e => e.name).join(', ')}</strong> — low engagement. Schedule a check-in.
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                ✅ {state.documents.filter(d => d.status === 'processed' && d.uploadedBy === currentMentor.id).length} of your documents processed and ready.
              </div>
              {myMentees.filter(t => !state.tasks.some(tk => tk.assignedTo === t.id)).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  📋 <strong>{myMentees.filter(t => !state.tasks.some(tk => tk.assignedTo === t.id)).map(e => e.name).join(', ')}</strong> — no tasks assigned yet.
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                💡 Click any mentee card to view full details, tasks and progress.
              </div>
              {avgProgress >= 70 && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-800">
                  🚀 Your mentees are averaging <strong>{avgProgress}%</strong> progress — great work!
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="card">
            <h3 className="font-bold text-brown-900 mb-3 text-sm flex items-center gap-2">
              <Calendar size={14} className="text-teal-600" /> Upcoming Meetings
            </h3>
            {(() => {
              const today = new Date().toISOString().split('T')[0]
              const upcoming = [...meetings]
                .filter(m => m.date >= today)
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .slice(0, 3)
              if (upcoming.length === 0) return (
                <div className="text-center py-4 text-brown-400">
                  <Calendar size={24} className="mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs">No meetings scheduled</p>
                </div>
              )
              return (
                <div className="space-y-2">
                  {upcoming.map(meet => {
                    const mentee = myMentees.find(e => e.id === meet.menteeId)
                    return (
                      <div key={meet.id} className="flex items-start gap-2.5 p-2.5 rounded-xl border border-teal-100 bg-teal-50/40">
                        <div className="flex-shrink-0 text-center bg-teal-100 rounded-lg px-1.5 py-1 min-w-[38px]">
                          <p className="text-[9px] font-bold text-teal-600 uppercase leading-none">
                            {new Date(meet.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                          </p>
                          <p className="text-base font-black text-teal-900 leading-tight">
                            {new Date(meet.date + 'T00:00:00').getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-brown-800 truncate">{meet.title}</p>
                          {mentee && <p className="text-[10px] text-brown-500 truncate">{mentee.name}</p>}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock size={9} className="text-brown-400" />
                            <span className="text-xs text-brown-400">{meet.time}</span>
                            <span className="text-xs font-semibold text-teal-600">· {getDaysUntil(meet.date)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* My Documents */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-brown-900 flex items-center gap-2">
                <FileText size={16} className="text-teal-600" /> My Documents
              </h3>
              <button
                onClick={() => docInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Upload size={12} /> Upload
              </button>
              <input ref={docInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg" onChange={handleDocUpload} />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allDocs.length === 0 ? (
                <p className="text-xs text-brown-400 text-center py-4">No documents uploaded yet</p>
              ) : (
                allDocs.slice(0, 6).map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-brown-50 border border-brown-100">
                    <BookOpen size={13} className="text-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-brown-800 truncate flex-1">{doc.name}</span>
                    <span className="text-[10px] text-brown-400 flex-shrink-0">{doc.type}</span>
                  </div>
                ))
              )}
              {allDocs.length > 6 && (
                <p className="text-xs text-brown-400 text-center">+{allDocs.length - 6} more — see Documents tab</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Playground Activity Modal — opens from MenteeCard "View" button */}
      {pgTask && pgEmployee && (
        <PlaygroundActivityModal
          task={pgTask}
          employeeName={pgEmployee.name}
          onClose={() => { setPgTask(null); setPgEmployee(null) }}
        />
      )}
    </div>
  )
}

// ─── MenteesSection — same table layout as HR / Admin ────────────────────────

function MenteesSection({ myMentees }: { myMentees: Employee[] }) {
  const { state } = useApp()
  const [search,           setSearch]           = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const getProgress = (emp: Employee) => {
    const tasks = state.tasks.filter(t => t.assignedTo === emp.id)
    if (tasks.length === 0) return 0
    const done = tasks.filter(t => t.status === 'done').length
    return Math.round((done / tasks.length) * 100)
  }
  const hasTasks  = (empId: string) => state.tasks.some(t => t.assignedTo === empId)
  const getMentor = (mentorId: string | null) =>
    mentorId ? (initialMentors.find(m => m.id === mentorId)?.name ?? '—') : 'Unassigned'

  const filtered = myMentees.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  )

  // Count ALL tasks assigned to this mentor's mentees (not just mentor-created)
  const totalMentorTasks = state.tasks.filter(t => myMentees.some(m => m.id === t.assignedTo))
  const doneMentorTasks  = totalMentorTasks.filter(t => t.status === 'done')

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-xl font-bold text-brown-900">My Mentees</h2>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users size={20} />,         label: 'Total Mentees',   value: myMentees.length,                               color: 'bg-teal-50 text-teal-700'   },
          { icon: <AlertTriangle size={20} />, label: 'At Risk',         value: myMentees.filter(e => e.risk === 'high').length, color: 'bg-red-50 text-red-600'     },
          { icon: <ListChecks size={20} />,    label: 'Tasks Assigned',  value: totalMentorTasks.length,                        color: 'bg-brown-50 text-brown-600' },
          { icon: <CheckCircle size={20} />,   label: 'Tasks Completed', value: doneMentorTasks.length,                         color: 'bg-green-50 text-green-600' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-sm text-brown-500 font-medium">{s.label}</p>
              <p className="font-bold text-brown-900 text-xl leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      {myMentees.length > 0 && (
        <div className="card space-y-4">
          <h3 className="font-bold text-brown-900 flex items-center gap-2">
            <BarChart3 size={16} className="text-teal-600" /> Progress Overview
          </h3>
          <div className="space-y-3">
            {myMentees.map(mentee => {
              const tasks    = state.tasks.filter(t => t.assignedTo === mentee.id)
              const done     = tasks.filter(t => t.status === 'done').length
              const inProg   = tasks.filter(t => t.status === 'in-progress').length
              const pending  = tasks.filter(t => t.status === 'pending').length
              const pct      = getProgress(mentee)
              return (
                <div key={mentee.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                  <div className="flex items-center gap-2 w-40 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: mentee.color }}>{mentee.initials}</div>
                    <span className="text-sm font-semibold text-brown-900 truncate">{mentee.name}</span>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-amber-600">No tasks assigned</span>
                    </div>
                  ) : (
                    <div>
                      <div className="w-full h-2.5 bg-brown-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${mentee.risk === 'high' ? 'bg-red-400' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-green-600 font-medium">{done} done</span>
                        <span className="text-xs text-blue-500 font-medium">{inProg} in progress</span>
                        <span className="text-xs text-amber-500 font-medium">{pending} pending</span>
                      </div>
                    </div>
                  )}
                  <div className="text-right flex-shrink-0 w-12">
                    {tasks.length === 0
                      ? <span className="text-xs text-amber-500 font-semibold">—</span>
                      : <>
                          <span className={`text-sm font-bold ${mentee.risk === 'high' ? 'text-red-600' : 'text-teal-600'}`}>{pct}%</span>
                          {mentee.risk === 'high' && <p className="text-[10px] text-red-500 font-semibold">At Risk</p>}
                        </>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Employee table — identical to HR / Admin */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
            <input placeholder="Search mentees…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" />
          </div>
          <span className="text-sm text-brown-500 self-center">{filtered.length} mentee{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brown-50 border-b border-brown-200">
                <tr>
                  {['Employee', 'Role / Team', 'Mentor', 'Progress', 'Tasks', 'Status', 'Resume', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-brown-600 px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-100">
                {filtered.map(emp => {
                  const myTasks = state.tasks.filter(t => t.assignedTo === emp.id)
                  const done    = myTasks.filter(t => t.status === 'done').length
                  const prog    = getProgress(emp)
                  return (
                    <tr key={emp.id} onClick={() => setSelectedEmployee(emp)} className="hover:bg-brown-50/60 transition-colors cursor-pointer">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: emp.color }}>{emp.initials}</div>
                          <div><span className="font-semibold text-brown-900 text-sm">{emp.name}</span><p className="text-xs text-brown-400">{emp.email}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><p className="text-sm text-brown-800 font-medium">{emp.role}</p><p className="text-xs text-brown-400">{emp.team}</p></td>
                      <td className="px-4 py-4 text-sm text-brown-600 whitespace-nowrap">{getMentor(emp.mentorId)}</td>
                      <td className="px-4 py-4">
                        {hasTasks(emp.id)
                          ? <div className="flex items-center gap-2"><div className="w-20 progress-bar"><div className={`progress-fill ${emp.risk === 'high' ? '!bg-red-400' : ''}`} style={{ width: `${prog}%` }} /></div><span className="text-xs text-brown-500 font-medium">{prog}%</span></div>
                          : <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full whitespace-nowrap">No task assigned</span>
                        }
                      </td>
                      <td className="px-4 py-4 text-sm text-brown-600 whitespace-nowrap">{done}/{myTasks.length} done</td>
                      <td className="px-4 py-4">{emp.status === 'completed' ? <span className="badge-green">Completed</span> : <span className="badge-orange">Onboarding</span>}</td>
                      <td className="px-4 py-4">{emp.resumeFileName ? <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle size={11} />{emp.resumeFileName.slice(0, 12)}…</span> : <span className="text-xs text-brown-400">—</span>}</td>
                      <td className="px-4 py-4 text-xs text-brown-400 underline">View →</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-brown-400">
                <Users size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">{myMentees.length === 0 ? 'No mentees assigned yet' : 'No mentees match your search'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEmployee && <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}
    </div>
  )
}

// ─── DocumentsSection — only shows THIS mentor's own documents ────────────────

function DocumentsSection({ currentMentorId }: { currentMentorId: string }) {
  const { state, dispatch } = useApp()
  const [search,       setSearch]       = useState('')
  const [viewingDoc,   setViewingDoc]   = useState<Document | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null)
  const [docInUseError, setDocInUseError] = useState<string | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // Check if a document is referenced by any task's supportingDocs
  const isDocInUse = (docId: string) =>
    state.tasks.some(t => (t.supportingDocs ?? []).includes(docId))

  // Only show documents uploaded by this specific mentor
  const myDocs = state.documents.filter(d => d.uploadedBy === currentMentorId)
  const filtered = myDocs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.type.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const newDoc: Document = {
        id:         `doc-${Date.now()}`,
        name:       file.name,
        type:       file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
        size:       `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status:     'processed',
        uploadedBy: currentMentorId,
        date:       new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        content:    `Document: ${file.name}. Mentor reference material.`,
        fileData:   reader.result as string,
      }
      dispatch({ type: 'ADD_DOCUMENT', payload: newDoc })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <h2 className="text-xl font-bold text-brown-900 flex items-center gap-2">
        <FileText size={20} className="text-teal-600" /> My Documents
      </h2>

      {/* Upload area */}
      <div className="border-2 border-dashed border-brown-200 rounded-2xl p-8 text-center hover:border-teal-400 transition-all">
        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Upload size={24} className="text-teal-500" />
        </div>
        <h3 className="font-bold text-brown-900 mb-1">Upload Documents</h3>
        <p className="text-brown-500 text-sm mb-4">Upload reference materials, guides or notes for your mentees</p>
        <button onClick={() => docInputRef.current?.click()}
          className="btn-primary text-sm py-2.5 px-6 inline-flex items-center gap-2">
          <Upload size={15} /> Upload Document
        </button>
        <input ref={docInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg" onChange={handleUpload} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
        <input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" />
      </div>

      {/* Documents list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-brown-100 flex justify-between items-center">
          <h3 className="font-bold text-brown-900">Uploaded by Me</h3>
          <span className="badge-brown">{myDocs.length} file{myDocs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y divide-brown-100">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-brown-400">
              <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">{myDocs.length === 0 ? 'No documents uploaded yet.' : 'No documents match your search.'}</p>
            </div>
          ) : (
            filtered.map(doc => (
              <div key={doc.id} className={`transition-colors ${confirmDel === doc.id ? 'bg-red-50' : 'hover:bg-brown-50/50'}`}>
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-200 flex-shrink-0">
                    <BookOpen size={18} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brown-900 text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-brown-400">{doc.type} · {doc.size} · {doc.date}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.status === 'processed'
                      ? <span className="badge-green flex items-center gap-1"><CheckCircle size={11} />Processed</span>
                      : <span className="badge-orange">Processing…</span>
                    }
                    <button onClick={() => setViewingDoc(doc)}
                      className="text-xs font-semibold text-brown-600 border border-brown-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-brown-50 transition-colors flex items-center gap-1">
                      <Eye size={12} /> View
                    </button>
                    <button onClick={() => {
                        setDocInUseError(null)
                        if (isDocInUse(doc.id)) {
                          setDocInUseError(doc.id)
                          setConfirmDel(null)
                        } else {
                          setConfirmDel(confirmDel === doc.id ? null : doc.id)
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${confirmDel === doc.id ? 'text-red-600 bg-red-100' : 'text-red-300 hover:text-red-600 hover:bg-red-50'}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {/* Document in-use error */}
                {docInUseError === doc.id && (
                  <div className="flex items-center justify-between gap-3 px-6 py-3 bg-amber-50 border-t border-amber-200">
                    <p className="text-xs text-amber-800 font-medium flex items-center gap-2">
                      <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                      This document is currently attached to one or more tasks and cannot be deleted.
                    </p>
                    <button onClick={() => setDocInUseError(null)} className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-colors flex-shrink-0">Dismiss</button>
                  </div>
                )}
                {confirmDel === doc.id && (
                  <div className="px-6 py-3 bg-red-50 border-t border-red-100 space-y-2">
                    {docInUseError && (
                      <p className="text-xs text-red-700 font-semibold flex items-center gap-1">
                        ⚠️ {docInUseError}
                      </p>
                    )}
                    {!docInUseError && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-red-700 font-medium">Delete <strong>{doc.name}</strong>? This cannot be undone.</p>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => { setConfirmDel(null); setDocInUseError(null) }} className="text-xs px-3 py-1.5 rounded-lg border border-brown-200 bg-white text-brown-600 hover:bg-brown-50 transition-colors">Cancel</button>
                          <button onClick={() => {
                            const inUse = state.tasks.some(t => (t.supportingDocs ?? []).includes(doc.id))
                            if (inUse) {
                              setDocInUseError(`"${doc.name}" is currently attached to one or more tasks and cannot be deleted.`)
                              return
                            }
                            dispatch({ type: 'REMOVE_DOCUMENT', payload: { id: doc.id } })
                            setConfirmDel(null)
                            setDocInUseError(null)
                          }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center gap-1">
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                    {docInUseError && (
                      <button onClick={() => { setConfirmDel(null); setDocInUseError(null) }} className="text-xs px-3 py-1.5 rounded-lg border border-brown-200 bg-white text-brown-600 hover:bg-brown-50 transition-colors">
                        Dismiss
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {viewingDoc && <PDFViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  )
}

// ─── ScheduleSection ──────────────────────────────────────────────────────────

function ScheduleSection({ myMentees, meetings, setMeetings }: {
  myMentees: Employee[]
  meetings: Meeting[]
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>
}) {
  const [showModal,    setShowModal]    = useState(false)
  const [filterMentee, setFilterMentee] = useState<string>('all')

  const typeBadge: Record<string, string> = {
    '1:1':      'bg-blue-100 text-blue-700 border-blue-200',
    'check-in': 'bg-teal-100 text-teal-700 border-teal-200',
    'review':   'bg-purple-100 text-purple-700 border-purple-200',
  }

  const sorted   = [...meetings].filter(m => filterMentee === 'all' || m.menteeId === filterMentee).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const upcoming = sorted.filter(m => m.date >= dayOffset(0))
  const past     = sorted.filter(m => m.date <  dayOffset(0))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-brown-900 flex items-center gap-2"><Calendar size={20} className="text-teal-600" /> Schedule</h2>
        <div className="flex items-center gap-2">
          <select value={filterMentee} onChange={e => setFilterMentee(e.target.value)} className="border border-brown-200 rounded-xl px-3 py-2 text-xs text-brown-700 bg-white focus:outline-none">
            <option value="all">All Mentees</option>
            {myMentees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={15} /> Add Meeting
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-brown-700 text-sm uppercase tracking-wide">Upcoming ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <div className="card text-center py-10 text-brown-400">
            <Calendar size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No upcoming meetings</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-teal-600 font-semibold underline underline-offset-2">Schedule one now</button>
          </div>
        ) : (
          upcoming.map(mtg => {
            const mentee = myMentees.find(m => m.id === mtg.menteeId)
            return (
              <div key={mtg.id} className="card flex items-center gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: mentee?.color ?? '#0D9488' }}>{mentee?.initials ?? '?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brown-900">{mtg.title}</p>
                  <p className="text-xs text-brown-500">{mentee?.name ?? 'Unknown'} · {fmtDate(mtg.date)} at {mtg.time}</p>
                  {mtg.notes && <p className="text-xs text-brown-400 mt-0.5 line-clamp-1">{mtg.notes}</p>}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${typeBadge[mtg.type]}`}>{mtg.type}</span>
                <button onClick={() => setMeetings(prev => prev.filter(x => x.id !== mtg.id))} className="p-1.5 rounded-lg text-brown-300 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            )
          })
        )}
      </div>

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-brown-400 text-sm uppercase tracking-wide">Past ({past.length})</h3>
          {past.map(mtg => {
            const mentee = myMentees.find(m => m.id === mtg.menteeId)
            return (
              <div key={mtg.id} className="card flex items-center gap-4 flex-wrap opacity-60">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: mentee?.color ?? '#0D9488' }}>{mentee?.initials ?? '?'}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-brown-900">{mtg.title}</p><p className="text-xs text-brown-500">{mentee?.name ?? 'Unknown'} · {fmtDate(mtg.date)} at {mtg.time}</p></div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-brown-100 text-brown-500 border-brown-200 flex-shrink-0">{mtg.type}</span>
                <button onClick={() => setMeetings(prev => prev.filter(x => x.id !== mtg.id))} className="p-1.5 rounded-lg text-brown-300 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <ScheduleMeetingModal preselectedMentee={null} mentees={myMentees} onClose={() => setShowModal(false)} onSave={m => setMeetings(prev => [...prev, m])} />}
    </div>
  )
}

// ─── SettingsSection ──────────────────────────────────────────────────────────

interface DayAvailability {
  day: string
  enabled: boolean
  start: string
  end: string
}

const DEFAULT_AVAILABILITY: DayAvailability[] = [
  { day: 'Monday',    enabled: true,  start: '10:00', end: '17:00' },
  { day: 'Tuesday',   enabled: true,  start: '10:00', end: '17:00' },
  { day: 'Wednesday', enabled: true,  start: '10:00', end: '17:00' },
  { day: 'Thursday',  enabled: false, start: '09:00', end: '17:00' },
  { day: 'Friday',    enabled: false, start: '09:00', end: '17:00' },
]

function SettingsSection({ currentMentor }: { currentMentor: typeof initialMentors[0] }) {
  const [notifNewMentee, setNotifNewMentee] = useState(true)
  const [notifTask,      setNotifTask]      = useState(true)
  const [notifProgress,  setNotifProgress]  = useState(false)
  const [editMode,       setEditMode]       = useState(false)
  const [editAvail,      setEditAvail]      = useState(false)
  const [displayName,    setDisplayName]    = useState(currentMentor.name)
  const [availability,   setAvailability]   = useState<DayAvailability[]>(DEFAULT_AVAILABILITY)
  const [savedProfile,   setSavedProfile]   = useState(false)
  const [savedAvail,     setSavedAvail]     = useState(false)

  const saveProfile = () => { setEditMode(false); setSavedProfile(true); setTimeout(() => setSavedProfile(false), 2500) }
  const saveAvail   = () => { setEditAvail(false); setSavedAvail(true); setTimeout(() => setSavedAvail(false), 2500) }

  const toggleDay = (i: number) =>
    setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, enabled: !d.enabled } : d))

  const updateTime = (i: number, field: 'start' | 'end', val: string) =>
    setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d))

  const fmt12 = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const Toggle = ({ on, setOn }: { on: boolean; setOn: (v: boolean) => void }) => (
    <button onClick={() => setOn(!on)} className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${on ? 'bg-teal-500' : 'bg-brown-200'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`} />
    </button>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-xl font-bold text-brown-900 flex items-center gap-2"><Settings size={20} className="text-teal-600" /> Settings</h2>
      {savedProfile && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium"><CheckCircle size={16} /> Profile saved successfully</div>}
      {savedAvail   && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium"><CheckCircle size={16} /> Availability saved successfully</div>}

      {/* Profile */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-brown-900 flex items-center gap-2"><Star size={16} className="text-teal-500" /> Profile</h3>
          <button onClick={() => editMode ? saveProfile() : setEditMode(true)} className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            {editMode ? <><Save size={13} /> Save</> : <><Edit3 size={13} /> Edit</>}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0" style={{ background: currentMentor.color }}>{currentMentor.initials}</div>
          <div className="flex-1 space-y-2">
            {editMode ? <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full border border-brown-200 rounded-xl px-3 py-2 text-sm text-brown-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
              : <p className="font-semibold text-brown-900">{displayName}</p>}
            <p className="text-sm text-brown-500">{currentMentor.specialty}</p>
            <p className="text-xs text-brown-400">{currentMentor.department} Department</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card space-y-4">
        <h3 className="font-bold text-brown-900 flex items-center gap-2"><Bell size={16} className="text-teal-500" /> Notifications</h3>
        {[
          { label: 'New mentee assigned',   sub: 'Get notified when a new employee is assigned to you', on: notifNewMentee, set: setNotifNewMentee },
          { label: 'Task updates',          sub: 'Notify when mentees complete or update tasks',        on: notifTask,      set: setNotifTask      },
          { label: 'Weekly progress digest',sub: 'Receive a summary of your mentees each week',         on: notifProgress,  set: setNotifProgress  },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-semibold text-brown-900">{row.label}</p><p className="text-xs text-brown-400 mt-0.5">{row.sub}</p></div>
            <Toggle on={row.on} setOn={row.set} />
          </div>
        ))}
      </div>

      {/* Availability — editable */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-brown-900 flex items-center gap-2"><Clock size={16} className="text-teal-500" /> Availability</h3>
          <button onClick={() => editAvail ? saveAvail() : setEditAvail(true)} className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            {editAvail ? <><Save size={13} /> Save</> : <><Edit3 size={13} /> Edit</>}
          </button>
        </div>
        <div className="space-y-2">
          {availability.map((d, i) => (
            <div key={d.day} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${d.enabled ? 'bg-teal-50 border-teal-200' : 'bg-brown-50 border-brown-200'}`}>
              {/* Day toggle (only in edit mode) */}
              {editAvail ? (
                <button onClick={() => toggleDay(i)} className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${d.enabled ? 'bg-teal-500' : 'bg-brown-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${d.enabled ? 'left-[calc(100%-1.125rem)]' : 'left-0.5'}`} />
                </button>
              ) : (
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.enabled ? 'bg-teal-500' : 'bg-brown-300'}`} />
              )}
              <span className="text-sm font-semibold text-brown-900 w-24 flex-shrink-0">{d.day}</span>
              {d.enabled ? (
                editAvail ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={d.start} onChange={e => updateTime(i, 'start', e.target.value)}
                      className="border border-teal-200 rounded-lg px-2 py-1 text-xs text-brown-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-28" />
                    <span className="text-xs text-brown-400">to</span>
                    <input type="time" value={d.end} onChange={e => updateTime(i, 'end', e.target.value)}
                      className="border border-teal-200 rounded-lg px-2 py-1 text-xs text-brown-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-28" />
                  </div>
                ) : (
                  <span className="text-xs text-teal-700 font-medium">{fmt12(d.start)} – {fmt12(d.end)}</span>
                )
              ) : (
                <span className="text-xs text-brown-400 italic">Not available</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-brown-400">Availability is shown to your mentees when scheduling meetings.</p>
      </div>
    </div>
  )
}

// ─── Main MentorDashboard ─────────────────────────────────────────────────────

export default function MentorDashboard({
  activeSection,
  mentorId: propMentorId,
}: {
  activeSection: string
  mentorId?: string
}) {
  const { state }     = useApp()
  // Use URL mentorId as fallback for the brief render before SET_ROLE fires on reload
  const effectiveId   = state.currentUserId || propMentorId || ''
  const currentMentor = initialMentors.find(m => m.id === effectiveId) ?? initialMentors[0]
  const myMentees     = state.employees.filter(e => e.mentorId === currentMentor.id)

  // Shared modal state
  const [selectedEmployee,  setSelectedEmployee]  = useState<Employee | null>(null)
  const [showResumeChat,    setShowResumeChat]    = useState(false)
  const [aiMentee,          setAiMentee]          = useState<Employee | null>(null)
  const [scheduleMentee,    setScheduleMentee]    = useState<Employee | null>(null)
  const [showSchedModal,    setShowSchedModal]    = useState(false)
  const [createTaskMentee,  setCreateTaskMentee]  = useState<Employee | null>(null)

  const [meetings, setMeetings] = useState<Meeting[]>(() =>
    myMentees.slice(0, 3).flatMap((m, i) => [
      { id: `mtg-init-${i}a`, menteeId: m.id, title: 'Weekly 1:1',  date: dayOffset(i + 1), time: '10:00', type: '1:1'      as const, notes: '' },
      { id: `mtg-init-${i}b`, menteeId: m.id, title: 'Check-in',    date: dayOffset(i + 7), time: '14:00', type: 'check-in' as const, notes: 'Review onboarding progress' },
    ])
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'mentees':
        return <MenteesSection myMentees={myMentees} />
      case 'docs':
        return <DocumentsSection currentMentorId={currentMentor.id} />
      case 'schedule':
        return <ScheduleSection myMentees={myMentees} meetings={meetings} setMeetings={setMeetings} />
      case 'settings':
        return <SettingsSection currentMentor={currentMentor} />
      default:
        return (
          <OverviewSection
            myMentees={myMentees}
            currentMentor={currentMentor}
            meetings={meetings}
            onDetailClick={m => setSelectedEmployee(m)}
            onScheduleClick={m => { setScheduleMentee(m); setShowSchedModal(true) }}
            onCreateTaskClick={m => setCreateTaskMentee(m)}
          />
        )
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F7FF' }}>
      {renderSection()}

      {/* Employee detail — same as HR/Admin */}
      {selectedEmployee && <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}

      {/* Create Task modal — same as the button inside EmployeeDetailModal */}
      {createTaskMentee && (
        <CreateTaskModal
          employee={createTaskMentee}
          assignedBy="mentor"
          assignedByName={currentMentor.name}
          onClose={() => setCreateTaskMentee(null)}
        />
      )}

      {/* Schedule meeting */}
      {showSchedModal && (
        <ScheduleMeetingModal
          preselectedMentee={scheduleMentee}
          mentees={myMentees}
          onClose={() => { setShowSchedModal(false); setScheduleMentee(null) }}
          onSave={m => setMeetings(prev => [...prev, m])}
        />
      )}

      {/* AI task builder from Resume */}
      {showResumeChat && aiMentee && (
        <ResumeAIChat
          employee={aiMentee}
          mentorName={currentMentor.name}
          onClose={() => { setShowResumeChat(false); setAiMentee(null) }}
        />
      )}
    </div>
  )
}
