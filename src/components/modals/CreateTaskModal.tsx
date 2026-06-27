import { useState, useRef, useEffect } from 'react'
import {
  X, Plus, Trash2, Bot, Send, CheckCircle, Sparkles,
  Link2, FileText, AlertCircle, ChevronDown, ChevronUp, Loader2,
  ArrowUp, ArrowDown, GripVertical, User, RotateCcw, FlaskConical, Upload
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Employee, Task, SubTask, SupportingLink, Document } from '../../context/AppContext'
import type { SuggestedTask } from '../../services/aiService'

// ─── Backend agent URL ────────────────────────────────────────────────────────
const AGENT_API_URL = ''

// ─── Local types ──────────────────────────────────────────────────────────────
interface TaskChatMessage {
  role: 'user' | 'agent'
  content: string
  tasks?: SuggestedTask[]
}

/** Map a backend Task object to SuggestedTask shape used in the UI pool */
const backendTaskToSuggested = (t: any): SuggestedTask => ({
  title:         t.title        ?? '',
  description:   t.description  ?? '',
  category:      t.category     ?? 'General',
  estimatedTime: t.estimatedTime ?? '30 min',
  priority:      t.priority     ?? 'medium',
  subtasks: (t.subtasks ?? []).map((st: any) => ({
    title: typeof st === 'string' ? st : (st.title ?? ''),
  })),
  requiresInput: t.requiresInput ?? false,
  inputPrompt:   t.inputPrompt   ?? '',
})

interface Props {
  employee: Employee
  onClose: () => void
  /** Who is creating the task — defaults to 'admin' */
  assignedBy?: 'admin' | 'hr' | 'mentor'
  /** Display name of the creator — defaults to 'Admin' */
  assignedByName?: string
}

const CATEGORIES = ['Setup', 'Learning', 'Technical', 'Compliance', 'People', 'Tools', 'Admin', 'General']
const EST_TIMES = [
  '15 min', '30 min', '45 min',
  '1 hour', '1.5 hours', '2 hours', '3 hours', '4 hours',
  'Half day', 'Full day', '2 days', '3 days', '1 week',
]
const PRIORITIES: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'high',   label: 'High',   color: 'text-red-600 bg-red-50 border-red-200'    },
  { value: 'medium', label: 'Medium', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'low',    label: 'Low',    color: 'text-green-600 bg-green-50 border-green-200' },
]

type Mode = 'manual' | 'ai'

// ─── Manual form state ─────────────────────────────────────────────────────────
interface ManualForm {
  title: string
  description: string
  category: string
  estimatedTime: string
  priority: Task['priority']
  subtasks: string[]
  supportingDocIds: string[]
  supportingLinks: { label: string; url: string }[]
  requiresInput: boolean
  inputPrompt: string
  playgroundEnabled: boolean
  playgroundType: 'engineering' | 'marketing' | 'leadership' | 'sales' | 'hr-operations' | 'product-strategy'
}

function emptyForm(): ManualForm {
  return {
    title: '', description: '', category: 'General', estimatedTime: '30 min',
    priority: 'medium', subtasks: [], supportingDocIds: [],
    supportingLinks: [], requiresInput: false, inputPrompt: '',
    playgroundEnabled: false, playgroundType: 'engineering',
  }
}

export default function CreateTaskModal({ employee, onClose, assignedBy = 'admin', assignedByName = 'Admin' }: Props) {
  const { state, dispatch } = useApp()
  const [mode, setMode] = useState<Mode>('manual')

  // ── Manual state ──
  const [form, setForm]           = useState<ManualForm>(emptyForm())
  const [newSubtask, setNewSubtask]       = useState('')
  const [newLinkLabel, setNewLinkLabel]   = useState('')
  const [newLinkUrl, setNewLinkUrl]       = useState('')
  const [formError, setFormError]         = useState('')
  const [fieldErrors, setFieldErrors]     = useState<{ title?: string; description?: string; inputPrompt?: string }>({})
  const docUploadRef = useRef<HTMLInputElement>(null)

  // Determine the uploaderID for the current creator to scope visible documents
  const uploaderId = assignedBy === 'mentor' ? (state.currentUserId ?? assignedBy) : assignedBy
  const myDocs     = state.documents.filter(d => d.uploadedBy === uploaderId)

  // Inline document upload — reads file as base64, creates a doc, dispatches it, and auto-selects it
  const handleInlineDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const docId = `doc-${Date.now()}`
    const reader = new FileReader()
    reader.onload = () => {
      const newDoc: Document = {
        id:         docId,
        name:       file.name,
        type:       file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
        size:       `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status:     'processed',
        uploadedBy: uploaderId ?? assignedBy,
        date:       new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        content:    `Document: ${file.name}.`,
        fileData:   reader.result as string,
      }
      dispatch({ type: 'ADD_DOCUMENT', payload: newDoc })
      setForm(f => ({ ...f, supportingDocIds: [...f.supportingDocIds, docId] }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── AI playground state (for AI mode — mirrors manual form's flag) ──
  const [aiPlayground,     setAiPlayground]     = useState(false)
  const [aiPlaygroundType, setAiPlaygroundType] = useState<'engineering' | 'marketing' | 'leadership' | 'sales' | 'hr-operations' | 'product-strategy'>('engineering')

  // ── AI chat state ──
  const [chatInput,      setChatInput]      = useState('')
  const [chatHistory,    setChatHistory]    = useState<TaskChatMessage[]>([])
  const [chatLoading,    setChatLoading]    = useState(false)
  const [chatError,      setChatError]      = useState('')
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [taskPool,       setTaskPool]       = useState<SuggestedTask[]>([])  // all tasks surfaced across messages
  const [expandedTask,   setExpandedTask]   = useState<Record<number, boolean>>({})
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // ── Manual helpers ──
  const addSubtask = () => {
    if (!newSubtask.trim()) return
    setForm(f => ({ ...f, subtasks: [...f.subtasks, newSubtask.trim()] }))
    setNewSubtask('')
  }

  const removeSubtask = (i: number) =>
    setForm(f => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }))

  const addLink = () => {
    if (!newLinkUrl.trim()) return
    setForm(f => ({ ...f, supportingLinks: [...f.supportingLinks, { label: newLinkLabel.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }] }))
    setNewLinkLabel(''); setNewLinkUrl('')
  }

  const removeLink = (i: number) =>
    setForm(f => ({ ...f, supportingLinks: f.supportingLinks.filter((_, idx) => idx !== i) }))

  const toggleDoc = (id: string) =>
    setForm(f => ({
      ...f,
      supportingDocIds: f.supportingDocIds.includes(id)
        ? f.supportingDocIds.filter(d => d !== id)
        : [...f.supportingDocIds, id],
    }))

  const submitManual = () => {
    const errs: typeof fieldErrors = {}
    if (!form.title.trim())       errs.title       = 'Task title is required.'
    if (!form.description.trim()) errs.description  = 'Description is required.'
    if (form.requiresInput && !form.inputPrompt.trim()) errs.inputPrompt = 'Input prompt is required when employee input is enabled.'

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setFormError('Please fill in all required fields before submitting.')
      return
    }
    setFieldErrors({})
    setFormError('')

    const task: Task = {
      id: `task-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      estimatedTime: form.estimatedTime.trim() || '30 min',
      priority: form.priority,
      assignedTo: employee.id,
      assignedBy,
      assignedByName,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
      subtasks: form.subtasks.map((t, i) => ({ id: `st-${Date.now()}-${i}`, title: t, status: 'pending' })),
      supportingDocs: form.supportingDocIds,
      supportingLinks: form.supportingLinks,
      requiresInput: form.requiresInput,
      inputPrompt: form.requiresInput ? form.inputPrompt.trim() : undefined,
      playgroundEnabled: assignedBy === 'mentor' ? form.playgroundEnabled : undefined,
      playgroundType:    assignedBy === 'mentor' && form.playgroundEnabled ? form.playgroundType : undefined,
    }
    dispatch({ type: 'ADD_TASK', payload: task })
    onClose()
  }

  // ── Reset chat state whenever the modal opens for a new employee ──
  useEffect(() => {
    setChatHistory([])
    setTaskPool([])
    setChatError('')
    setChatInput('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id])

  // ── AI chat helpers ──
  const toggleContextDoc = (id: string) =>
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, chatLoading])

  const buildDocContext = () => {
    const ctxDocs = selectedDocIds.length > 0
      ? state.documents.filter(d => selectedDocIds.includes(d.id))
      : state.documents.slice(0, 2)
    return ctxDocs.map(d => d.content).join(' ')
  }

  const sendChat = async (text?: string) => {
    const msg = (text ?? chatInput).trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatError('')
    const userMsg: TaskChatMessage = { role: 'user', content: msg }
    setChatHistory(prev => [...prev, userMsg])
    setChatLoading(true)
    try {
      let agentContent: string
      let newTasks: SuggestedTask[] = []

      if (taskPool.length === 0) {
        // ── First message → generate fresh tasks ──────────────────────────────
        const res = await fetch(`${AGENT_API_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person_info: {
              id:            employee.id,
              name:          employee.name,
              role:          employee.role,
              team:          employee.team,
              email:         employee.email ?? '',
              startDate:     employee.startDate ?? '',
              resumeContent: employee.resumeContent ?? '',
              bio:           employee.bio ?? '',
            },
            prompt:           msg,
            assigned_by:      assignedBy,
            assigned_by_name: assignedByName,
          }),
        })
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()
        newTasks = (data.tasks ?? []).map(backendTaskToSuggested)
        agentContent = data.message
          || `I've generated ${newTasks.length} task${newTasks.length !== 1 ? 's' : ''} for ${employee.name}. Review them below — use the chat to refine any time!`
      } else {
        // ── Follow-up message → refine current task pool ──────────────────────
        const res = await fetch(`${AGENT_API_URL}/api/refine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_tasks:    taskPool,
            instruction:      msg,
            person_info: {
              id:        employee.id,
              name:      employee.name,
              role:      employee.role,
              team:      employee.team,
              email:     employee.email ?? '',
              startDate: employee.startDate ?? '',
            },
            assigned_by:      assignedBy,
            assigned_by_name: assignedByName,
          }),
        })
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()
        newTasks = (data.tasks ?? []).map(backendTaskToSuggested)
        agentContent = data.message
          ?? (data.changes_summary ? `Changes applied: ${data.changes_summary}` : `Updated to ${newTasks.length} task${newTasks.length !== 1 ? 's' : ''}.`)
      }

      const reply: TaskChatMessage = {
        role: 'agent',
        content: agentContent,
        tasks: newTasks.length > 0 ? newTasks : undefined,
      }
      setChatHistory(prev => [...prev, reply])
      if (newTasks.length > 0) {
        setTaskPool(newTasks)
        setExpandedTask(Object.fromEntries(newTasks.map((_, i) => [i, false])))
      }
    } catch {
      setChatError('Agent failed to respond. Please try again.')
    }
    setChatLoading(false)
  }

  const clearChat = () => {
    setChatHistory([])
    setTaskPool([])
    setChatError('')
    setChatInput('')
  }

  const moveSuggestion = (idx: number, dir: 'up' | 'down') => {
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= taskPool.length) return
    setTaskPool(prev => { const n = [...prev]; [n[idx], n[swap]] = [n[swap], n[idx]]; return n })
  }

  const removeSuggestion = (idx: number) =>
    setTaskPool(prev => prev.filter((_, i) => i !== idx))

  const assignSuggestion = (s: SuggestedTask, order: number) => {
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: s.title,
      description: s.description,
      category: s.category,
      estimatedTime: s.estimatedTime,
      priority: s.priority,
      assignedTo: employee.id,
      assignedBy,
      assignedByName,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
      order,
      subtasks: (s.subtasks ?? []).map((st, i) => ({ id: `st-${Date.now()}-${i}`, title: st.title, status: 'pending' as const })),
      requiresInput: s.requiresInput,
      inputPrompt: s.requiresInput ? s.inputPrompt : undefined,
      playgroundEnabled: assignedBy === 'mentor' ? aiPlayground : undefined,
      playgroundType:    assignedBy === 'mentor' && aiPlayground ? aiPlaygroundType : undefined,
    }
    dispatch({ type: 'ADD_TASK', payload: task })
  }

  const assignOneSuggestion = (idx: number) => {
    assignSuggestion(taskPool[idx], Date.now() + idx)
    setTaskPool(prev => prev.filter((_, i) => i !== idx))
  }

  const assignAllSuggestions = () => {
    taskPool.forEach((s, i) => assignSuggestion(s, Date.now() + i))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: employee.color }}
            >
              {employee.initials}
            </div>
            <div>
              <h2 className="font-bold text-brown-900 text-base">Create Task</h2>
              <p className="text-xs text-brown-500">For {employee.name} · {employee.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Mode tabs ── */}
        <div className="flex border-b border-brown-100 flex-shrink-0">
          {([['manual', 'Manual'], ['ai', 'AI Assisted']] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                mode === m
                  ? 'border-b-2 border-brown-600 text-brown-900'
                  : 'text-brown-400 hover:text-brown-600'
              }`}
            >
              {m === 'ai' && <Sparkles size={14} />}
              {label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ──────── MANUAL MODE ──────── */}
          {mode === 'manual' && (
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Task Title *</label>
                <input
                  type="text" value={form.title}
                  onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFieldErrors(fe => ({ ...fe, title: undefined })); setFormError('') }}
                  placeholder="e.g. Complete security training"
                  className={`input-field text-sm py-2.5 ${fieldErrors.title ? 'border-red-400 focus:ring-red-300' : ''}`}
                />
                {fieldErrors.title && (
                  <p className="flex items-center gap-1 text-xs text-red-600 mt-1"><AlertCircle size={11} />{fieldErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setFieldErrors(fe => ({ ...fe, description: undefined })); setFormError('') }}
                  placeholder="What should the employee do and why?"
                  rows={3}
                  className={`input-field text-sm py-2.5 resize-none ${fieldErrors.description ? 'border-red-400 focus:ring-red-300' : ''}`}
                />
                {fieldErrors.description && (
                  <p className="flex items-center gap-1 text-xs text-red-600 mt-1"><AlertCircle size={11} />{fieldErrors.description}</p>
                )}
              </div>

              {/* Category + Time + Priority */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brown-600 mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field text-sm py-2.5">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brown-600 mb-1.5">Est. Time</label>
                  <select value={form.estimatedTime} onChange={e => setForm(f => ({ ...f, estimatedTime: e.target.value }))} className="input-field text-sm py-2.5">
                    {EST_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brown-600 mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))} className="input-field text-sm py-2.5">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-2">Subtasks <span className="text-brown-400 font-normal">(optional)</span></label>
                <div className="space-y-1.5 mb-2">
                  {form.subtasks.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 bg-brown-50 rounded-lg px-3 py-2 border border-brown-100">
                      <CheckCircle size={13} className="text-brown-400 flex-shrink-0" />
                      <span className="text-sm text-brown-700 flex-1">{st}</span>
                      <button onClick={() => removeSubtask(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="Add a subtask…"
                    className="input-field text-sm py-2 flex-1"
                  />
                  <button onClick={addSubtask} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1"><Plus size={14} />Add</button>
                </div>
              </div>

              {/* Supporting Docs — only current user's uploads + inline upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-brown-600">
                    Supporting Documents <span className="text-brown-400 font-normal">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => docUploadRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Upload size={11} /> Upload &amp; Attach
                  </button>
                  <input ref={docUploadRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg" onChange={handleInlineDocUpload} />
                </div>
                {myDocs.length === 0 ? (
                  <div className="border border-dashed border-brown-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-brown-400">No documents yet. Upload one above to attach it.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {myDocs.map(doc => (
                      <label key={doc.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${form.supportingDocIds.includes(doc.id) ? 'border-brown-400 bg-brown-50' : 'border-brown-100 hover:border-brown-200'}`}>
                        <input type="checkbox" checked={form.supportingDocIds.includes(doc.id)} onChange={() => toggleDoc(doc.id)} className="accent-brown-600" />
                        <FileText size={13} className="text-red-500 flex-shrink-0" />
                        <span className="text-sm text-brown-700 truncate flex-1">{doc.name}</span>
                        <span className="text-xs text-brown-400">{doc.type}</span>
                        {form.supportingDocIds.includes(doc.id) && (
                          <span className="text-[10px] font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Attached</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Supporting Links */}
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-2">Supporting Links <span className="text-brown-400 font-normal">(optional)</span></label>
                <div className="space-y-1.5 mb-2">
                  {form.supportingLinks.map((lnk, i) => (
                    <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <Link2 size={13} className="text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-blue-700 flex-1 truncate">{lnk.label}</span>
                      <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} placeholder="Label (optional)" className="input-field text-sm py-2 w-32 flex-shrink-0" />
                  <input type="text" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="https://…" className="input-field text-sm py-2 flex-1" />
                  <button onClick={addLink} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1"><Plus size={14} />Add</button>
                </div>
              </div>

              {/* Requires Input */}
              <div className="bg-brown-50 border border-brown-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <div
                    onClick={() => setForm(f => ({ ...f, requiresInput: !f.requiresInput }))}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${form.requiresInput ? 'bg-brown-600' : 'bg-brown-200'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.requiresInput ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brown-800">Requires Employee Input</p>
                    <p className="text-xs text-brown-500">Employee must submit a written response to complete this task</p>
                  </div>
                </label>
                {form.requiresInput && (
                  <div>
                    <label className="block text-xs font-semibold text-brown-600 mb-1.5">Input Prompt *</label>
                    <textarea
                      value={form.inputPrompt}
                      onChange={e => { setForm(f => ({ ...f, inputPrompt: e.target.value })); setFieldErrors(fe => ({ ...fe, inputPrompt: undefined })); setFormError('') }}
                      placeholder="What should the employee write or submit? e.g. 'Describe 3 things you learned…'"
                      rows={2}
                      className={`input-field text-sm py-2 resize-none ${fieldErrors.inputPrompt ? 'border-red-400 focus:ring-red-300' : ''}`}
                    />
                    {fieldErrors.inputPrompt && (
                      <p className="flex items-center gap-1 text-xs text-red-600 mt-1"><AlertCircle size={11} />{fieldErrors.inputPrompt}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Playground toggle + type selector — mentor only */}
              {assignedBy === 'mentor' && (
                <div className={`border rounded-xl p-4 transition-colors ${form.playgroundEnabled ? 'bg-teal-50 border-teal-200' : 'bg-brown-50 border-brown-200'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setForm(f => ({ ...f, playgroundEnabled: !f.playgroundEnabled }))}
                      className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${form.playgroundEnabled ? 'bg-teal-500' : 'bg-brown-200'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.playgroundEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <FlaskConical size={15} className={form.playgroundEnabled ? 'text-teal-600' : 'text-brown-400'} />
                      <div>
                        <p className="text-sm font-semibold text-brown-800">Enable Playground</p>
                        <p className="text-xs text-brown-500">Mentee can try this task freely without it affecting official progress</p>
                      </div>
                    </div>
                  </label>

                  {/* Playground type selector — shown when enabled */}
                  {form.playgroundEnabled && (
                    <div className="mt-3 pt-3 border-t border-teal-200">
                      <p className="text-xs font-semibold text-teal-700 mb-2">Playground Type</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'engineering',       label: 'Engineering',        icon: '💻', enabled: true  },
                          { value: 'sales',             label: 'Sales',              icon: '💰', enabled: true  },
                          { value: 'marketing',         label: 'Marketing',          icon: '📣', enabled: false },
                          { value: 'leadership',        label: 'Leadership',         icon: '👑', enabled: false },
                          { value: 'hr-operations',     label: 'HR & Operations',    icon: '👥', enabled: false },
                          { value: 'product-strategy',  label: 'Product & Strategy', icon: '🧭', enabled: false },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={!opt.enabled}
                            onClick={() => opt.enabled && setForm(f => ({ ...f, playgroundType: opt.value as NonNullable<Task['playgroundType']> }))}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                              !opt.enabled
                                ? 'opacity-40 cursor-not-allowed bg-white border-brown-200 text-brown-400'
                                : form.playgroundType === opt.value
                                ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                                : 'bg-white border-teal-200 text-teal-700 hover:bg-teal-50'
                            }`}
                          >
                            <span>{opt.icon}</span>
                            <span className="truncate">{opt.label}</span>
                            {!opt.enabled && <span className="ml-auto text-[9px] text-brown-400 flex-shrink-0">Soon</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} />
                  {formError}
                </div>
              )}
            </div>
          )}

          {/* ──────── AI ASSISTED MODE ──────── */}
          {mode === 'ai' && (
            <div className="flex flex-col h-full" style={{ minHeight: 0 }}>

              {/* ── Playground toggle + type selector for AI mode — mentor only ── */}
              {assignedBy === 'mentor' && (
                <div className={`px-4 pt-3 pb-3 border-b flex-shrink-0 transition-colors ${aiPlayground ? 'bg-teal-50 border-teal-200' : 'bg-brown-50/60 border-brown-100'}`}>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setAiPlayground(v => !v)}
                      className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${aiPlayground ? 'bg-teal-500' : 'bg-brown-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiPlayground ? 'translate-x-[calc(100%-0.25rem)]' : 'translate-x-0.5'}`} />
                    </div>
                    <FlaskConical size={13} className={aiPlayground ? 'text-teal-600' : 'text-brown-400'} />
                    <span className={`text-xs font-semibold ${aiPlayground ? 'text-teal-700' : 'text-brown-500'}`}>
                      Playground {aiPlayground ? 'enabled' : 'disabled'} — assigned tasks won't affect official progress
                    </span>
                  </div>

                  {/* Type selector — shown when playground is enabled */}
                  {aiPlayground && (
                    <div className="mt-2.5 pt-2.5 border-t border-teal-200">
                      <p className="text-[10px] font-semibold text-teal-700 mb-1.5">Playground Type</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { value: 'engineering',       label: 'Engineering',        icon: '💻', enabled: true  },
                          { value: 'sales',             label: 'Sales',              icon: '💰', enabled: true  },
                          { value: 'marketing',         label: 'Marketing',          icon: '📣', enabled: false },
                          { value: 'leadership',        label: 'Leadership',         icon: '👑', enabled: false },
                          { value: 'hr-operations',     label: 'HR & Ops',           icon: '👥', enabled: false },
                          { value: 'product-strategy',  label: 'Product',            icon: '🧭', enabled: false },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={!opt.enabled}
                            onClick={() => opt.enabled && setAiPlaygroundType(opt.value as NonNullable<Task['playgroundType']>)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                              !opt.enabled
                                ? 'opacity-40 cursor-not-allowed bg-white border-brown-200 text-brown-400'
                                : aiPlaygroundType === opt.value
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'bg-white border-teal-200 text-teal-700 hover:bg-teal-50'
                            }`}
                          >
                            <span>{opt.icon}</span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Document context bar (collapsible top strip) ── */}
              {state.documents.length > 0 && (
                <div className="px-4 pt-3 pb-2 border-b border-brown-100 bg-brown-50/60 flex-shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-brown-500 flex items-center gap-1"><FileText size={11} />Context docs:</span>
                    {state.documents.map(doc => (
                      <label key={doc.id} className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${selectedDocIds.includes(doc.id) ? 'bg-brown-700 text-white border-brown-700' : 'bg-white text-brown-500 border-brown-200 hover:border-brown-400'}`}>
                        <input type="checkbox" checked={selectedDocIds.includes(doc.id)} onChange={() => toggleContextDoc(doc.id)} className="hidden" />
                        {doc.name.slice(0, 18)}{doc.name.length > 18 ? '…' : ''}
                      </label>
                    ))}
                    {selectedDocIds.length === 0 && <span className="text-xs text-brown-400 italic">none selected — using general context</span>}
                  </div>
                </div>
              )}

              {/* ── Chat message area ── */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0, maxHeight: '320px' }}>
                {/* Welcome state */}
                {chatHistory.length === 0 && (
                  <div className="space-y-4">
                    <div className="flex gap-2.5 items-start">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brown-600 to-brown-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot size={13} className="text-white" />
                      </div>
                      <div className="bg-brown-50 border border-brown-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[88%]">
                        <p className="text-xs text-brown-700 leading-relaxed">
                          Hi! I'm the onboarding agent. Tell me what tasks to create for <strong>{employee.name}</strong> ({employee.role}) and I'll generate a structured list. You can ask me to refine, add more, or change priorities at any time.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-9">
                      {[
                        `Day 1 setup tasks for a ${employee.role}`,
                        'Create a compliance checklist',
                        `3 high-priority tasks for ${employee.team} onboarding`,
                        'Tools & access setup tasks',
                      ].map(p => (
                        <button key={p} onClick={() => sendChat(p)} className="text-xs bg-white text-brown-600 border border-brown-200 px-3 py-1.5 rounded-full hover:bg-brown-50 hover:border-brown-400 transition-colors">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'agent' ? 'bg-gradient-to-br from-brown-600 to-brown-900' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                      {msg.role === 'agent' ? <Bot size={13} className="text-white" /> : <User size={13} className="text-white" />}
                    </div>
                    <div className={`max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-brown-700 text-white rounded-tr-sm' : 'bg-brown-50 border border-brown-100 text-brown-700 rounded-tl-sm'}`}>
                        {/* Strip JSON array from displayed text */}
                        {msg.content.replace(/\[[\s\S]*?\]/, '').trim() || (msg.tasks ? 'Here are the suggested tasks:' : msg.content)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {chatLoading && (
                  <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brown-600 to-brown-900 flex items-center justify-center flex-shrink-0">
                      <Bot size={13} className="text-white" />
                    </div>
                    <div className="bg-brown-50 border border-brown-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                      <Loader2 size={12} className="text-brown-400 animate-spin" />
                      <span className="text-xs text-brown-400">Agent is thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* ── Task pool (latest suggestions from agent) ── */}
              {taskPool.length > 0 && (
                <div className="border-t border-brown-100 px-4 py-3 bg-white flex-shrink-0" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-bold text-brown-800 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-brown-500" />
                      {taskPool.length} task{taskPool.length !== 1 ? 's' : ''} suggested — review &amp; assign
                    </p>
                    <button onClick={assignAllSuggestions} className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                      <Plus size={11} /> Assign All
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {taskPool.map((s, i) => (
                      <div key={i}>
                        {/* Task row */}
                        <div className="flex items-center gap-2 border border-brown-100 rounded-xl px-3 py-2 bg-brown-50/40">
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button onClick={() => moveSuggestion(i, 'up')} disabled={i === 0} className="p-0.5 text-brown-300 hover:text-brown-600 disabled:opacity-20"><ArrowUp size={11} /></button>
                            <button onClick={() => moveSuggestion(i, 'down')} disabled={i === taskPool.length - 1} className="p-0.5 text-brown-300 hover:text-brown-600 disabled:opacity-20"><ArrowDown size={11} /></button>
                          </div>
                          <GripVertical size={12} className="text-brown-200 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-brown-400">#{i + 1}</span>
                              <p className="text-xs font-semibold text-brown-800 truncate">{s.title}</p>
                              {s.priority && <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${PRIORITIES.find(p => p.value === s.priority)?.color ?? ''}`}>{s.priority}</span>}
                              {s.requiresInput && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0 flex items-center gap-0.5"><AlertCircle size={9} />Input</span>}
                            </div>
                            <p className="text-xs text-brown-400">{s.category} · {s.estimatedTime}{(s.subtasks?.length ?? 0) > 0 ? ` · ${s.subtasks!.length} subtasks` : ''}</p>
                          </div>
                          <button onClick={() => setExpandedTask(ex => ({ ...ex, [i]: !ex[i] }))} className="p-1 rounded text-brown-300 hover:text-brown-600 flex-shrink-0">
                            {expandedTask[i] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <button onClick={() => removeSuggestion(i)} className="p-1 rounded text-red-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0"><Trash2 size={12} /></button>
                          <button onClick={() => assignOneSuggestion(i)} className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1 flex-shrink-0"><Plus size={11} />Assign</button>
                        </div>
                        {/* Expanded subtask/input detail — rendered inline, directly below this task */}
                        {expandedTask[i] && (
                          <div className="ml-10 mr-2 mt-1 bg-white border border-brown-100 rounded-xl p-3 space-y-2">
                            <p className="text-xs text-brown-600">{s.description}</p>
                            {(s.subtasks?.length ?? 0) > 0 && (
                              <div className="space-y-1">
                                {s.subtasks!.map((st, j) => <div key={j} className="flex items-center gap-1.5 text-xs text-brown-500"><div className="w-2 h-2 rounded-full border-2 border-brown-300 flex-shrink-0" />{st.title}</div>)}
                              </div>
                            )}
                            {s.requiresInput && s.inputPrompt && (
                              <div className="bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                                <p className="text-xs font-semibold text-purple-700 flex items-center gap-1 mb-0.5"><AlertCircle size={10} />Input prompt</p>
                                <p className="text-xs text-purple-600">{s.inputPrompt}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chatError && (
                <div className="mx-4 mb-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex-shrink-0">
                  <AlertCircle size={13} />{chatError}
                </div>
              )}

              {/* ── Chat input ── */}
              <div className="px-4 py-3 border-t border-brown-100 flex gap-2 items-center flex-shrink-0">
                {chatHistory.length > 0 && (
                  <button onClick={clearChat} title="Reset conversation" className="p-2 rounded-lg text-brown-300 hover:text-brown-600 hover:bg-brown-50 transition-colors flex-shrink-0">
                    <RotateCcw size={14} />
                  </button>
                )}
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder={chatHistory.length === 0 ? `Describe tasks for ${employee.name}…` : 'Ask to refine, add more, change priority…'}
                  disabled={chatLoading}
                  className="flex-1 text-xs bg-brown-50 border border-brown-200 rounded-xl px-3 py-2.5 outline-none focus:border-brown-500 transition-colors disabled:opacity-50 text-brown-800 placeholder-brown-400"
                />
                <button
                  onClick={() => sendChat()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-9 h-9 rounded-xl bg-brown-700 hover:bg-brown-900 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  {chatLoading ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-brown-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
          {mode === 'manual' && (
            <button onClick={submitManual} className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
              <Plus size={15} /> Create Task
            </button>
          )}
          {mode === 'ai' && taskPool.length > 0 && (
            <button onClick={assignAllSuggestions} className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
              <Sparkles size={15} /> Assign All ({taskPool.length})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
