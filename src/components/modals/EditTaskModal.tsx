import { useState, useRef } from 'react'
import { X, Plus, Trash2, CheckCircle, Link2, FileText, AlertCircle, Upload, Save, FlaskConical } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Task, SubTask, SupportingLink, Document } from '../../context/AppContext'

interface Props {
  task: Task
  /** ID used to scope visible documents (e.g. 'admin', 'hr', or mentor's id) */
  uploaderId: string
  onClose: () => void
}

const CATEGORIES = ['Setup', 'Learning', 'Technical', 'Compliance', 'People', 'Tools', 'Admin', 'General']
const EST_TIMES = [
  '15 min', '30 min', '45 min',
  '1 hour', '1.5 hours', '2 hours', '3 hours', '4 hours',
  'Half day', 'Full day', '2 days', '3 days', '1 week',
]
const PRIORITIES: { value: Task['priority']; label: string }[] = [
  { value: 'high',   label: 'High'   },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low'    },
]

export default function EditTaskModal({ task, uploaderId, onClose }: Props) {
  const { state, dispatch } = useApp()

  const [title,          setTitle]          = useState(task.title)
  const [description,    setDescription]    = useState(task.description)
  const [category,       setCategory]       = useState(task.category)
  const [estimatedTime,  setEstimatedTime]  = useState(task.estimatedTime)
  const [priority,       setPriority]       = useState<Task['priority']>(task.priority ?? 'medium')
  const [subtasks,       setSubtasks]       = useState<SubTask[]>(task.subtasks ?? [])
  const [newSubtask,     setNewSubtask]     = useState('')
  const [supportingDocIds, setSupportingDocIds] = useState<string[]>(task.supportingDocs ?? [])
  const [supportingLinks,  setSupportingLinks]  = useState<SupportingLink[]>(task.supportingLinks ?? [])
  const [newLinkLabel,   setNewLinkLabel]   = useState('')
  const [newLinkUrl,     setNewLinkUrl]     = useState('')
  const [requiresInput,    setRequiresInput]    = useState(task.requiresInput ?? false)
  const [inputPrompt,      setInputPrompt]      = useState(task.inputPrompt ?? '')
  // Playground — only relevant for mentor-assigned tasks
  const [playgroundEnabled, setPlaygroundEnabled] = useState(task.playgroundEnabled ?? false)
  const [playgroundType,    setPlaygroundType]    = useState<NonNullable<Task['playgroundType']>>(task.playgroundType ?? 'engineering')
  const [fieldErrors,    setFieldErrors]    = useState<{ title?: string; description?: string; inputPrompt?: string }>({})
  const [formError,      setFormError]      = useState('')
  const docUploadRef = useRef<HTMLInputElement>(null)

  // Scope documents to the uploader
  const myDocs = state.documents.filter(d => d.uploadedBy === uploaderId)

  // Inline document upload
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
        uploadedBy: uploaderId,
        date:       new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        content:    `Document: ${file.name}.`,
        fileData:   reader.result as string,
      }
      dispatch({ type: 'ADD_DOCUMENT', payload: newDoc })
      setSupportingDocIds(prev => [...prev, docId])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const toggleDoc = (id: string) =>
    setSupportingDocIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    setSubtasks(prev => [...prev, { id: `st-${Date.now()}`, title: newSubtask.trim(), status: 'pending' }])
    setNewSubtask('')
  }

  const removeSubtask = (i: number) =>
    setSubtasks(prev => prev.filter((_, idx) => idx !== i))

  const addLink = () => {
    if (!newLinkUrl.trim()) return
    setSupportingLinks(prev => [...prev, { label: newLinkLabel.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }])
    setNewLinkLabel('')
    setNewLinkUrl('')
  }

  const removeLink = (i: number) =>
    setSupportingLinks(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = () => {
    const errs: typeof fieldErrors = {}
    if (!title.trim())       errs.title       = 'Task title is required.'
    if (!description.trim()) errs.description  = 'Description is required.'
    if (requiresInput && !inputPrompt.trim()) errs.inputPrompt = 'Input prompt is required.'

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setFormError('Please fill in all required fields.')
      return
    }
    setFieldErrors({})
    setFormError('')

    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: task.id,
        updates: {
          title:            title.trim(),
          description:      description.trim(),
          category,
          estimatedTime:    estimatedTime.trim() || '30 min',
          priority,
          subtasks,
          supportingDocs:   supportingDocIds,
          supportingLinks,
          requiresInput,
          inputPrompt:      requiresInput ? inputPrompt.trim() : undefined,
          ...(task.assignedBy === 'mentor' && {
            playgroundEnabled,
            playgroundType: playgroundEnabled ? playgroundType : undefined,
          }),
        },
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-brown-900 text-base flex items-center gap-2">
              <Save size={16} className="text-brown-500" /> Edit Task
            </h2>
            <p className="text-xs text-brown-400 truncate max-w-xs">"{task.title}"</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Task Title *</label>
            <input
              type="text" value={title}
              onChange={e => { setTitle(e.target.value); setFieldErrors(fe => ({ ...fe, title: undefined })); setFormError('') }}
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
              value={description}
              onChange={e => { setDescription(e.target.value); setFieldErrors(fe => ({ ...fe, description: undefined })); setFormError('') }}
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
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-field text-sm py-2.5">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown-600 mb-1.5">Est. Time</label>
              <select value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} className="input-field text-sm py-2.5">
                {EST_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown-600 mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="input-field text-sm py-2.5">
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-2">
              Subtasks <span className="text-brown-400 font-normal">(optional)</span>
            </label>
            <div className="space-y-1.5 mb-2">
              {subtasks.map((st, i) => (
                <div key={st.id} className="flex items-center gap-2 bg-brown-50 rounded-lg px-3 py-2 border border-brown-100">
                  <CheckCircle size={13} className="text-brown-400 flex-shrink-0" />
                  <span className="text-sm text-brown-700 flex-1">{st.title}</span>
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

          {/* Supporting Docs */}
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
                  <label key={doc.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${supportingDocIds.includes(doc.id) ? 'border-brown-400 bg-brown-50' : 'border-brown-100 hover:border-brown-200'}`}>
                    <input type="checkbox" checked={supportingDocIds.includes(doc.id)} onChange={() => toggleDoc(doc.id)} className="accent-brown-600" />
                    <FileText size={13} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm text-brown-700 truncate flex-1">{doc.name}</span>
                    <span className="text-xs text-brown-400">{doc.type}</span>
                    {supportingDocIds.includes(doc.id) && (
                      <span className="text-[10px] font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Attached</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Supporting Links */}
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-2">
              Supporting Links <span className="text-brown-400 font-normal">(optional)</span>
            </label>
            <div className="space-y-1.5 mb-2">
              {supportingLinks.map((lnk, i) => (
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
                onClick={() => setRequiresInput(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${requiresInput ? 'bg-brown-600' : 'bg-brown-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${requiresInput ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-brown-800">Requires Employee Input</p>
                <p className="text-xs text-brown-500">Employee must submit a written response to complete this task</p>
              </div>
            </label>
            {requiresInput && (
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Input Prompt *</label>
                <textarea
                  value={inputPrompt}
                  onChange={e => { setInputPrompt(e.target.value); setFieldErrors(fe => ({ ...fe, inputPrompt: undefined })); setFormError('') }}
                  rows={2}
                  className={`input-field text-sm py-2 resize-none ${fieldErrors.inputPrompt ? 'border-red-400 focus:ring-red-300' : ''}`}
                />
                {fieldErrors.inputPrompt && (
                  <p className="flex items-center gap-1 text-xs text-red-600 mt-1"><AlertCircle size={11} />{fieldErrors.inputPrompt}</p>
                )}
              </div>
            )}
          </div>

          {/* Playground — mentor tasks only */}
          {task.assignedBy === 'mentor' && (
            <div className={`border rounded-xl p-4 transition-colors ${playgroundEnabled ? 'bg-teal-50 border-teal-200' : 'bg-brown-50 border-brown-200'}`}>
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setPlaygroundEnabled(v => !v)}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${playgroundEnabled ? 'bg-teal-500' : 'bg-brown-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${playgroundEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <FlaskConical size={15} className={playgroundEnabled ? 'text-teal-600' : 'text-brown-400'} />
                <div>
                  <p className="text-sm font-semibold text-brown-800">Enable Playground</p>
                  <p className="text-xs text-brown-500">Let the employee practice in a sandbox without affecting real progress</p>
                </div>
              </div>

              {playgroundEnabled && (
                <div className="mt-3 pt-3 border-t border-teal-200">
                  <p className="text-xs font-semibold text-teal-700 mb-2">Playground Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'engineering', label: 'Engineering', icon: '💻', enabled: true  },
                      { value: 'sales',       label: 'Sales',       icon: '💰', enabled: true  },
                      { value: 'marketing',   label: 'Marketing',   icon: '📣', enabled: false },
                      { value: 'leadership',  label: 'Leadership',  icon: '👑', enabled: false },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!opt.enabled}
                        onClick={() => opt.enabled && setPlaygroundType(opt.value as NonNullable<Task['playgroundType']>)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          !opt.enabled
                            ? 'opacity-40 cursor-not-allowed bg-white border-brown-200 text-brown-400'
                            : playgroundType === opt.value
                            ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                            : 'bg-white border-teal-200 text-teal-700 hover:bg-teal-50'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
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
              <AlertCircle size={13} />{formError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brown-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
          <button onClick={handleSave} className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
            <Save size={15} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
