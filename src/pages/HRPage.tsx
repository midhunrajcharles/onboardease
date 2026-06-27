import { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText,
  BarChart3, Settings, ChevronLeft, ChevronRight, GraduationCap, MessageSquare
} from 'lucide-react'
import Navbar from '../components/common/Navbar'
import AdminPanel from '../components/dashboard/AdminPanel'
import ChatTab, { useChatUnread } from '../components/chat/ChatTab'
import ProfileModal from '../components/modals/ProfileModal'
import Logo from '../components/common/Logo'
import OnboardBotWidget from '../components/chat/OnboardBotWidget'
import { useApp, USER_UUIDS } from '../context/AppContext'

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={20} />, label: 'Overview',  id: 'overview'  },
  { icon: <Users size={20} />,           label: 'Employees', id: 'employees' },
  { icon: <FileText size={20} />,        label: 'Documents', id: 'docs'      },
  { icon: <GraduationCap size={20} />,   label: 'Mentors',   id: 'mentors'   },
  { icon: <BarChart3 size={20} />,       label: 'Analytics', id: 'analytics' },
  { icon: <MessageSquare size={20} />,   label: 'Chat',      id: 'chat'      },
  { icon: <Settings size={20} />,        label: 'Settings',  id: 'settings'  },
]

function HRNav({ collapsed, active, setActive }: { collapsed: boolean; active: string; setActive: (id: string) => void }) {
  const unread = useChatUnread()
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => setActive(item.id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            active === item.id
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-brown-600 hover:bg-brown-200 hover:text-brown-900'
          }`}
        >
          <span className="relative flex-shrink-0">
            {item.icon}
            {item.id === 'chat' && unread > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          {!collapsed && (
            <span className="font-medium text-sm flex items-center gap-1.5 flex-1">
              {item.label}
              {item.id === 'chat' && unread > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}

export default function HRPage() {
  const { hrId }                      = useParams<{ hrId: string }>()
  const { dispatch }                  = useApp()
  const [collapsed,   setCollapsed]   = useState(false)
  const [active,      setActive]      = useState('overview')
  const [showProfile, setShowProfile] = useState(false)

  // Restore role from URL on mount/reload
  useEffect(() => {
    if (hrId) {
      dispatch({ type: 'SET_ROLE', payload: { role: 'hr', userId: hrId } })
    }
  }, [hrId, dispatch])

  // Guard: only the known HR UUID is valid
  if (hrId !== USER_UUIDS.HR) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen" style={{ background: '#F0F7FF' }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex-shrink-0 flex flex-col border-r border-brown-200 transition-all duration-300"
        style={{ background: '#E0EFFD', width: collapsed ? 64 : 240 }}
      >
        <div className="h-16 flex items-center justify-between px-3 border-b border-brown-200">
          {collapsed ? <Logo size="sm" variant="icon" /> : <Logo size="sm" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-brown-500 hover:bg-brown-200 transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <HRNav collapsed={collapsed} active={active} setActive={setActive} />

        {!collapsed && (
          <div className="p-4 border-t border-brown-200">
            <div className="bg-purple-100 rounded-xl p-3">
              <p className="text-xs text-purple-700 font-bold">HR Manager</p>
              <p className="text-xs text-purple-600">People Operations</p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar variant="app" title="HR Portal" onProfileClick={() => setShowProfile(true)} />
        <main className="flex-1 overflow-hidden">
          {active === 'chat'
            ? <ChatTab />
            : <div className="overflow-y-auto h-full"><AdminPanel activeSection={active} isHR={true} /></div>
          }
        </main>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      <OnboardBotWidget />
    </div>
  )
}
