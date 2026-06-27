import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users, UserCheck, User, ArrowRight, ChevronLeft } from 'lucide-react'
import Logo from '../components/common/Logo'
import { useApp, initialMentors, USER_UUIDS } from '../context/AppContext'

type RoleStep = 'pick-role' | 'pick-mentor' | 'pick-employee'

const ROLE_CARDS = [
  {
    role: 'admin' as const,
    title: 'Admin',
    description: 'Manage employees, assign mentors, upload documents, and configure the platform.',
    icon: <Shield size={32} />,
    color: 'from-brown-700 to-brown-900',
    bg: 'bg-white/80 border-brown-300',
  },
  {
    role: 'hr' as const,
    title: 'HR Manager',
    description: 'View all employees, assign tasks, use AI to generate onboarding plans from documents.',
    icon: <Users size={32} />,
    color: 'from-purple-600 to-purple-800',
    bg: 'bg-white/80 border-purple-300',
  },
  {
    role: 'mentor' as const,
    title: 'Mentor / Buddy',
    description: 'Track your assigned mentees, view their resumes, and create AI-personalized task lists.',
    icon: <UserCheck size={32} />,
    color: 'from-teal-600 to-teal-800',
    bg: 'bg-white/80 border-teal-300',
  },
  {
    role: 'employee' as const,
    title: 'New Hire',
    description: 'View your onboarding tasks, track progress, chat with AI assistant, and complete your journey.',
    icon: <User size={32} />,
    color: 'from-green-600 to-green-800',
    bg: 'bg-white/80 border-green-300',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { state, dispatch } = useApp()
  const [step, setStep] = useState<RoleStep>('pick-role')
  const [selectedRole, setSelectedRole] = useState<typeof ROLE_CARDS[0] | null>(null)

  const handleRoleClick = (card: typeof ROLE_CARDS[0]) => {
    if (card.role === 'mentor') {
      setSelectedRole(card)
      setStep('pick-mentor')
    } else if (card.role === 'employee') {
      setSelectedRole(card)
      setStep('pick-employee')
    } else if (card.role === 'admin') {
      dispatch({ type: 'SET_ROLE', payload: { role: 'admin', userId: USER_UUIDS.ADMIN } })
      navigate(`/admin/${USER_UUIDS.ADMIN}`)
    } else if (card.role === 'hr') {
      dispatch({ type: 'SET_ROLE', payload: { role: 'hr', userId: USER_UUIDS.HR } })
      navigate(`/hr/${USER_UUIDS.HR}`)
    }
  }

  const handleMentorSelect = (mentorId: string) => {
    dispatch({ type: 'SET_ROLE', payload: { role: 'mentor', userId: mentorId } })
    navigate(`/mentor/${mentorId}`)
  }

  const handleEmployeeSelect = (employeeId: string) => {
    dispatch({ type: 'SET_ROLE', payload: { role: 'employee', userId: employeeId } })
    navigate(`/new-hire/${employeeId}`)
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Pastel blue overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(219,238,255,0.91) 0%, rgba(176,214,255,0.87) 50%, rgba(195,224,255,0.92) 100%)',
        }}
      />

      {/* ── Back button — top left ── */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-white/70 hover:bg-white text-brown-700 hover:text-brown-900 font-semibold text-sm px-4 py-2 rounded-full border border-brown-200 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md"
      >
        <ChevronLeft size={16} />
        Back to home
      </button>

      {/* ── Content ── */}
      <div className="relative z-10 w-full flex flex-col items-center">

        {/* Logo */}
        <div className="mb-10 text-center">
          <Logo size="lg" />
          <p className="text-brown-600 text-sm mt-2 font-medium">Effortless onboarding for growing teams</p>
        </div>

        {/* ── Step: Pick Role ── */}
        {step === 'pick-role' && (
          <div className="w-full max-w-4xl animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-brown-900 mb-2">Choose your role to continue</h2>
              <p className="text-brown-600 text-sm">No password needed — just select who you are</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {ROLE_CARDS.map(card => (
                <button
                  key={card.role}
                  onClick={() => handleRoleClick(card)}
                  className={`group relative text-left p-6 rounded-2xl border-2 backdrop-blur-sm ${card.bg} hover:shadow-xl transition-all duration-200 hover:-translate-y-1`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-brown-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-brown-600 leading-relaxed">{card.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-brown-500 group-hover:text-brown-800 transition-colors font-semibold text-sm">
                    Enter as {card.title} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Pick Mentor ── */}
        {step === 'pick-mentor' && (
          <div className="w-full max-w-lg animate-fade-in">
            <button
              onClick={() => setStep('pick-role')}
              className="flex items-center gap-2 text-brown-600 hover:text-brown-900 mb-6 font-medium text-sm transition-colors"
            >
              <ChevronLeft size={16} /> Back to roles
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-brown-900 mb-2">Select your Mentor profile</h2>
              <p className="text-brown-600 text-sm">Choose which mentor you are logging in as</p>
            </div>
            <div className="space-y-3">
              {initialMentors.map(mentor => {
                const assignedCount = state.employees.filter(e => e.mentorId === mentor.id).length
                return (
                  <button
                    key={mentor.id}
                    onClick={() => handleMentorSelect(mentor.id)}
                    className="w-full flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-brown-200 hover:border-teal-400 hover:bg-white transition-all duration-200 group text-left"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: mentor.color }}>
                      {mentor.initials}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-brown-900">{mentor.name}</p>
                      <p className="text-sm text-brown-500">{mentor.specialty}</p>
                      <p className="text-xs text-teal-600 font-medium mt-0.5">{assignedCount} mentee{assignedCount !== 1 ? 's' : ''} assigned</p>
                    </div>
                    <ArrowRight size={18} className="text-brown-300 group-hover:text-teal-600 group-hover:translate-x-1 transition-all duration-200" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step: Pick Employee ── */}
        {step === 'pick-employee' && (
          <div className="w-full max-w-lg animate-fade-in">
            <button
              onClick={() => setStep('pick-role')}
              className="flex items-center gap-2 text-brown-600 hover:text-brown-900 mb-6 font-medium text-sm transition-colors"
            >
              <ChevronLeft size={16} /> Back to roles
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-brown-900 mb-2">Select your Employee profile</h2>
              <p className="text-brown-600 text-sm">Choose which new hire you are logging in as</p>
            </div>
            <div className="space-y-3">
              {state.employees.map(emp => {
                const mentor = initialMentors.find(m => m.id === emp.mentorId)
                const myTasks = state.tasks.filter(t => t.assignedTo === emp.id)
                const done = myTasks.filter(t => t.status === 'done').length
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleEmployeeSelect(emp.id)}
                    className="w-full flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-brown-200 hover:border-green-400 hover:bg-white transition-all duration-200 group text-left"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: emp.color }}>
                      {emp.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-brown-900">{emp.name}</p>
                      <p className="text-sm text-brown-500">{emp.role}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-brown-400">Day {emp.day}/30</span>
                        <span className="text-brown-300">·</span>
                        <span className="text-xs text-green-600 font-medium">{done}/{myTasks.length} tasks done</span>
                        {mentor && <><span className="text-brown-300">·</span><span className="text-xs text-brown-400">Mentor: {mentor.name}</span></>}
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-brown-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all duration-200" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <p className="mt-10 text-xs text-brown-500 text-center relative z-10">
          Demo environment — explore all features freely.
        </p>
      </div>
    </div>
  )
}
