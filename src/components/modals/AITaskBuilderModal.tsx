import { useState, useRef, useCallback } from 'react'
import {
  X, Sparkles, Send, Upload, Loader2, CheckCircle2, ChevronDown, ChevronUp,
  Link2, List, Clock, Flag, Cpu, Mail, Trash2, Edit3, Plus, RotateCcw,
  User, FileText, AlertCircle, Check, Zap
} from 'lucide-react'
import type { Task, Employee } from '../../context/AppContext'

// ─── Backend URL ─────────────────────────────────────────────────────────────
const AGENT_API_URL = ''

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  employee: Employee
  assignedBy: 'admin' | 'hr' | 'mentor'
  assignedByName: string
  onConfirm: (tasks: Task[]) => void
  onClose: () => void
}

type Stage = 'prompt' | 'generating' | 'review' | 'refining' | 'confirmed'

const PRIORITY_COLORS: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  Setup:       'bg-blue-100 text-blue-700',
  Learning:    'bg-purple-100 text-purple-700',
  Technical:   'bg-cyan-100 text-cyan-700',
  Compliance:  'bg-red-100 text-red-700',
  People:      'bg-pink-100 text-pink-700',
  Tools:       'bg-orange-100 text-orange-700',
  Admin:       'bg-gray-100 text-gray-700',
  General:     'bg-teal-100 text-teal-700',
}

const QUICK_PROMPTS = [
  'Set up development environment and toolchain',
  'Learn company processes, tools, and culture',
  'Complete compliance and security training',
  'Meet key stakeholders and schedule 1:1s',
  'Understand the product roadmap and strategy',
  'Review codebases and architecture documentation',
]

// ─── Task Preview Card ────────────────────────────────────────────────────────
function TaskPreviewCard({
  task,
  index,
  onRemove,
  onEdit,
}: {
  task: Task
  index: number
  onRemove: () => void
  onEdit: (updates: Partial<Task>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc,  setEditDesc]  = useState(task.description)
  const [editPrio,  setEditPrio]  = useState<'low' | 'medium' | 'high'>(task.priority || 'medium')
  const [editTime,  setEditTime]  = useState(task.estimatedTime)

  const saveEdit = () => {
    onEdit({ title: editTitle, description: editDesc, priority: editPrio as any, estimatedTime: editTime })
    setEditing(false)
  }

  return (
    <div className="border border-brown-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-brown-100 text-brown-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full text-sm font-semibold text-brown-900 border-b border-brown-300 bg-transparent outline-none pb-0.5"
              autoFocus
            />
          ) : (
            <p className="text-sm font-semibold text-brown-900 leading-tight">{task.title}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-700'}`}>
              {task.category}
            </span>
            {editing ? (
              <select
                value={editPrio}
                onChange={e => setEditPrio(e.target.value as 'low' | 'medium' | 'high')}
                className="text-xs border border-brown-200 rounded px-1 py-0.5 bg-white"
              >
                {['low','medium','high'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority || 'medium']}`}>
                {task.priority || 'medium'}
              </span>
            )}
            <span className="text-xs text-brown-400 flex items-center gap-1">
              <Clock size={11} /> {editing ? (
                <input
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  className="w-20 border-b border-brown-300 bg-transparent outline-none"
                />
              ) : task.estimatedTime}
            </span>
            {task.playgroundEnabled && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium flex items-center gap-1">
                {task.playgroundType === 'engineering' ? <Cpu size={11} /> : <Mail size={11} />}
                {task.playgroundType}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={saveEdit} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors" title="Save">
                <Check size={13} />
              </button>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Cancel">
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-400 hover:text-brown-700 transition-colors" title="Edit">
                <Edit3 size={13} />
              </button>
              <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-100 text-brown-400 hover:text-red-600 transition-colors" title="Remove">
                <Trash2 size={13} />
              </button>
              <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-400 transition-colors">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && !editing && (
        <div className="px-4 pb-3 pt-1 border-t border-brown-100 space-y-3 bg-amber-50/40">
          <p className="text-xs text-brown-600 leading-relaxed">{task.description}</p>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-brown-700 mb-1.5 flex items-center gap-1"><List size={12} /> Subtasks</p>
              <div className="space-y-1">
                {task.subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 text-xs text-brown-600">
                    <div className="w-3 h-3 rounded-full border border-brown-300 flex-shrink-0" />
                    {sub.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {task.supportingLinks && task.supportingLinks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-brown-700 mb-1.5 flex items-center gap-1"><Link2 size={12} /> Resources</p>
              <div className="space-y-1">
                {task.supportingLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline truncate">
                    <Link2 size={10} className="flex-shrink-0" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Input Required */}
          {task.requiresInput && task.inputPrompt && (
            <div className="bg-amber-100 rounded-lg p-2">
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Requires Input</p>
              <p className="text-xs text-amber-700">{task.inputPrompt}</p>
            </div>
          )}
        </div>
      )}

      {/* Editing expanded description */}
      {editing && (
        <div className="px-4 pb-3 pt-1 border-t border-brown-100 bg-amber-50/40">
          <p className="text-xs font-medium text-brown-600 mb-1">Description</p>
          <textarea
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            rows={3}
            className="w-full text-xs border border-brown-200 rounded-lg p-2 bg-white outline-none focus:border-brown-400 resize-none"
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function AITaskBuilderModal({ employee, assignedBy, assignedByName, onConfirm, onClose }: Props) {
  const [stage,          setStage]          = useState<Stage>('prompt')
  const [prompt,         setPrompt]         = useState('')
  const [tasks,          setTasks]          = useState<Task[]>([])
  const [refineInput,    setRefineInput]    = useState('')
  const [resumeContent,  setResumeContent]  = useState(employee.resumeContent || '')
  const [resumeFileName, setResumeFileName] = useState(employee.resumeFileName || '')
  const [error,          setError]          = useState<string | null>(null)
  const [agentMessage,   setAgentMessage]   = useState('')
  const [changesNote,    setChangesNote]    = useState('')
  const resumeRef = useRef<HTMLInputElement>(null)

  // ── Generate Tasks ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    setError(null)
    setStage('generating')

    try {
      const res = await fetch(`${AGENT_API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_info: {
            id:            employee.id,
            name:          employee.name,
            role:          employee.role,
            team:          employee.team,
            email:         employee.email,
            startDate:     employee.startDate,
            resumeContent: resumeContent || employee.resumeContent || '',
            bio:           employee.bio || '',
          },
          prompt,
          assigned_by:      assignedBy,
          assigned_by_name: assignedByName,
        }),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setTasks(data.tasks || [])
      setAgentMessage(data.message || '')
      setStage('review')
    } catch (e: any) {
      setError(e.message || 'Failed to generate tasks. Please try again.')
      setStage('prompt')
    }
  }, [prompt, employee, resumeContent, assignedBy, assignedByName])

  // ── Refine Tasks ────────────────────────────────────────────────────────────
  const handleRefine = useCallback(async () => {
    if (!refineInput.trim()) return
    setError(null)
    setStage('refining')

    try {
      const res = await fetch(`${AGENT_API_URL}/api/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_tasks: tasks,
          instruction:   refineInput,
          person_info: {
            id:    employee.id,
            name:  employee.name,
            role:  employee.role,
            team:  employee.team,
            email: employee.email,
            startDate: employee.startDate,
          },
          assigned_by:      assignedBy,
          assigned_by_name: assignedByName,
        }),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setTasks(data.tasks || [])
      setAgentMessage(data.message || '')
      setChangesNote(data.changes_summary || '')
      setRefineInput('')
      setStage('review')
    } catch (e: any) {
      setError(e.message || 'Failed to refine tasks.')
      setStage('review')
    }
  }, [refineInput, tasks, employee, assignedBy, assignedByName])

  // ── Resume Upload ───────────────────────────────────────────────────────────
  const handleResumeUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${AGENT_API_URL}/api/parse-resume`, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setResumeContent(data.resume_content || '')
        setResumeFileName(file.name)
      }
    } catch {
      // fallback: read as text
      const text = await file.text()
      setResumeContent(text)
      setResumeFileName(file.name)
    }
  }

  // ── Confirm Tasks ───────────────────────────────────────────────────────────
  const handleConfirm = () => {
    onConfirm(tasks)
    setStage('confirmed')
    setTimeout(onClose, 1200)
  }

  // ── Edit Individual Task ─────────────────────────────────────────────────────
  const updateTask = (idx: number, updates: Partial<Task>) => {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t))
  }

  const removeTask = (idx: number) => {
    setTasks(prev => prev.filter((_, i) => i !== idx))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-100 bg-gradient-to-r from-amber-50 to-brown-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-brown-900 text-base">AI Task Builder</h2>
              <p className="text-xs text-brown-500">Powered by LangGraph · GPT-4o</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Employee badge */}
            <div className="flex items-center gap-2 bg-white border border-brown-200 rounded-xl px-3 py-1.5 shadow-sm">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: employee.color }}>{employee.initials}</div>
              <div>
                <p className="text-xs font-semibold text-brown-800 leading-tight">{employee.name}</p>
                <p className="text-xs text-brown-400 leading-tight">{employee.role}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-brown-100 transition-colors text-brown-500">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — two panel layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ─── Left: Prompt / Chat Panel ─────────────────────────────────── */}
          <div className="w-80 flex-shrink-0 border-r border-brown-100 flex flex-col bg-amber-50/30">

            {/* Employee context */}
            <div className="px-4 pt-4 pb-3 border-b border-brown-100">
              <p className="text-xs font-semibold text-brown-700 mb-2 flex items-center gap-1"><User size={12} />Employee</p>
              <div className="text-xs text-brown-600 space-y-0.5">
                <p><span className="text-brown-400">Role:</span> {employee.role}</p>
                <p><span className="text-brown-400">Team:</span> {employee.team}</p>
                {employee.bio && <p className="text-brown-500 italic mt-1 leading-relaxed line-clamp-2">{employee.bio}</p>}
              </div>

              {/* Resume upload */}
              <div className="mt-3">
                <input ref={resumeRef} type="file" className="hidden"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={e => e.target.files?.[0] && handleResumeUpload(e.target.files[0])} />
                <button
                  onClick={() => resumeRef.current?.click()}
                  className={`w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all ${
                    resumeContent
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-brown-200 bg-white text-brown-600 hover:border-brown-400'
                  }`}
                >
                  {resumeContent ? <CheckCircle2 size={13} /> : <Upload size={13} />}
                  {resumeFileName || (resumeContent ? 'Resume loaded from profile' : 'Upload resume (optional)')}
                </button>
              </div>
            </div>

            {/* Prompt area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-brown-700 flex items-center gap-1"><Zap size={12} />Describe the tasks</p>

              {/* Quick prompts */}
              {stage === 'prompt' && (
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map(qp => (
                    <button
                      key={qp}
                      onClick={() => setPrompt(qp)}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                        prompt === qp
                          ? 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
                          : 'border-brown-200 bg-white text-brown-600 hover:border-brown-300'
                      }`}
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              )}

              {/* Main prompt textarea */}
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Create tasks to help this engineer get familiar with the codebase, CI/CD pipeline, and code review process..."
                rows={5}
                disabled={stage === 'generating'}
                className="w-full text-xs border border-brown-200 rounded-xl p-3 bg-white outline-none focus:border-amber-400 resize-none transition-colors disabled:opacity-60 placeholder:text-brown-300"
              />

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Generate / Reset buttons */}
            <div className="px-4 py-3 border-t border-brown-100 space-y-2">
              {stage === 'review' || stage === 'refining' ? (
                <>
                  {/* Refine input */}
                  <div className="flex gap-2">
                    <input
                      value={refineInput}
                      onChange={e => setRefineInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleRefine()}
                      placeholder="Edit instructions... e.g. Make task 2 high priority"
                      disabled={stage === 'refining'}
                      className="flex-1 text-xs border border-brown-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 disabled:opacity-60"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refineInput.trim() || stage === 'refining'}
                      className="flex-shrink-0 p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors"
                    >
                      {stage === 'refining' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={() => { setStage('prompt'); setTasks([]); setChangesNote('') }}
                    className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg border border-brown-200 text-brown-600 hover:bg-brown-50 transition-colors"
                  >
                    <RotateCcw size={13} /> Start over
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || stage === 'generating'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-all"
                >
                  {stage === 'generating'
                    ? <><Loader2 size={15} className="animate-spin" />Generating tasks...</>
                    : <><Sparkles size={15} />Generate Tasks</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* ─── Right: Task Preview Panel ─────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Agent message / status bar */}
            {agentMessage && (stage === 'review' || stage === 'refining') && (
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-start gap-2 flex-shrink-0">
                <Sparkles size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">{agentMessage}</p>
              </div>
            )}

            {changesNote && (
              <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-start gap-2 flex-shrink-0">
                <Check size={13} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">{changesNote}</p>
              </div>
            )}

            {/* Tasks list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {stage === 'prompt' && (
                <div className="h-full flex flex-col items-center justify-center text-center text-brown-400 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <Sparkles size={32} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-brown-600 text-sm">AI Task Builder</p>
                    <p className="text-xs mt-1 max-w-xs text-brown-400">
                      Describe the onboarding concepts you want to turn into tasks.<br />
                      The AI will generate structured tasks with subtasks, resources, and playground activities.
                    </p>
                  </div>
                </div>
              )}

              {stage === 'generating' && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <Loader2 size={28} className="text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-brown-700 text-sm">Generating tasks...</p>
                    <p className="text-xs text-brown-400 mt-1">
                      Analyzing {employee.name}'s profile and crafting personalized tasks
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {['Analyzing profile', 'Generating tasks', 'Adding resources'].map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5 text-xs text-brown-500 bg-amber-50 rounded-full px-3 py-1">
                        <Loader2 size={10} className="animate-spin" style={{ animationDelay: `${i * 0.3}s` }} />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(stage === 'review' || stage === 'refining') && tasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-brown-700">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''} generated
                      {stage === 'refining' && <span className="text-amber-600 ml-2">· Refining...</span>}
                    </p>
                    <div className="flex gap-1.5">
                      {['engineering', 'sales'].filter(t => tasks.some(task => task.playgroundType === t)).map(pt => (
                        <span key={pt} className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium flex items-center gap-1">
                          {pt === 'engineering' ? <Cpu size={10} /> : <Mail size={10} />}
                          {pt} playground
                        </span>
                      ))}
                    </div>
                  </div>

                  {tasks.map((task, idx) => (
                    <TaskPreviewCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onRemove={() => removeTask(idx)}
                      onEdit={updates => updateTask(idx, updates)}
                    />
                  ))}

                  {/* Add task hint */}
                  <p className="text-xs text-center text-brown-400 pt-2">
                    Use the chat on the left to add, remove, or edit tasks.
                  </p>
                </div>
              )}

              {stage === 'confirmed' && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <p className="font-bold text-green-700 text-base">{tasks.length} tasks added!</p>
                  <p className="text-xs text-brown-400">Tasks have been assigned to {employee.name}.</p>
                </div>
              )}
            </div>

            {/* Confirm Footer */}
            {(stage === 'review' || stage === 'refining') && tasks.length > 0 && (
              <div className="px-5 py-4 border-t border-brown-100 bg-white flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-brown-500">
                    <span className="font-semibold text-brown-700">{tasks.length} tasks</span> ready to be assigned to{' '}
                    <span className="font-semibold text-brown-700">{employee.name}</span>
                    {tasks.filter(t => t.playgroundEnabled).length > 0 && (
                      <span className="ml-1 text-violet-600">
                        · {tasks.filter(t => t.playgroundEnabled).length} with playground
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setStage('prompt'); setTasks([]); setChangesNote('') }}
                      disabled={stage === 'refining'}
                      className="px-4 py-2 rounded-xl border border-brown-200 text-brown-600 text-sm hover:bg-brown-50 transition-colors disabled:opacity-50"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={tasks.length === 0 || stage === 'refining'}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 size={15} />
                      Add {tasks.length} Task{tasks.length !== 1 ? 's' : ''} to {employee.name}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
