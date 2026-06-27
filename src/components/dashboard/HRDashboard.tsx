import { useState } from 'react'
import {
  Users, CheckCircle, AlertTriangle, Sparkles,
  Search, ListChecks, Bot, FileText, BookOpen, Upload,
  BarChart3, Clock, ChevronRight
} from 'lucide-react'
import { useApp, initialMentors } from '../../context/AppContext'
import AIDocumentChat from '../chat/AIDocumentChat'
import AssignTaskModal from '../modals/AssignTaskModal'

const TABS = ['Overview', 'Employees & Tasks', 'Documents', 'Analytics']

export default function HRDashboard() {
  const { state } = useApp()
  const [activeTab, setActiveTab]           = useState('Overview')
  const [search, setSearch]                 = useState('')
  const [showAIChat, setShowAIChat]         = useState(false)
  const [selectedDocForChat, setSelectedDocForChat] = useState<string | undefined>()
  const [selectedEmployee, setSelectedEmployee]     = useState<string | null>(null)
  const [showQuickAssign, setShowQuickAssign]       = useState(false)

  const filtered = state.employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  const getMentorName = (id: string | null) =>
    id ? initialMentors.find(m => m.id === id)?.name ?? '—' : 'Unassigned'

  const getEmployeeTasks = (empId: string) => state.tasks.filter(t => t.assignedTo === empId)

  return (
    <div className="min-h-screen" style={{ background: '#F0F7FF' }}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Users size={20} />, label: 'Active New Hires', value: state.employees.filter(e => e.status === 'onboarding').length, color: 'bg-blue-50 text-blue-600' },
            { icon: <ListChecks size={20} />, label: 'Total Tasks Assigned', value: state.tasks.length, color: 'bg-purple-50 text-purple-600' },
            { icon: <CheckCircle size={20} />, label: 'Tasks Completed', value: state.tasks.filter(t => t.status === 'done').length, color: 'bg-green-50 text-green-600' },
            { icon: <AlertTriangle size={20} />, label: 'At-Risk Hires', value: state.employees.filter(e => e.risk === 'high').length, color: 'bg-red-50 text-red-600' },
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

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 bg-white border border-brown-200 rounded-xl p-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab ? 'bg-brown-500 text-white shadow-sm' : 'text-brown-600 hover:bg-brown-50'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'Overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* AI CTA */}
              <div className="bg-gradient-to-br from-purple-700 to-purple-900 rounded-2xl p-6 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={22} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">AI Onboarding Task Generator</h3>
                    <p className="text-white/80 text-sm leading-relaxed mb-4">
                      Select a document (employee handbook, IT policy, etc.), chat with our AI, and instantly generate a task checklist you can assign to any new hire.
                    </p>
                    <button onClick={() => setShowAIChat(true)}
                      className="bg-white text-purple-900 font-bold px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors text-sm flex items-center gap-2">
                      <Bot size={16} /> Open AI Chat & Generate Tasks
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent tasks */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-brown-900 flex items-center gap-2"><ListChecks size={18} />Recently Assigned Tasks</h3>
                  <button onClick={() => setActiveTab('Employees & Tasks')} className="text-xs text-brown-500 hover:text-brown-800 font-medium flex items-center gap-1">
                    View all <ChevronRight size={13} />
                  </button>
                </div>
                <div className="space-y-2">
                  {state.tasks.slice(-6).reverse().map(task => {
                    const emp = state.employees.find(e => e.id === task.assignedTo)
                    return (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border border-brown-100 hover:bg-brown-50/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-green-500' : task.status === 'in-progress' ? 'bg-brown-500' : 'bg-brown-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-brown-800 truncate">{task.title}</p>
                          <p className="text-xs text-brown-400">{emp?.name ?? 'Unknown'} · by {task.assignedByName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="badge-brown text-xs">{task.category}</span>
                          {task.status === 'done' && <CheckCircle size={14} className="text-green-500" />}
                        </div>
                      </div>
                    )
                  })}
                  {state.tasks.length === 0 && (
                    <p className="text-center text-brown-400 text-sm py-6">No tasks assigned yet. Use the AI chat to generate tasks!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: quick docs */}
            <div className="space-y-5">
              <div className="card">
                <h3 className="font-bold text-brown-900 mb-4 flex items-center gap-2"><FileText size={16} />Documents</h3>
                <div className="space-y-2">
                  {state.documents.slice(0, 5).map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => { setSelectedDocForChat(doc.id); setShowAIChat(true) }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-brown-50 transition-colors group text-left"
                    >
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center border border-red-200 flex-shrink-0">
                        <BookOpen size={14} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brown-800 truncate">{doc.name}</p>
                        <p className="text-xs text-brown-400">{doc.type} · {doc.size}</p>
                      </div>
                      <Bot size={14} className="text-brown-400 group-hover:text-brown-700 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowAIChat(true)} className="w-full mt-3 text-xs font-semibold text-brown-600 border border-brown-200 py-2 rounded-lg hover:bg-brown-50 transition-colors flex items-center justify-center gap-1">
                  <Upload size={12} /> Upload & Process New Document
                </button>
              </div>

              <div className="card">
                <h3 className="font-bold text-brown-900 mb-4">Mentor Overview</h3>
                <div className="space-y-3">
                  {initialMentors.map(mentor => {
                    const menteeCount = state.employees.filter(e => e.mentorId === mentor.id).length
                    return (
                      <div key={mentor.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: mentor.color }}>{mentor.initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-brown-900">{mentor.name}</p>
                          <p className="text-xs text-brown-500">{menteeCount} mentee{menteeCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Employees & Tasks ── */}
        {activeTab === 'Employees & Tasks' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative max-w-sm w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
                <input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" />
              </div>
              <button onClick={() => setShowAIChat(true)} className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-sm">
                <Bot size={16} /> Generate & Assign Tasks
              </button>
            </div>

            <div className="space-y-4">
              {filtered.map(emp => {
                const myTasks = getEmployeeTasks(emp.id)
                const done = myTasks.filter(t => t.status === 'done').length
                const isExpanded = selectedEmployee === emp.id
                return (
                  <div key={emp.id} className="card hover:shadow-md transition-all duration-200">
                    <div
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() => setSelectedEmployee(isExpanded ? null : emp.id)}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: emp.color }}>{emp.initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-brown-900">{emp.name}</h4>
                          {emp.risk === 'high' && <AlertTriangle size={14} className="text-red-500" />}
                        </div>
                        <p className="text-sm text-brown-500">{emp.role} · Mentor: {getMentorName(emp.mentorId)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-32 progress-bar">
                            <div className="progress-fill" style={{ width: `${emp.progress}%` }} />
                          </div>
                          <span className="text-xs text-brown-500">{emp.progress}% · Day {emp.day}/{emp.totalDays}</span>
                          <span className="badge-brown text-xs">{done}/{myTasks.length} tasks done</span>
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedEmployee(emp.id); setShowQuickAssign(true) }}
                        className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Sparkles size={13} /> Assign Tasks
                      </button>
                    </div>

                    {isExpanded && myTasks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-brown-100 space-y-2 animate-fade-in">
                        <p className="text-xs font-semibold text-brown-600 mb-2">Assigned Tasks ({myTasks.length})</p>
                        {myTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-brown-50 border border-brown-100">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-green-500' : task.status === 'in-progress' ? 'bg-brown-500' : 'bg-brown-300'}`} />
                            <p className="text-sm text-brown-800 flex-1 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="badge-brown text-xs py-0.5">{task.category}</span>
                              <span className="flex items-center gap-1 text-xs text-brown-400"><Clock size={10} />{task.estimatedTime}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded && myTasks.length === 0 && (
                      <div className="mt-4 pt-4 border-t border-brown-100 text-center py-4 text-brown-400 text-sm animate-fade-in">
                        No tasks assigned yet. <button onClick={() => { setSelectedEmployee(emp.id); setShowAIChat(true) }} className="text-brown-600 underline">Generate with AI</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Documents ── */}
        {activeTab === 'Documents' && (
          <div className="space-y-5">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
              <Bot size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-800 text-sm">AI Document Intelligence</p>
                <p className="text-purple-700 text-xs mt-1">Click "Generate Tasks" on any document to open the AI chat and create an onboarding task list from it.</p>
              </div>
            </div>
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-brown-100 flex justify-between items-center">
                <h3 className="font-bold text-brown-900">All Documents</h3>
                <button onClick={() => setShowAIChat(true)} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"><Upload size={12} /> Upload New</button>
              </div>
              <div className="divide-y divide-brown-100">
                {state.documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-brown-50/50 transition-colors">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-200 flex-shrink-0">
                      <BookOpen size={18} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brown-900 text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-brown-400">{doc.type} · {doc.size} · Uploaded {doc.date}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {doc.status === 'processed'
                        ? <span className="badge-green flex items-center gap-1"><CheckCircle size={11} /> Processed</span>
                        : <span className="badge-orange">Processing…</span>}
                      <button onClick={() => { setSelectedDocForChat(doc.id); setShowAIChat(true) }}
                        className="text-xs font-semibold text-purple-600 border border-purple-200 bg-white px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1">
                        <Sparkles size={12} /> Generate Tasks
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Analytics ── */}
        {activeTab === 'Analytics' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <h3 className="font-bold text-brown-900 mb-5 flex items-center gap-2"><BarChart3 size={18} />Task Completion by Employee</h3>
              <div className="space-y-4">
                {state.employees.map(emp => {
                  const myTasks = getEmployeeTasks(emp.id)
                  const done = myTasks.filter(t => t.status === 'done').length
                  const pct  = myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : 0
                  return (
                    <div key={emp.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: emp.color }}>{emp.initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-brown-800 truncate">{emp.name}</span>
                          <span className="text-xs text-brown-500 ml-2 flex-shrink-0">{done}/{myTasks.length} tasks · {pct}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Tasks by Admin', value: state.tasks.filter(t => t.assignedBy === 'admin').length, color: 'text-brown-600 bg-brown-50' },
                { label: 'Tasks by HR', value: state.tasks.filter(t => t.assignedBy === 'hr').length, color: 'text-purple-600 bg-purple-50' },
                { label: 'Tasks by Mentors', value: state.tasks.filter(t => t.assignedBy === 'mentor').length, color: 'text-teal-600 bg-teal-50' },
                { label: 'Completed Tasks', value: state.tasks.filter(t => t.status === 'done').length, color: 'text-green-600 bg-green-50' },
                { label: 'Pending Tasks', value: state.tasks.filter(t => t.status === 'pending').length, color: 'text-orange-600 bg-orange-50' },
              ].map(item => (
                <div key={item.label} className={`rounded-xl p-4 ${item.color} border border-current/20`}>
                  <p className="text-2xl font-black">{item.value}</p>
                  <p className="text-sm font-medium opacity-80">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAIChat && (
        <AIDocumentChat
          onClose={() => { setShowAIChat(false); setSelectedDocForChat(undefined) }}
          assignedBy="hr"
          assignedByName="HR Team"
          preselectedDocId={selectedDocForChat}
        />
      )}
      {showQuickAssign && selectedEmployee && (
        <AssignTaskModal
          tasks={[{ title: 'Placeholder', description: 'Use AI chat to generate tasks', category: 'General', estimatedTime: '30 min' }]}
          preselectedEmployeeId={selectedEmployee}
          onClose={() => { setShowQuickAssign(false) }}
          assignedBy="hr"
          assignedByName="HR Team"
        />
      )}
      {/* OnboardBotWidget is mounted at the HRPage level */}
    </div>
  )
}
