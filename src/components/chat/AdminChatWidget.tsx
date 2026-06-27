import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, User, Sparkles, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { buildOnboardBotContext, sendOnboardBotMessage, type OnboardBotMessage } from '../../services/aiService'
import MarkdownRenderer from '../common/MarkdownRenderer'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  ts: string
}

interface Props {
  employeeCount: number
  atRiskCount: number
  avgProgress: number
  docCount: number
  atRiskNames: string[]
}

// Role-specific suggestion chips matching the OnboardBot spec
const ROLE_PROMPTS: Record<string, string[]> = {
  admin: [
    'Give me a full onboarding overview',
    'Any at-risk employees?',
    'What documents are uploaded?',
    'Show overall progress metrics',
  ],
  hr: [
    'How many employees are onboarding?',
    'Which employees are at risk?',
    'What documents are uploaded?',
    'Give me an onboarding progress summary',
  ],
  mentor: [
    "Show my mentees' progress",
    'Who is at risk?',
    'What tasks are assigned to my mentees?',
    'How do I schedule a meeting?',
  ],
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminChatWidget({ employeeCount, atRiskCount, avgProgress, docCount, atRiskNames }: Props) {
  const { state } = useApp()
  const [messages, setMessages]   = useState<Message[]>([])
  const [input,    setInput]      = useState('')
  const [loading,  setLoading]    = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  // Persistent chat session ref for OnboardBot
  const chatIdRef  = useRef<string | null>(null)
  // History for OnboardBot — must NOT include the current user message on the first call
  const botHistory = useRef<OnboardBotMessage[]>([])

  // Resolve current role (admin | hr | mentor)
  const currentRole = (
    state.currentRole === 'hr' ? 'hr'
    : state.currentRole === 'mentor' ? 'mentor'
    : 'admin'
  ) as 'admin' | 'hr' | 'mentor'

  const currentUserId = state.currentUserId ?? (currentRole === 'hr' ? 'hr' : 'admin')
  const quickPrompts  = ROLE_PROMPTS[currentRole] ?? ROLE_PROMPTS.admin

  const roleLabel = currentRole === 'hr' ? 'HR Manager'
    : currentRole === 'mentor' ? 'Mentor'
    : 'Admin'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: msg, ts: timestamp() }
    setMessages(prev => [...prev, userMsg])

    // Capture history BEFORE adding user message so isFirst check works correctly
    const prevHistory = [...botHistory.current]
    botHistory.current = [...botHistory.current, { role: 'user', content: msg }]
    setLoading(true)

    try {
      const context = buildOnboardBotContext(state, currentUserId, currentRole)
      const reply = await sendOnboardBotMessage(msg, context, prevHistory, chatIdRef)
      botHistory.current = [...botHistory.current, { role: 'bot', content: reply }]
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'ai', content: reply, ts: timestamp() }])
    } catch {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'ai', content: 'Sorry, something went wrong. Please try again.', ts: timestamp() }])
    }
    setLoading(false)
  }

  const clearChat = () => {
    setMessages([])
    botHistory.current = []
    chatIdRef.current = null
  }

  return (
    <div className="rounded-2xl border border-brown-200 bg-white flex flex-col overflow-hidden" style={{ height: '380px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brown-100 bg-gradient-to-r from-brown-700 to-brown-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Bot size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">OnboardBot</p>
            <p className="text-xs text-white/60 mt-0.5">{roleLabel} · AI Onboarding Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          {messages.length > 0 && (
            <button onClick={clearChat} className="ml-2 p-1 rounded hover:bg-white/20 text-white/60 hover:text-white transition-colors" title="Clear chat">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-between">
            {/* Welcome */}
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brown-600 to-brown-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-brown-50 border border-brown-100 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[85%]">
                <p className="text-xs text-brown-700 leading-relaxed">
                  Hi {roleLabel}! 👋 I'm <strong>OnboardBot</strong> — your AI onboarding assistant. I have full context about your {currentRole === 'mentor' ? "assigned mentees' tasks and progress" : 'employees, tasks, documents, and onboarding metrics'}. I can also answer general questions outside of onboarding. What do you need help with?
                </p>
              </div>
            </div>

            {/* Quick prompts */}
            <div className="space-y-1.5 pb-1">
              <p className="text-xs text-brown-400 font-medium flex items-center gap-1"><Sparkles size={11} />Quick questions</p>
              {quickPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="w-full text-left text-xs text-brown-600 bg-brown-50 hover:bg-brown-100 border border-brown-100 px-3 py-2 rounded-xl transition-colors leading-relaxed"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  m.role === 'ai'
                    ? 'bg-gradient-to-br from-brown-600 to-brown-800'
                    : 'bg-gradient-to-br from-blue-500 to-blue-700'
                }`}>
                  {m.role === 'ai'
                    ? <Bot size={12} className="text-white" />
                    : <User size={12} className="text-white" />
                  }
                </div>
                <div className={`max-w-[82%] ${m.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-brown-700 text-white rounded-tr-sm'
                      : 'bg-brown-50 border border-brown-100 text-brown-700 rounded-tl-sm'
                  }`}>
                    {m.role === 'ai'
                      ? <MarkdownRenderer content={m.content} theme="light" />
                      : m.content}
                  </div>
                  <span className="text-xs text-brown-300 mt-0.5 px-1">{m.ts}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brown-600 to-brown-800 flex items-center justify-center flex-shrink-0">
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-brown-50 border border-brown-100 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
                  <Loader2 size={12} className="text-brown-400 animate-spin" />
                  <span className="text-xs text-brown-400">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-brown-100 px-3 py-2.5 flex gap-2 items-center flex-shrink-0 bg-white">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about onboarding…"
          disabled={loading}
          className="flex-1 text-xs bg-brown-50 border border-brown-200 rounded-xl px-3 py-2 outline-none focus:border-brown-400 transition-colors disabled:opacity-50 text-brown-800 placeholder-brown-400"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-xl bg-brown-700 hover:bg-brown-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
        >
          {loading
            ? <Loader2 size={13} className="text-white animate-spin" />
            : <Send size={13} className="text-white" />
          }
        </button>
      </div>
    </div>
  )
}
