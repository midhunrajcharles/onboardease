import { useState } from 'react'
import { X, Camera, Save, Building2, Mail, Shield, User, Eye, EyeOff } from 'lucide-react'
import { useApp, initialMentors } from '../../context/AppContext'

interface Props { onClose: () => void }

export default function ProfileModal({ onClose }: Props) {
  const { state } = useApp()
  const { currentRole, currentUserId, employees } = state

  const mentorInfo = initialMentors.find(m => m.id === currentUserId)
  const empInfo    = employees.find(e => e.id === currentUserId)

  const getRoleLabel = () => {
    switch (currentRole) {
      case 'admin':    return 'Administrator'
      case 'hr':       return 'HR Manager'
      case 'mentor':   return 'Mentor / Buddy'
      case 'employee': return 'New Hire'
      default:         return 'User'
    }
  }

  const getDisplayName = () => {
    if (currentRole === 'mentor')   return mentorInfo?.name ?? 'Mentor'
    if (currentRole === 'employee') return empInfo?.name ?? 'Employee'
    if (currentRole === 'admin')    return 'Admin User'
    return 'HR Manager'
  }

  const getInitials = () => {
    if (currentRole === 'mentor')   return mentorInfo?.initials ?? 'M'
    if (currentRole === 'employee') return empInfo?.initials ?? 'NH'
    if (currentRole === 'admin')    return 'A'
    return 'HR'
  }

  const getColor = () => {
    if (currentRole === 'mentor')   return mentorInfo?.color ?? '#2B85DC'
    if (currentRole === 'employee') return empInfo?.color ?? '#2B85DC'
    return '#2B85DC'
  }

  const getEmail = () => {
    if (currentRole === 'employee') return empInfo?.email ?? 'user@company.com'
    if (currentRole === 'mentor')   return `${mentorInfo?.name?.toLowerCase().replace(' ', '.') ?? 'mentor'}@company.com`
    if (currentRole === 'admin')    return 'admin@acmecorp.com'
    return 'hr@acmecorp.com'
  }

  const [form, setForm]       = useState({ name: getDisplayName(), email: getEmail(), company: 'Acme Corp', industry: 'SaaS / Software', password: '', confirmPassword: '' })
  const [showPw, setShowPw]   = useState(false)
  const [showCPw, setShowCPw] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [pwError, setPwError] = useState('')

  const handleSave = () => {
    if (form.password && form.password !== form.confirmPassword) {
      setPwError('Passwords do not match')
      return
    }
    setPwError('')
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-100">
          <h2 className="font-bold text-brown-900 text-lg">My Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-500 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">

          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ background: getColor() }}>
                {getInitials()}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-brown-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-brown-600 transition-colors">
                <Camera size={12} />
              </button>
            </div>
            <div>
              <p className="font-bold text-brown-900 text-lg">{form.name}</p>
              <span className="inline-flex items-center gap-1.5 bg-brown-100 text-brown-700 text-xs font-semibold px-2.5 py-1 rounded-full mt-1">
                <Shield size={11} /> {getRoleLabel()}
              </span>
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h3 className="text-xs font-semibold text-brown-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <User size={12} /> Personal Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Display Name</label>
                <input className="input-field text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
                  <input className="input-field text-sm pl-9" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Role</label>
                <input className="input-field text-sm bg-brown-50 text-brown-400 cursor-not-allowed" value={getRoleLabel()} readOnly />
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div>
            <h3 className="text-xs font-semibold text-brown-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 size={12} /> Company Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Company Name</label>
                <input className="input-field text-sm" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Industry</label>
                <input className="input-field text-sm" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <h3 className="text-xs font-semibold text-brown-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Shield size={12} /> Change Password
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} placeholder="Leave blank to keep current" className="input-field text-sm pr-10" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brown-600 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input type={showCPw ? 'text' : 'password'} placeholder="Confirm new password" className="input-field text-sm pr-10" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                  <button type="button" onClick={() => setShowCPw(!showCPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600">
                    {showCPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwError && <p className="text-xs text-red-500 mt-1">{pwError}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brown-100 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary text-sm py-2.5">Cancel</button>
          <button onClick={handleSave} className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2">
            {saved ? '✓ Saved!' : <><Save size={14} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
