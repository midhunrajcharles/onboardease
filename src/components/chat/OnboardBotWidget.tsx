import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Minimize2, Loader2, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  buildOnboardBotContext,
  sendOnboardBotMessage,
  type OnboardBotMessage,
} from '../../services/aiService'

// ─── Helper: resolve current user id and role from AppContext ─────────────────

function useCurrentIdentity() {
  const { state } = useApp()
  const role = state.currentRole ?? 'employee'
  let userId = state.currentUserId ?? 'admin'
  if (role === 'admin') userId = 'admin'
  if (role === 'hr')    userId = 'hr'
  return { state, role: role as 'admin' | 'hr' | 'mentor' | 'employee', userId }
}

// ─── Suggestion chips per role ────────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  employee: [
    'What are my pending tasks?',
    'When is my next meeting?',
    'Who is my buddy/mentor?',
    'How do I set up MFA?',
  ],
  mentor: [
    "Show my mentees' progress",
    'Who is at risk?',
    'What tasks are assigned to my mentees?',
    'How do I schedule a meeting?',
  ],
  hr: [
    'How many employees are onboarding?',
    'Which employees are at risk?',
    'Generate tasks from a document',
    'What documents are uploaded?',
  ],
  admin: [
    'Give me a full onboarding overview',
    'Any at-risk employees?',
    'What documents are uploaded?',
    'Show overall progress metrics',
  ],
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function OnboardBotWidget() {
  const { state, role, userId } = useCurrentIdentity()
  const { dispatch } = useApp()

  const [open,      setOpen]      = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [history,   setHistory]   = useState<OnboardBotMessage[]>([])
  const [hasGreeted, setHasGreeted] = useState(false)
  const chatIdRef   = useRef<string | null>(null)
  const endRef      = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)

  // ── auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  // ── greet on first open ────────────────────────────────────────────────────
  useEffect(() => {
    if (open && !hasGreeted) {
      setHasGreeted(true)
      const name = role === 'admin' ? 'Admin'
        : role === 'hr' ? 'HR Manager'
        : state.employees?.find((e: any) => e.id === userId)?.name?.split(' ')[0]
        ?? state.mentors?.find((m: any) => m.id === userId)?.name?.split(' ')[0]
        ?? 'there'
      const contextHint = role === 'employee'
        ? 'your tasks, meetings, mentor info, and company policies'
        : role === 'mentor'
        ? "your assigned mentees' progress, tasks, and meetings"
        : role === 'hr'
        ? 'all employees, mentors, tasks, and uploaded documents'
        : 'all onboarding data — employees, mentors, tasks, analytics, and documents'
      setHistory([{
        role: 'bot',
        content: `Hi ${name}! 👋 I'm OnboardBot — your AI onboarding assistant.\n\nI have full context about ${contextHint}. I can also answer general questions outside of onboarding.\n\nWhat can I help you with today?`,
      }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // ── send message ───────────────────────────────────────────────────────────
  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const userMsg: OnboardBotMessage = { role: 'user', content: msg }
    setHistory(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const context = buildOnboardBotContext(state, userId, role)
      const reply   = await sendOnboardBotMessage(msg, context, history, chatIdRef)
      setHistory(prev => [...prev, { role: 'bot', content: reply }])
    } catch {
      setHistory(prev => [...prev, { role: 'bot', content: "Sorry, I couldn't reach the AI right now. Please try again in a moment." }])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = SUGGESTIONS[role] ?? SUGGESTIONS.employee

  // ─── Floating button ────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brown-600 hover:bg-brown-700 text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group"
        title="Open OnboardBot"
      >
        <Bot size={26} />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
      </button>
    )
  }

  // ─── Chat window ────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-brown-100 transition-all duration-200"
      style={{ width: 360, height: minimized ? 56 : 520 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-brown-600 rounded-t-2xl text-white flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Bot size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">OnboardBot</p>
          <p className="text-white/70 text-[10px] leading-tight flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" /> Online
          </p>
        </div>
        <button
          onClick={() => setMinimized(!minimized)}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          title={minimized ? 'Expand' : 'Minimize'}
        >
          {minimized ? <ChevronDown size={15} /> : <Minimize2 size={15} />}
        </button>
        <button
          onClick={() => { setOpen(false); setMinimized(false) }}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ background: '#F8FBFF' }}>
            {history.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-brown-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-brown-600" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brown-600 text-white rounded-tr-sm'
                      : 'bg-white text-brown-800 border border-brown-100 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-brown-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-brown-600" />
                </div>
                <div className="bg-white border border-brown-100 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm flex items-center gap-1.5">
                  <Loader2 size={13} className="text-brown-400 animate-spin" />
                  <span className="text-xs text-brown-400">Thinking…</span>
                </div>
              </div>
            )}

            {/* Suggestion chips (shown when only greeting is present) */}
            {history.length === 1 && !loading && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] bg-brown-50 border border-brown-200 text-brown-700 font-medium px-2.5 py-1 rounded-full hover:bg-brown-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-brown-100 bg-white rounded-b-2xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-brown-200 bg-brown-50 focus:outline-none focus:ring-2 focus:ring-brown-400 focus:bg-white transition-colors"
                placeholder="Ask me anything…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-brown-600 text-white hover:bg-brown-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
