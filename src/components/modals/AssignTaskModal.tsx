import { useState } from 'react'
import { X, CheckCircle, User } from 'lucide-react'
import { useApp, Task } from '../../context/AppContext'

interface ParsedTask { title: string; description: string; category: string; estimatedTime: string }

interface Props {
  tasks: ParsedTask[]
  onClose: () => void
  preselectedEmployeeId?: string
  assignedBy: 'admin' | 'hr' | 'mentor'
  assignedByName: string
}

export default function AssignTaskModal({ tasks, onClose, preselectedEmployeeId, assignedBy, assignedByName }: Props) {
  const { state, dispatch } = useApp()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(preselectedEmployeeId ?? '')
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>(tasks.map((_, i) => i))
  const [saved, setSaved] = useState(false)

  const toggleTask = (i: number) =>
    setSelectedTaskIds(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const handleAssign = async () => {
    if (!selectedEmployeeId || selectedTaskIds.length === 0) return
    const now = new Date().toISOString().split('T')[0]
    const newTasks: Task[] = selectedTaskIds.map((ti, idx) => ({
      id: `task-${Date.now()}-${idx}`,
      title: tasks[ti].title,
      description: tasks[ti].description,
      category: tasks[ti].category,
      estimatedTime: tasks[ti].estimatedTime,
      assignedTo: selectedEmployeeId,
      assignedBy,
      assignedByName,
      status: 'pending',
      createdAt: now,
    }))
    dispatch({ type: 'ADD_TASKS', payload: newTasks })
    setSaved(true)
    setTimeout(onClose, 1500)
  }

  if (saved) return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm w-full animate-bounce-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-brown-900 mb-2">{selectedTaskIds.length} Tasks Assigned!</h3>
        <p className="text-brown-500 text-sm">The employee will see these tasks in their dashboard.</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4 animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-brown-200 bg-gradient-to-r from-brown-500 to-brown-700 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">Assign Tasks to Employee</h2>
            <p className="text-white/70 text-sm mt-0.5">Select tasks and pick an employee</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Employee selector */}
          <div>
            <label className="block text-sm font-semibold text-brown-800 mb-2 flex items-center gap-1.5">
              <User size={14} /> Select Employee *
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {state.employees.filter(e => e.status === 'onboarding').map(emp => (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedEmployeeId === emp.id ? 'border-brown-500 bg-brown-50' : 'border-brown-200 hover:border-brown-300'
                  }`}
                >
                  <input type="radio" name="employee" value={emp.id} checked={selectedEmployeeId === emp.id} onChange={() => setSelectedEmployeeId(emp.id)} className="sr-only" />
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: emp.color }}>
                    {emp.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brown-900 text-sm">{emp.name}</p>
                    <p className="text-xs text-brown-500">{emp.role}</p>
                  </div>
                  {selectedEmployeeId === emp.id && <CheckCircle size={14} className="text-brown-500 flex-shrink-0" />}
                </label>
              ))}
            </div>
          </div>

          {/* Task selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-brown-800">
                Select Tasks ({selectedTaskIds.length}/{tasks.length} selected)
              </label>
              <button
                onClick={() => setSelectedTaskIds(selectedTaskIds.length === tasks.length ? [] : tasks.map((_, i) => i))}
                className="text-xs text-brown-500 hover:text-brown-800 font-medium"
              >
                {selectedTaskIds.length === tasks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tasks.map((task, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedTaskIds.includes(i) ? 'border-brown-400 bg-brown-50' : 'border-brown-100 hover:border-brown-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 ${
                    selectedTaskIds.includes(i) ? 'bg-brown-500 border-brown-500' : 'border-brown-300'
                  }`}>
                    {selectedTaskIds.includes(i) && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" checked={selectedTaskIds.includes(i)} onChange={() => toggleTask(i)} className="sr-only" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brown-900 text-sm leading-snug">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="badge-brown text-xs py-0.5">{task.category}</span>
                      <span className="text-xs text-brown-400">{task.estimatedTime}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">Cancel</button>
          <button
            onClick={handleAssign}
            disabled={!selectedEmployeeId || selectedTaskIds.length === 0}
            className="flex-1 btn-primary py-3 disabled:opacity-50"
          >
            Assign {selectedTaskIds.length} Task{selectedTaskIds.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
