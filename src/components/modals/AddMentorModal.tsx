import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface Props { onClose: () => void }

const PALETTE = [
  '#2B85DC', '#4EA0EB', '#7DBCF5', '#1F6EC4', '#1558A8',
  '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
]

const DEPARTMENTS = ['Engineering', 'Product', 'Sales', 'Design', 'Marketing', 'Operations', 'HR', 'Finance']

export default function AddMentorModal({ onClose }: Props) {
  const { dispatch } = useApp()
  const [name,       setName]       = useState('')
  const [specialty,  setSpecialty]  = useState('')
  const [department, setDepartment] = useState(DEPARTMENTS[0])
  const [color,      setColor]      = useState(PALETTE[0])
  const [error,      setError]      = useState('')

  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim())      { setError('Name is required.');      return }
    if (!specialty.trim()) { setError('Specialty is required.'); return }

    dispatch({
      type: 'ADD_MENTOR',
      payload: {
        id:         `mentor-${Date.now()}`,
        name:       name.trim(),
        specialty:  specialty.trim(),
        department,
        initials:   initials || name.trim().slice(0, 2).toUpperCase(),
        color,
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brown-100 rounded-xl flex items-center justify-center">
              <UserPlus size={18} className="text-brown-600" />
            </div>
            <div>
              <h2 className="font-bold text-brown-900">Add New Mentor</h2>
              <p className="text-xs text-brown-500">They'll be available for employee assignment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
            style={{ background: color }}
          >
            {initials || '??'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Full Name *</label>
            <input
              type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Alex Rivera"
              className="input-field text-sm py-2.5"
            />
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Specialty *</label>
            <input
              type="text" value={specialty} onChange={e => { setSpecialty(e.target.value); setError('') }}
              placeholder="e.g. Frontend Engineering & Mentoring"
              className="input-field text-sm py-2.5"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-1.5">Department</label>
            <select
              value={department} onChange={e => setDepartment(e.target.value)}
              className="input-field text-sm py-2.5"
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-brown-600 mb-2">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-brown-500 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
            <button type="submit" className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
              <UserPlus size={15} /> Add Mentor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
