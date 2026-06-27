import { useState } from 'react'
import {
  X, Sparkles, Users, FileText, CheckCircle, Loader2,
  Trash2, Plus, ChevronDown, ChevronUp, AlertCircle,
  ArrowRight, Bot, RotateCcw
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Employee, Task } from '../../context/AppContext'
import type { SuggestedTask } from '../../services/aiService'

// ─── Backend agent URL ────────────────────────────────────────────────────────
const AGENT_API_URL = ''

/** Map a backend Task object to SuggestedTask shape used in the UI */
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

interface Props { onClose: () => void }

type GenStatus = 'idle' | 'generating' | 'done' | 'error'

interface EmployeeResult {
  employee: Employee
  status: GenStatus
  tasks: SuggestedTask[]
  assigned: boolean
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-orange-50 text-orange-600 border-orange-200',
  low:    'bg-green-50 text-green-600 border-green-200',
}

export default function BulkTaskGenerationModal({ onClose }: Props) {
  const { state, dispatch } = useApp()

  // ── Step 1: select employees + docs + prompt
  const [step, setStep]               = useState<1 | 2>(1)
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(state.employees.map(e => e.id))
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [globalPrompt,   setGlobalPrompt]   = useState('Generate a complete onboarding task list tailored to each employee\'s role')
  const [results,        setResults]   = useState<EmployeeResult[]>([])
  const [expanded,       setExpanded]  = useState<Record<string, boolean>>({})
  const [running,        setRunning]   = useState(false)
  const [progress,       setProgress]  = useState(0)

  const toggleEmp = (id: string) =>
    setSelectedEmpIds(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id])
  const toggleDoc = (id: string) =>
    setSelectedDocIds(p => p.includes(id) ? p.filter(d => d !== id) : [...p, id])
  const toggleAll = () =>
    setSelectedEmpIds(p => p.length === state.employees.length ? [] : state.employees.map(e => e.id))

  // ── Step 2: generate tasks for all selected employees
  const generate = async () => {
    if (!selectedEmpIds.length || running) return
    const employees = state.employees.filter(e => selectedEmpIds.includes(e.id))
    const docCtx    = (selectedDocIds.length > 0
      ? state.documents.filter(d => selectedDocIds.includes(d.id))
      : state.documents.slice(0, 3)
    ).map(d => d.content).join(' ')

    // Init result rows
    const initial: EmployeeResult[] = employees.map(e => ({ employee: e, status: 'idle', tasks: [], assigned: false }))
    setResults(initial)
    setExpanded(Object.fromEntries(employees.map(e => [e.id, true])))
    setStep(2)
    setRunning(true)
    setProgress(0)

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      setResults(prev => prev.map(r => r.employee.id === emp.id ? { ...r, status: 'generating' } : r))
      try {
        const res = await fetch(`${AGENT_API_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person_info: {
              id:            emp.id,
              name:          emp.name,
              role:          emp.role,
              team:          emp.team,
              email:         emp.email   ?? '',
              startDate:     emp.startDate ?? '',
              resumeContent: (emp as any).resumeContent ?? '',
              bio:           (emp as any).bio ?? '',
            },
            prompt: globalPrompt + (docCtx ? `\n\nCompany context:\n${docCtx.slice(0, 800)}` : ''),
            assigned_by:      'admin',
            assigned_by_name: 'Admin',
          }),
        })
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()
        const tasks: SuggestedTask[] = (data.tasks ?? []).map(backendTaskToSuggested)
        setResults(prev => prev.map(r => r.employee.id === emp.id ? { ...r, status: 'done', tasks } : r))
      } catch {
        setResults(prev => prev.map(r => r.employee.id === emp.id ? { ...r, status: 'error' } : r))
      }
      setProgress(Math.round(((i + 1) / employees.length) * 100))
    }
    setRunning(false)
  }

  const removeTask = (empId: string, idx: number) =>
    setResults(prev => prev.map(r => r.employee.id === empId ? { ...r, tasks: r.tasks.filter((_, i) => i !== idx) } : r))

  const assignEmployee = (empId: string) => {
    const result = results.find(r => r.employee.id === empId)
    if (!result || result.tasks.length === 0) return
    result.tasks.forEach((s, i) => {
      const task: Task = {
        id: `task-${Date.now()}-${empId}-${i}`,
        title: s.title, description: s.description,
        category: s.category, estimatedTime: s.estimatedTime,
        priority: s.priority,
        assignedTo: empId, assignedBy: 'admin', assignedByName: 'Admin',
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
        order: Date.now() + i,
        subtasks: (s.subtasks ?? []).map((st, j) => ({ id: `st-${Date.now()}-${j}`, title: st.title, status: 'pending' as const })),
        requiresInput: s.requiresInput,
        inputPrompt: s.requiresInput ? s.inputPrompt : undefined,
      }
      dispatch({ type: 'ADD_TASK', payload: task })
    })
    setResults(prev => prev.map(r => r.employee.id === empId ? { ...r, assigned: true } : r))
  }

  const assignAll = () => {
    results.filter(r => r.status === 'done' && !r.assigned && r.tasks.length > 0).forEach(r => assignEmployee(r.employee.id))
  }

  const allDone    = results.length > 0 && results.every(r => r.status === 'done' || r.status === 'error')
  const allAssigned = results.filter(r => r.status === 'done').every(r => r.assigned)
  const doneCount  = results.filter(r => r.status === 'done').length
  const totalTasks = results.reduce((a, r) => a + r.tasks.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-100 flex-shrink-0 bg-gradient-to-r from-brown-700 to-brown-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">AI Bulk Task Generation</h2>
              <p className="text-white/60 text-xs">Generate & assign onboarding tasks for all employees using AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Step indicators ── */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-brown-100 bg-brown-50 flex-shrink-0">
          {[{ n: 1, label: 'Configure' }, { n: 2, label: 'Review & Assign' }].map(s => (
            <div key={s.n} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === s.n ? 'bg-brown-700 text-white' : step > s.n ? 'bg-green-500 text-white' : 'bg-brown-200 text-brown-500'}`}>
                {step > s.n ? <CheckCircle size={12} /> : s.n}
              </div>
              <span className={`text-xs font-semibold ${step === s.n ? 'text-brown-800' : 'text-brown-400'}`}>{s.label}</span>
              {s.n < 2 && <ArrowRight size={12} className="text-brown-300 ml-1" />}
            </div>
          ))}
          {running && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-32 h-1.5 bg-brown-200 rounded-full overflow-hidden">
                <div className="h-full bg-brown-700 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-brown-500 font-medium">{progress}%</span>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <div className="p-6 space-y-6">
              {/* Global prompt */}
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Generation Instruction</label>
                <textarea
                  value={globalPrompt}
                  onChange={e => setGlobalPrompt(e.target.value)}
                  rows={2}
                  className="input-field text-sm py-2.5 resize-none"
                  placeholder="What kind of tasks should be generated for each employee?"
                />
                <p className="text-xs text-brown-400 mt-1">The AI will tailor tasks to each employee's specific role using this instruction.</p>
              </div>

              {/* Employee selector */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-brown-600 flex items-center gap-1.5">
                    <Users size={13} /> Select Employees ({selectedEmpIds.length}/{state.employees.length})
                  </label>
                  <button onClick={toggleAll} className="text-xs text-brown-600 underline hover:no-underline">
                    {selectedEmpIds.length === state.employees.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-2">
                  {state.employees.map(emp => {
                    const hasTasks = state.tasks.some(t => t.assignedTo === emp.id)
                    return (
                      <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedEmpIds.includes(emp.id) ? 'border-brown-500 bg-brown-50' : 'border-brown-100 hover:border-brown-200 bg-white'}`}>
                        <input type="checkbox" checked={selectedEmpIds.includes(emp.id)} onChange={() => toggleEmp(emp.id)} className="accent-brown-600 flex-shrink-0" />
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: emp.color }}>{emp.initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-brown-800">{emp.name}</p>
                          <p className="text-xs text-brown-400">{emp.role} · {emp.team}</p>
                        </div>
                        {hasTasks
                          ? <span className="text-xs text-brown-400 bg-brown-100 px-2 py-0.5 rounded-full flex-shrink-0">Has tasks</span>
                          : <span className="text-xs text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full flex-shrink-0">No tasks</span>
                        }
                      </label>
                    )
                  })}
                  {state.employees.length === 0 && (
                    <div className="text-center py-8 text-brown-400">
                      <Users size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No employees to generate tasks for.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document context */}
              {state.documents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-semibold text-brown-600 flex items-center gap-1.5">
                      <FileText size={13} /> Document Context <span className="text-brown-400 font-normal">(optional)</span>
                    </label>
                    {selectedDocIds.length > 0 && (
                      <span className="text-xs font-semibold bg-brown-700 text-white px-2 py-0.5 rounded-full">{selectedDocIds.length} selected</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {state.documents.map(doc => (
                      <label key={doc.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${selectedDocIds.includes(doc.id) ? 'border-brown-500 bg-brown-50' : 'border-brown-100 hover:border-brown-200 bg-white'}`}>
                        <input type="checkbox" checked={selectedDocIds.includes(doc.id)} onChange={() => toggleDoc(doc.id)} className="accent-brown-600 flex-shrink-0" />
                        <FileText size={12} className="text-red-400 flex-shrink-0" />
                        <span className="text-xs text-brown-700 truncate flex-1">{doc.name}</span>
                        <span className="text-xs text-brown-400 flex-shrink-0">{doc.type}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-brown-400 mt-1.5 italic">
                    {selectedDocIds.length === 0 ? 'No docs selected — AI uses general context + top 3 documents' : 'Selected document content will be sent to the AI as context'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              {/* Summary bar */}
              {allDone && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800">
                      Generated {totalTasks} tasks across {doneCount} employees
                    </p>
                    <p className="text-xs text-green-600">Review tasks below, remove any you don't want, then assign.</p>
                  </div>
                  {!allAssigned && (
                    <button onClick={assignAll} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 flex-shrink-0">
                      <Sparkles size={13} /> Assign All
                    </button>
                  )}
                  {allAssigned && (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={12} /> All Assigned
                    </span>
                  )}
                </div>
              )}

              {/* Per-employee result cards */}
              {results.map(r => (
                <div key={r.employee.id} className={`rounded-2xl border overflow-hidden ${r.assigned ? 'border-green-200 bg-green-50/30' : 'border-brown-100 bg-white'}`}>
                  {/* Employee header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-brown-100">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: r.employee.color }}>{r.employee.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brown-900">{r.employee.name}</p>
                      <p className="text-xs text-brown-400">{r.employee.role} · {r.employee.team}</p>
                    </div>

                    {/* Status chip */}
                    {r.status === 'generating' && (
                      <span className="flex items-center gap-1.5 text-xs text-brown-600 bg-brown-100 px-2.5 py-1 rounded-full">
                        <Loader2 size={11} className="animate-spin" /> Generating…
                      </span>
                    )}
                    {r.status === 'done' && !r.assigned && (
                      <>
                        <span className="text-xs text-brown-500">{r.tasks.length} tasks</span>
                        <button onClick={() => setExpanded(ex => ({ ...ex, [r.employee.id]: !ex[r.employee.id] }))} className="p-1 rounded hover:bg-brown-50 text-brown-400 transition-colors">
                          {expanded[r.employee.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button onClick={() => assignEmployee(r.employee.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 flex-shrink-0">
                          <Plus size={12} /> Assign
                        </button>
                      </>
                    )}
                    {r.status === 'done' && r.assigned && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex-shrink-0">
                        <CheckCircle size={11} /> Assigned
                      </span>
                    )}
                    {r.status === 'error' && (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                        <AlertCircle size={11} /> Failed
                      </span>
                    )}
                    {r.status === 'idle' && (
                      <span className="text-xs text-brown-300">Queued…</span>
                    )}
                  </div>

                  {/* Task list */}
                  {expanded[r.employee.id] && r.status === 'done' && !r.assigned && r.tasks.length > 0 && (
                    <div className="divide-y divide-brown-50">
                      {r.tasks.map((task, idx) => (
                        <div key={idx} className="flex items-start gap-3 px-4 py-2.5 hover:bg-brown-50/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-brown-800">{task.title}</p>
                              {task.priority && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                              )}
                              {task.requiresInput && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-0.5">
                                  <AlertCircle size={9} />Input
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-brown-400 mt-0.5">{task.category} · {task.estimatedTime}{task.subtasks?.length ? ` · ${task.subtasks.length} subtasks` : ''}</p>
                          </div>
                          <button onClick={() => removeTask(r.employee.id, idx)} className="p-1 rounded text-red-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 mt-0.5" title="Remove task">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.status === 'done' && r.tasks.length === 0 && (
                    <div className="px-4 py-3 text-xs text-brown-400 italic">All tasks removed.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-brown-100 flex gap-3 items-center flex-shrink-0">
          {step === 1 && (
            <>
              <button onClick={onClose} className="btn-secondary py-2.5 px-5 text-sm">Cancel</button>
              <div className="flex-1" />
              <button
                onClick={generate}
                disabled={selectedEmpIds.length === 0}
                className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <Bot size={15} /> Generate Tasks for {selectedEmpIds.length} Employee{selectedEmpIds.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              {!running && !allDone && (
                <button onClick={() => { setStep(1); setResults([]) }} className="flex items-center gap-1.5 btn-secondary py-2.5 px-4 text-sm">
                  <RotateCcw size={14} /> Back
                </button>
              )}
              <div className="flex-1" />
              {allDone && allAssigned && (
                <button onClick={onClose} className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2">
                  <CheckCircle size={15} /> Done
                </button>
              )}
              {allDone && !allAssigned && (
                <>
                  <button onClick={onClose} className="btn-secondary py-2.5 px-4 text-sm">Close</button>
                  <button onClick={assignAll} className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2">
                    <Sparkles size={15} /> Assign All Remaining
                  </button>
                </>
              )}
              {running && (
                <span className="text-xs text-brown-500 flex items-center gap-1.5 ml-auto">
                  <Loader2 size={13} className="animate-spin" />
                  Generating tasks… {results.filter(r => r.status === 'done' || r.status === 'error').length}/{results.length} done
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
