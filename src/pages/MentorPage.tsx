import { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, MessageSquare,
  Calendar, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'
import Navbar from '../components/common/Navbar'
import MentorDashboard from '../components/dashboard/MentorDashboard'
import ChatTab, { useChatUnread } from '../components/chat/ChatTab'
import Logo from '../components/common/Logo'
import { useApp, initialMentors } from '../context/AppContext'
import OnboardBotWidget from '../components/chat/OnboardBotWidget'

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={20} />, label: 'Overview',   id: 'overview'  },
  { icon: <Users size={20} />,           label: 'My Mentees', id: 'mentees'   },
  { icon: <FileText size={20} />,        label: 'Documents',  id: 'docs'      },
  { icon: <Calendar size={20} />,        label: 'Schedule',   id: 'schedule'  },
  { icon: <MessageSquare size={20} />,   label: 'Chat',       id: 'chat'      },
  { icon: <Settings size={20} />,        label: 'Settings',   id: 'settings'  },
]

function MentorNav({
  collapsed,
  active,
  setActive,
}: {
  collapsed: boolean
  active: string
  setActive: (id: string) => void
}) {
  const unread = useChatUnread()
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => setActive(item.id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            active === item.id
              ? 'bg-brown-500 text-white'
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

export default function MentorPage() {
  const { mentorId }          = useParams<{ mentorId: string }>()
  const { dispatch }          = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const [active,    setActive]    = useState('overview')

  // Restore role from URL on every mount/reload — no more crash on F5
  useEffect(() => {
    if (mentorId) {
      dispatch({ type: 'SET_ROLE', payload: { role: 'mentor', userId: mentorId } })
    }
  }, [mentorId, dispatch])

  // Guard: if the mentorId in the URL doesn't exist, redirect to login
  const validMentor = initialMentors.find(m => m.id === mentorId)
  if (!validMentor) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen" style={{ background: '#F0F7FF' }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex-shrink-0 flex flex-col border-r border-brown-200 transition-all duration-300"
        style={{ background: '#E0EFFD', width: collapsed ? 64 : 240 }}
      >
        {/* Header with logo + collapse arrow (same pattern as Admin) */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-brown-200">
          {collapsed ? <Logo size="sm" variant="icon" /> : <Logo size="sm" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-brown-500 hover:bg-brown-200 transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav — no bottom info card */}
        <MentorNav collapsed={collapsed} active={active} setActive={setActive} />
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar variant="app" title="Mentor Portal" />
        <main className="flex-1 overflow-hidden">
          {active === 'chat'
            ? <ChatTab />
            : (
              <div className="overflow-y-auto h-full">
                <MentorDashboard activeSection={active} mentorId={mentorId} />
              </div>
            )
          }
        </main>
      </div>
      <OnboardBotWidget />
    </div>
  )
}
