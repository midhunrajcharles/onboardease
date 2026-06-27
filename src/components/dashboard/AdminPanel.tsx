import { useState, useRef } from 'react'
import {
  Users, TrendingUp, AlertTriangle, CheckCircle, Plus,
  Search, BarChart3, Bot, FileText, Trash2, Eye,
  Sparkles, BookOpen, Settings, Shield, Upload,
  Plug, Activity, Clock, Zap, GitBranch, Slack, Globe, Lock, ClipboardList
} from 'lucide-react'
import { useApp, initialMentors } from '../../context/AppContext'
import AddEmployeeModal from '../modals/AddEmployeeModal'
import EmployeeDetailModal from '../modals/EmployeeDetailModal'
import PDFViewerModal from '../modals/PDFViewerModal'
import AddMentorModal from '../modals/AddMentorModal'
import AIDocumentChat from '../chat/AIDocumentChat'
import AdminChatWidget from '../chat/AdminChatWidget'
import BulkTaskGenerationModal from '../modals/BulkTaskGenerationModal'
import type { Employee, Document, MentorUser } from '../../context/AppContext'

interface Props { activeSection?: string; isHR?: boolean }

// ─── Settings Section (extracted to respect Rules of Hooks) ───────────────────
function SettingsSection() {
  const { state, dispatch } = useApp()
  const cs = state.companySettings
  const nameRef   = useRef<HTMLInputElement>(null)
  const industRef = useRef<HTMLInputElement>(null)
  const sizeRef   = useRef<HTMLInputElement>(null)
  const aboutRef  = useRef<HTMLTextAreaElement>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_COMPANY_SETTINGS',
      payload: {
        name:     nameRef.current?.value   ?? cs.name,
        industry: industRef.current?.value ?? cs.industry,
        teamSize: sizeRef.current?.value   ?? cs.teamSize,
        about:    aboutRef.current?.value  ?? cs.about,
      },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Company Settings */}
      <div className="card">
        <h3 className="font-bold text-brown-900 mb-5 flex items-center gap-2"><Settings size={18} />Company Settings</h3>
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-brown-600 mb-1.5">Company Name</label><input ref={nameRef} type="text" defaultValue={cs.name} className="input-field text-sm py-2.5" /></div>
          <div><label className="block text-xs font-semibold text-brown-600 mb-1.5">Industry</label><input ref={industRef} type="text" defaultValue={cs.industry} className="input-field text-sm py-2.5" /></div>
          <div><label className="block text-xs font-semibold text-brown-600 mb-1.5">Team Size</label><input ref={sizeRef} type="text" defaultValue={cs.teamSize} className="input-field text-sm py-2.5" /></div>
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">About the Company</label>
            <textarea ref={aboutRef} rows={4} defaultValue={cs.about} className="input-field text-sm py-2.5 resize-none w-full" placeholder="Write a short description about your company…" />
          </div>
        </div>
        <button onClick={handleSave} className={`w-full mt-5 text-sm py-2.5 font-bold rounded-xl transition-colors ${saved ? 'bg-green-600 text-white' : 'btn-primary'}`}>
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
      {/* Security & Compliance */}
      <div className="card">
        <h3 className="font-bold text-brown-900 mb-5 flex items-center gap-2"><Shield size={18} />Security &amp; Compliance</h3>
        <div className="space-y-4">
          {[{ label: 'Authentication', value: 'SSO + MFA Enabled' }, { label: 'Data Encryption', value: 'AES-256' }, { label: 'Compliance', value: 'GDPR · CCPA · SOC 2' }].map(f => (
            <div key={f.label}><label className="block text-xs font-semibold text-brown-600 mb-1.5">{f.label}</label><input type="text" defaultValue={f.value} className="input-field text-sm py-2.5" /></div>
          ))}
        </div>
        <button className="btn-primary w-full mt-5 text-sm py-2.5">Save Changes</button>
      </div>
    </div>
  )
}

export default function AdminPanel({ activeSection = 'overview', isHR = false }: Props) {
  const { state, dispatch } = useApp()
  const [search,           setSearch]           = useState('')
  const [showAddEmployee,  setShowAddEmployee]  = useState(false)
  const [showAIChat,       setShowAIChat]       = useState(false)
  const [selectedDoc,      setSelectedDoc]      = useState<string | undefined>()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [confirmRemove,    setConfirmRemove]    = useState<Employee | null>(null)
  const [viewingDoc,       setViewingDoc]       = useState<Document | null>(null)
  const [showAddMentor,    setShowAddMentor]    = useState(false)
  const [confirmRemoveMentor, setConfirmRemoveMentor] = useState<MentorUser | null>(null)
  const [confirmDeleteDoc,    setConfirmDeleteDoc]    = useState<string | null>(null)
  const [docInUseError,       setDocInUseError]       = useState<string | null>(null)
  const [showBulkGenerate,    setShowBulkGenerate]    = useState(false)
  const docUploadRef = useRef<HTMLInputElement>(null)

  // Check if a document is referenced by any task's supportingDocs
  const isDocInUse = (docId: string) =>
    state.tasks.some(t => (t.supportingDocs ?? []).includes(docId))

  // Documents visible to this role only
  const roleDocs = state.documents.filter(d => isHR ? d.uploadedBy === 'hr' : d.uploadedBy === 'admin')

  const handleDirectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: file.name.split('.').pop()?.toUpperCase() ?? 'PDF',
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status: 'processed',
        uploadedBy: isHR ? 'hr' : 'admin',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        content: `Document: ${file.name}. This document contains important company information, policies, procedures, and guidelines for new employees.`,
        fileData: reader.result as string,
      }
      dispatch({ type: 'ADD_DOCUMENT', payload: newDoc })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const filtered = state.employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  const atRisk     = state.employees.filter(e => e.risk === 'high').length
  const onboarding = state.employees.filter(e => e.status === 'onboarding').length

  // Compute progress dynamically from task completion; fall back to emp.progress if no tasks assigned
  const getProgress = (emp: Employee) => {
    const t = state.tasks.filter(t => t.assignedTo === emp.id)
    return t.length > 0 ? Math.round((t.filter(t => t.status === 'done').length / t.length) * 100) : emp.progress
  }
  const hasTasks = (empId: string) => state.tasks.some(t => t.assignedTo === empId)

  const avgProg    = state.employees.length
    ? Math.round(state.employees.reduce((a, e) => a + getProgress(e), 0) / state.employees.length)
    : 0

  const getMentor = (id: string | null) =>
    id ? initialMentors.find(m => m.id === id)?.name ?? '—' : 'Unassigned'

  return (
    <div className="min-h-screen" style={{ background: '#F0F7FF' }}>
      {/* Always-rendered hidden file input for document upload */}
      <input
        ref={docUploadRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
        onChange={handleDirectUpload}
      />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Stats — hidden on Mentors and Docs tabs */}
        {activeSection !== 'mentors' && activeSection !== 'docs' && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Users size={20} />,        label: 'Total Employees', value: state.employees.length, sub: `${onboarding} onboarding`,  color: 'bg-blue-50 text-blue-600'   },
            { icon: <TrendingUp size={20} />,    label: 'Avg Progress',   value: `${avgProg}%`,          sub: 'across all hires',           color: 'bg-green-50 text-green-600' },
            { icon: <AlertTriangle size={20} />, label: 'At Risk',        value: atRisk,                 sub: atRisk > 0 ? 'need attention' : 'all on track ✅', color: atRisk > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600' },
            { icon: <FileText size={20} />,      label: 'Documents',      value: state.documents.length, sub: `${state.documents.filter(d => d.status === 'processed').length} processed`, color: 'bg-purple-50 text-purple-600' },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-sm text-brown-500 font-medium">{s.label}</p>
                <p className="font-bold text-brown-900 text-xl leading-tight">{s.value}</p>
                <p className="text-xs text-brown-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>}

        {/* ═══ OVERVIEW ═══ */}
        {activeSection === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="card">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-brown-900 flex items-center gap-2"><BarChart3 size={18} />Employee Progress</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowBulkGenerate(true)} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5"><Sparkles size={14} />AI Generate Tasks</button>
                    {!isHR && <button onClick={() => setShowAddEmployee(true)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2"><Plus size={14} />Add Employee</button>}
                  </div>
                </div>
                <div className="space-y-4">
                  {state.employees.filter(e => e.status === 'onboarding').map(emp => {
                    const prog     = getProgress(emp)
                    const hasTask  = hasTasks(emp.id)
                    return (
                      <button key={emp.id} onClick={() => setSelectedEmployee(emp)} className="w-full flex items-center gap-4 text-left hover:bg-brown-50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: emp.color }}>{emp.initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold text-brown-800 truncate">{emp.name}</span>
                            {hasTask
                              ? <span className="text-xs text-brown-500 ml-2 flex-shrink-0">Day {emp.day}/{emp.totalDays} · {prog}%</span>
                              : <span className="text-xs text-orange-500 ml-2 flex-shrink-0 font-medium">No task assigned</span>
                            }
                          </div>
                          {hasTask
                            ? <div className="progress-bar"><div className={`progress-fill ${emp.risk === 'high' ? '!bg-red-400' : ''}`} style={{ width: `${prog}%` }} /></div>
                            : <div className="h-2 rounded-full bg-orange-100 border border-dashed border-orange-300" />
                          }
                          <p className="text-xs text-brown-400 mt-0.5">Mentor: {getMentor(emp.mentorId)}</p>
                        </div>
                        {emp.risk === 'high' && <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />}
                        {!isHR && (
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmRemove(emp) }}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                            title="Remove employee"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </button>
                    )
                  })}
                  {state.employees.filter(e => e.status === 'onboarding').length === 0 && (
                    <div className="text-center py-8 text-brown-400">
                      <Users size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No active onboarding.{!isHR && <> <button onClick={() => setShowAddEmployee(true)} className="text-brown-600 underline">Add employee</button></>}</p>
                    </div>
                  )}
                </div>
              </div>
              <AdminChatWidget
                employeeCount={state.employees.length}
                atRiskCount={atRisk}
                avgProgress={avgProg}
                docCount={state.documents.length}
                atRiskNames={state.employees.filter(e => e.risk === 'high').map(e => e.name)}
              />
            </div>
            <div className="space-y-5">
              <div className="card">
                <h3 className="font-bold text-brown-900 mb-4 flex items-center gap-2"><Bot size={16} />AI Insights</h3>
                <div className="space-y-3">
                  {atRisk > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">⚠️ <strong>{state.employees.filter(e => e.risk === 'high').map(e => e.name).join(', ')}</strong> — low engagement. Schedule a check-in.</div>}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">✅ {state.documents.filter(d => d.status === 'processed').length} documents processed and ready.</div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">💡 Click any employee row to view full details, tasks and analytics.</div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-bold text-brown-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {!isHR && (
                    <button onClick={() => setShowAddEmployee(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-brown-50 hover:bg-brown-100 border border-brown-200 transition-colors text-left">
                      <Plus size={16} className="text-brown-600 flex-shrink-0" /><span className="text-sm font-semibold text-brown-800">Add New Employee</span>
                    </button>
                  )}
                  <button onClick={() => docUploadRef.current?.click()} className="w-full flex items-center gap-3 p-3 rounded-xl bg-brown-50 hover:bg-brown-100 border border-brown-200 transition-colors text-left">
                    <Upload size={16} className="text-brown-600 flex-shrink-0" /><span className="text-sm font-semibold text-brown-800">Upload Documents</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ EMPLOYEES ═══ */}
        {activeSection === 'employees' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative max-w-sm w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
                <input placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowBulkGenerate(true)} className="btn-secondary inline-flex items-center gap-2 py-2.5 px-4 text-sm"><Sparkles size={15} />AI Generate Tasks</button>
                {!isHR && <button onClick={() => setShowAddEmployee(true)} className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-sm"><Plus size={16} />Add New Employee</button>}
              </div>
            </div>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-brown-50 border-b border-brown-200">
                    <tr>{['Employee', 'Role / Team', 'Mentor', 'Progress', 'Tasks', 'Status', 'Resume', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-brown-600 px-4 py-3.5 whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-brown-100">
                    {filtered.map(emp => {
                      const myTasks = state.tasks.filter(t => t.assignedTo === emp.id)
                      const done    = myTasks.filter(t => t.status === 'done').length
                      const prog    = getProgress(emp)
                      const hasTask = hasTasks(emp.id)
                      return (
                        <tr key={emp.id} onClick={() => setSelectedEmployee(emp)} className="hover:bg-brown-50/60 transition-colors cursor-pointer">
                          <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: emp.color }}>{emp.initials}</div><div><span className="font-semibold text-brown-900 text-sm">{emp.name}</span><p className="text-xs text-brown-400">{emp.email}</p></div></div></td>
                          <td className="px-4 py-4"><p className="text-sm text-brown-800 font-medium">{emp.role}</p><p className="text-xs text-brown-400">{emp.team}</p></td>
                          <td className="px-4 py-4 text-sm text-brown-600 whitespace-nowrap">{getMentor(emp.mentorId)}</td>
                          <td className="px-4 py-4">
                            {hasTask
                              ? <div className="flex items-center gap-2"><div className="w-20 progress-bar"><div className={`progress-fill ${emp.risk === 'high' ? '!bg-red-400' : ''}`} style={{ width: `${prog}%` }} /></div><span className="text-xs text-brown-500 font-medium">{prog}%</span></div>
                              : <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full whitespace-nowrap">No task assigned</span>
                            }
                          </td>
                          <td className="px-4 py-4 text-sm text-brown-600 whitespace-nowrap">{done}/{myTasks.length} done</td>
                          <td className="px-4 py-4">{emp.status === 'completed' ? <span className="badge-green">Completed</span> : <span className="badge-orange">Onboarding</span>}</td>
                          <td className="px-4 py-4">{emp.resumeFileName ? <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle size={11} />{emp.resumeFileName.slice(0, 12)}…</span> : <span className="text-xs text-brown-400">—</span>}</td>
                          <td className="px-4 py-4 text-xs text-brown-400 underline">View →</td>
                          {!isHR && (
                            <td className="px-4 py-4">
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmRemove(emp) }}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Remove employee"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="text-center py-12 text-brown-400"><Users size={36} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">No employees found</p><button onClick={() => setShowAddEmployee(true)} className="text-brown-600 underline text-sm mt-1">Add first employee</button></div>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ DOCUMENTS ═══ */}
        {activeSection === 'docs' && (
          <div className="space-y-5">
            <div className="border-2 border-dashed border-brown-200 rounded-2xl p-10 text-center hover:border-brown-400 transition-all">
              <div className="w-16 h-16 bg-brown-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Upload size={28} className="text-brown-500" /></div>
              <h3 className="font-bold text-brown-900 text-lg mb-2">Upload Documents</h3>
              <p className="text-brown-500 text-sm mb-5">Upload HR policies, guides, playbooks and onboarding materials</p>
              <button
                onClick={() => docUploadRef.current?.click()}
                className="btn-primary text-sm py-2.5 px-6 inline-flex items-center gap-2"
              >
                <Upload size={16} /> Upload Document
              </button>
            </div>
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-brown-100 flex justify-between items-center">
                <h3 className="font-bold text-brown-900">Uploaded Documents</h3>
                <span className="badge-brown">{roleDocs.length} files</span>
              </div>
              <div className="divide-y divide-brown-100">
                {roleDocs.length === 0 && (
                  <div className="text-center py-10 text-brown-400">
                    <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No documents uploaded yet.</p>
                  </div>
                )}
                {roleDocs.map(doc => (
                  <div key={doc.id} className={`transition-colors ${confirmDeleteDoc === doc.id ? 'bg-red-50' : 'hover:bg-brown-50/50'}`}>
                    {/* Main row */}
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
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="text-xs font-semibold text-brown-600 border border-brown-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-brown-50 transition-colors flex items-center gap-1"
                        >
                          <Eye size={12} />View
                        </button>
                        <button
                          onClick={() => {
                            setDocInUseError(null)
                            if (isDocInUse(doc.id)) {
                              setDocInUseError(doc.id)
                              setConfirmDeleteDoc(null)
                            } else {
                              setConfirmDeleteDoc(confirmDeleteDoc === doc.id ? null : doc.id)
                            }
                          }}
                          title="Delete document"
                          className={`p-1.5 rounded-lg transition-colors ${confirmDeleteDoc === doc.id ? 'text-red-600 bg-red-100' : 'text-red-300 hover:text-red-600 hover:bg-red-50'}`}
                        >
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
                    {/* Inline delete confirmation */}
                    {confirmDeleteDoc === doc.id && (
                      <div className="px-6 py-3 bg-red-50 border-t border-red-100 space-y-2">
                        {docInUseError && confirmDeleteDoc === doc.id && (
                          <p className="text-xs text-red-700 font-semibold flex items-center gap-1">
                            ⚠️ {docInUseError}
                          </p>
                        )}
                        {!docInUseError && (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-red-700 font-medium">
                              Delete <strong>{doc.name}</strong>? This cannot be undone.
                            </p>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => { setConfirmDeleteDoc(null); setDocInUseError(null) }}
                                className="text-xs px-3 py-1.5 rounded-lg border border-brown-200 bg-white text-brown-600 hover:bg-brown-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  const inUse = state.tasks.some(t => (t.supportingDocs ?? []).includes(doc.id))
                                  if (inUse) {
                                    setDocInUseError(`"${doc.name}" is currently attached to one or more tasks and cannot be deleted.`)
                                    return
                                  }
                                  dispatch({ type: 'REMOVE_DOCUMENT', payload: { id: doc.id } })
                                  setConfirmDeleteDoc(null)
                                  setDocInUseError(null)
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                        {docInUseError && confirmDeleteDoc === doc.id && (
                          <button
                            onClick={() => { setConfirmDeleteDoc(null); setDocInUseError(null) }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-brown-200 bg-white text-brown-600 hover:bg-brown-50 transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TEMPLATES ═══ */}
        {activeSection === 'templates' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '💻', name: 'Software Developer',  tasks: 45, days: 30 },
              { icon: '📊', name: 'Sales Representative', tasks: 38, days: 21 },
              { icon: '📣', name: 'Marketing Manager',   tasks: 32, days: 21 },
              { icon: '🎨', name: 'UX/UI Designer',      tasks: 28, days: 14 },
              { icon: '⚙️', name: 'Operations Manager',  tasks: 40, days: 30 },
              { icon: '🤝', name: 'Customer Success',    tasks: 35, days: 21 },
            ].map(tmpl => (
              <div key={tmpl.name} className="card hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-4"><span className="text-3xl">{tmpl.icon}</span><div><h4 className="font-bold text-brown-900 text-sm">{tmpl.name}</h4><p className="text-xs text-brown-500">{tmpl.tasks} tasks · {tmpl.days} days</p></div></div>
                <div className="flex gap-2">
                  <button className="flex-1 btn-secondary text-xs py-2">Edit</button>
                  <button onClick={() => setShowAIChat(true)} className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1"><Bot size={11} />AI Generate</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {activeSection === 'analytics' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Avg Time to Productivity', value: '12 days', icon: <Clock size={20} />,    color: 'bg-blue-50 text-blue-600',     delta: '↓ 3 days vs last month' },
                { label: 'Task Completion Rate',     value: `${avgProg}%`, icon: <Activity size={20} />, color: 'bg-green-50 text-green-600',  delta: '↑ 8% vs last month'   },
                { label: 'Mentor Satisfaction',      value: '4.8/5',  icon: <Zap size={20} />,       color: 'bg-purple-50 text-purple-600', delta: 'Based on 12 reviews'  },
              ].map(m => (
                <div key={m.label} className="card flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${m.color}`}>{m.icon}</div>
                  <div><p className="text-xs text-brown-500 font-medium">{m.label}</p><p className="text-2xl font-black text-brown-900 leading-tight">{m.value}</p><p className="text-xs text-green-600 mt-0.5">{m.delta}</p></div>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-bold text-brown-900 mb-4 flex items-center gap-2"><BarChart3 size={16} />Onboarding by Team</h3>
                <div className="space-y-4">
                  {['Engineering', 'Product', 'Sales', 'Design'].map((team, i) => {
                    const emps = state.employees.filter(e => e.team === team)
                    const avg  = emps.length ? Math.round(emps.reduce((a, e) => a + getProgress(e), 0) / emps.length) : ([60,80,45,90] as number[])[i]
                    return (
                      <div key={team}>
                        <div className="flex justify-between mb-1.5"><span className="text-sm font-medium text-brown-700">{team}</span><span className="text-xs text-brown-500">{avg}%</span></div>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${avg}%` }} /></div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="card">
                <h3 className="font-bold text-brown-900 mb-4 flex items-center gap-2"><TrendingUp size={16} />Employee Status</h3>
                <div className="space-y-3">
                  {[
                    { label: 'On Track',  count: state.employees.filter(e => e.risk === 'low').length,              color: 'bg-green-500' },
                    { label: 'At Risk',   count: state.employees.filter(e => e.risk === 'high').length,             color: 'bg-red-400'   },
                    { label: 'Completed', count: state.employees.filter(e => e.status === 'completed').length,      color: 'bg-blue-400'  },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.color}`} />
                      <span className="text-sm text-brown-700 flex-1">{s.label}</span>
                      <span className="font-bold text-brown-900">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Unassigned employees callout */}
            {(() => {
              const unassigned = state.employees.filter(e => !hasTasks(e.id))
              if (unassigned.length === 0) return null
              return (
                <div className="card border-l-4 border-orange-400 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-orange-800 mb-2">Employees with no tasks assigned ({unassigned.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {unassigned.map(emp => (
                          <div key={emp.id} className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: emp.color }}>{emp.initials}</div>
                            <div>
                              <span className="text-xs font-semibold text-brown-800">{emp.name}</span>
                              <span className="text-xs text-orange-500 ml-1.5 font-medium">· No task assigned</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ═══ MENTORS ═══ */}
        {activeSection === 'mentors' && (() => {
          const mentors = state.mentors
          const getMentees = (mId: string) => state.employees.filter(e => e.mentorId === mId)
          const getMenteeAvgProgress = (mId: string) => {
            const mentees = getMentees(mId)
            if (!mentees.length) return 0
            return Math.round(mentees.reduce((a, e) => a + getProgress(e), 0) / mentees.length)
          }
          const totalMentees = mentors.reduce((a, m) => a + getMentees(m.id).length, 0)

          return (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid sm:grid-cols-2 gap-4 max-w-sm">
                {[
                  { label: 'Total Mentors', value: mentors.length, icon: <Users size={20} />,      color: 'bg-blue-50 text-blue-600'   },
                  { label: 'Total Mentees', value: totalMentees,   icon: <TrendingUp size={20} />, color: 'bg-green-50 text-green-600' },
                ].map(s => (
                  <div key={s.label} className="card flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
                    <div>
                      <p className="text-xs text-brown-500 font-medium">{s.label}</p>
                      <p className="font-bold text-brown-900 text-xl leading-tight">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Header + Add button */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-brown-900 flex items-center gap-2"><Users size={18} />All Mentors <span className="text-xs font-medium bg-brown-100 text-brown-600 px-2 py-0.5 rounded-full">{mentors.length}</span></h3>
                {!isHR && <button onClick={() => setShowAddMentor(true)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2"><Plus size={14} />Add Mentor</button>}
              </div>

              {/* Mentor cards */}
              {mentors.length === 0 ? (
                <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-brown-200">
                  <Users size={36} className="mx-auto mb-3 text-brown-300" />
                  <p className="text-brown-500 font-medium mb-2">No mentors added yet</p>
                  <button onClick={() => setShowAddMentor(true)} className="btn-primary text-sm py-2 px-5 inline-flex items-center gap-2"><Plus size={14} />Add First Mentor</button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mentors.map(mentor => {
                    const mentees   = getMentees(mentor.id)
                    const avgPct    = getMenteeAvgProgress(mentor.id)
                    const atRiskCt  = mentees.filter(e => e.risk === 'high').length
                    return (
                      <div key={mentor.id} className="card flex flex-col gap-4">
                        {/* Avatar + info */}
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm" style={{ background: mentor.color }}>
                            {mentor.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-brown-900 text-sm truncate">{mentor.name}</p>
                            <p className="text-xs text-brown-500 truncate">{mentor.specialty}</p>
                            <span className="inline-block mt-1 text-xs font-semibold bg-brown-100 text-brown-600 px-2 py-0.5 rounded-full">{mentor.department}</span>
                          </div>
                          {!isHR && (
                            <button
                              onClick={() => setConfirmRemoveMentor(mentor)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                              title="Remove mentor"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Mentees stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-brown-50 rounded-lg p-2">
                            <p className="font-bold text-brown-900">{mentees.length}</p>
                            <p className="text-xs text-brown-500">Mentees</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="font-bold text-green-700">{mentees.filter(e => e.status === 'completed').length}</p>
                            <p className="text-xs text-brown-500">Completed</p>
                          </div>
                          <div className={`rounded-lg p-2 ${atRiskCt > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                            <p className={`font-bold ${atRiskCt > 0 ? 'text-red-600' : 'text-green-700'}`}>{atRiskCt}</p>
                            <p className="text-xs text-brown-500">At Risk</p>
                          </div>
                        </div>

                        {/* Avg progress bar */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs font-medium text-brown-600">Avg. Mentee Progress</span>
                            <span className="text-xs font-bold text-brown-800">{avgPct}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${avgPct}%` }} />
                          </div>
                        </div>

                        {/* Mentee list */}
                        {mentees.length > 0 && (
                          <div className="border-t border-brown-100 pt-3">
                            <p className="text-xs font-semibold text-brown-500 mb-2">Current Mentees</p>
                            <div className="space-y-1.5">
                              {mentees.map(e => (
                                <div key={e.id} className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: e.color }}>{e.initials}</div>
                                  <span className="text-xs text-brown-700 flex-1 truncate">{e.name}</span>
                                  <span className={`text-xs font-semibold ${e.risk === 'high' ? 'text-red-500' : 'text-green-600'}`}>{getProgress(e)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {mentees.length === 0 && (
                          <p className="text-xs text-brown-400 text-center py-1">No mentees assigned yet</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ═══ INTEGRATIONS ═══ */}
        {activeSection === 'integrations' && (
          <div className="space-y-5">
            <p className="text-brown-500 text-sm">Connect OnboardEase with your existing tools for seamless data sync.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Slack',            icon: <Slack size={24} />,        desc: 'Send onboarding notifications',   connected: true,  color: 'bg-purple-50 text-purple-600' },
                { name: 'GitHub',           icon: <GitBranch size={24} />,    desc: 'Provision repo access on Day 1',  connected: false, color: 'bg-gray-50 text-gray-600'     },
                { name: 'Google Workspace', icon: <Globe size={24} />,        desc: 'Sync calendar & Drive access',    connected: true,  color: 'bg-blue-50 text-blue-600'     },
                { name: 'Jira',             icon: <ClipboardList size={24} />,desc: 'Auto-create onboarding tickets',  connected: false, color: 'bg-blue-50 text-blue-700'     },
                { name: 'Okta',             icon: <Lock size={24} />,         desc: 'SSO and identity management',     connected: false, color: 'bg-red-50 text-red-600'       },
                { name: 'Zapier',           icon: <Zap size={24} />,          desc: 'Automate with 5,000+ apps',       connected: false, color: 'bg-orange-50 text-orange-600' },
              ].map(intg => (
                <div key={intg.name} className="card flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${intg.color}`}>{intg.icon}</div>
                    <div><p className="font-bold text-brown-900 text-sm">{intg.name}</p><p className="text-xs text-brown-500">{intg.desc}</p></div>
                  </div>
                  <button className={`w-full text-xs font-semibold py-2 rounded-lg border transition-colors ${intg.connected ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'btn-secondary'}`}>
                    {intg.connected ? '✓ Connected' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ COMPLIANCE ═══ */}
        {activeSection === 'compliance' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Compliance Score', value: '94%',                icon: <Shield size={20} />,        color: 'text-green-600', bg: 'bg-green-50'                             },
                { label: 'Policies Signed',  value: `${state.employees.length * 3}`, icon: <FileText size={20} />, color: 'text-blue-600', bg: 'bg-blue-50'                        },
                { label: 'Pending Actions',  value: `${atRisk}`,          icon: <AlertTriangle size={20} />, color: atRisk > 0 ? 'text-red-600' : 'text-green-600', bg: atRisk > 0 ? 'bg-red-50' : 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className="card flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg} ${s.color}`}>{s.icon}</div>
                  <div><p className="text-xs text-brown-500">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="font-bold text-brown-900 mb-4 flex items-center gap-2"><ClipboardList size={16} />Compliance Checklist</h3>
              <div className="space-y-3">
                {[
                  { label: 'GDPR Data Processing Agreement',       done: true  },
                  { label: 'Employee handbook acknowledgement',     done: true  },
                  { label: 'IT Security policy training',           done: true  },
                  { label: 'Background check completed',            done: false },
                  { label: 'SOC 2 access provisioning audit',       done: true  },
                  { label: 'CCPA data rights notification sent',    done: false },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${item.done ? 'border-green-100 bg-green-50' : 'border-orange-100 bg-orange-50'}`}>
                    {item.done ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" /> : <Clock size={16} className="text-orange-500 flex-shrink-0" />}
                    <span className={`text-sm font-medium ${item.done ? 'text-green-800' : 'text-orange-800'}`}>{item.label}</span>
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${item.done ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{item.done ? 'Complete' : 'Pending'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {activeSection === 'settings' && <SettingsSection />}

      </div>

      {showAddEmployee   && <AddEmployeeModal onClose={() => setShowAddEmployee(false)} />}
      {showAddMentor     && <AddMentorModal   onClose={() => setShowAddMentor(false)} />}
      {selectedEmployee  && <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}
      {viewingDoc        && <PDFViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
      {showBulkGenerate  && <BulkTaskGenerationModal onClose={() => setShowBulkGenerate(false)} />}

      {/* ── Remove Mentor Confirmation ── */}
      {confirmRemoveMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setConfirmRemoveMentor(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0"><Trash2 size={18} className="text-red-600" /></div>
              <div><h3 className="font-bold text-brown-900">Remove Mentor</h3><p className="text-xs text-brown-500">This action cannot be undone</p></div>
            </div>
            <p className="text-sm text-brown-700 mb-5">
              Remove <strong>{confirmRemoveMentor.name}</strong> as a mentor? Any employees assigned to them will be unassigned.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemoveMentor(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button
                onClick={() => { dispatch({ type: 'REMOVE_MENTOR', payload: { id: confirmRemoveMentor.id } }); setConfirmRemoveMentor(null) }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Employee Confirmation ── */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setConfirmRemove(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-brown-900">Remove Employee</h3>
                <p className="text-xs text-brown-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-brown-700 mb-5">
              Are you sure you want to remove <strong>{confirmRemove.name}</strong> ({confirmRemove.role}) from the organization? All their assigned tasks will also be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 btn-secondary py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'REMOVE_EMPLOYEE', payload: { id: confirmRemove.id } })
                  setConfirmRemove(null)
                  if (selectedEmployee?.id === confirmRemove.id) setSelectedEmployee(null)
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {showAIChat && (
        <AIDocumentChat
          onClose={() => { setShowAIChat(false); setSelectedDoc(undefined) }}
          assignedBy="admin"
          assignedByName="Admin"
          preselectedDocId={selectedDoc}
        />
      )}
    </div>
  )
}
