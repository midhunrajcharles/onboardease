import { useState, useRef, useEffect } from 'react'
import {
  X, Paperclip, Send, Inbox, Mail, RefreshCw,
  FileText, File, Plus, ChevronLeft, FlaskConical,
  MoreHorizontal, Star, Archive,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Task } from '../../context/AppContext'
import { generateAIEmailReply } from '../../services/aiService'
import type { ConversationTurn } from '../../services/aiService'
import MarkdownRenderer from '../common/MarkdownRenderer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attachment {
  name: string
  size: string
  ext: string
}

interface EmailMessage {
  id: string
  from: string
  fromEmail: string
  to: string
  toEmail: string
  subject: string
  body: string
  timestamp: string
  attachments: Attachment[]
  direction: 'sent' | 'received'
}

interface Thread {
  id: string
  subject: string
  prospect: Prospect
  messages: EmailMessage[]
  lastAt: string
  unread: boolean
}

interface Prospect {
  name: string
  email: string
  company: string
  role: string
  initials: string
  color: string
}

// ─── Prospect pool ────────────────────────────────────────────────────────────

const PROSPECTS: Prospect[] = [
  { name: 'Alex Rivera',     email: 'arivera@techcorp.com',       company: 'TechCorp Inc.',       role: 'VP of Operations',       initials: 'AR', color: '#3B82F6' },
  { name: 'Sarah Mitchell',  email: 'smitchell@globalfin.com',    company: 'Global Finance Group', role: 'Director of IT',         initials: 'SM', color: '#8B5CF6' },
  { name: 'James Wong',      email: 'jwong@startupco.io',         company: 'StartupCo',           role: 'CEO',                    initials: 'JW', color: '#059669' },
  { name: 'Maria Gonzalez',  email: 'mgonzalez@enterprise.com',   company: 'Enterprise Systems',  role: 'Head of Procurement',    initials: 'MG', color: '#DC2626' },
  { name: 'Daniel Park',     email: 'dpark@innovate.co',          company: 'Innovate Co.',        role: 'Chief Technology Officer', initials: 'DP', color: '#D97706' },
]

// ─── Auto-reply generation ────────────────────────────────────────────────────

const REPLY_TEMPLATES = [
  (prospect: Prospect, subject: string) =>
    `Hi,\n\nThanks for reaching out! Your email caught my attention — we've actually been evaluating solutions in this space.\n\nA few questions before I loop in my team:\n\n• How does your product handle enterprise-scale workloads?\n• What does the typical implementation timeline look like?\n• Do you have case studies from companies in the ${prospect.company.includes('Finance') ? 'financial services' : 'technology'} sector?\n\nIf the answers are solid, I'd be happy to set up a 30-minute intro call next week.\n\nBest,\n${prospect.name}\n${prospect.role} | ${prospect.company}`,

  (prospect: Prospect) =>
    `Hi,\n\nI appreciate you reaching out. To be transparent — we're currently mid-contract with a competitor and just renewed six months ago.\n\nThat said, I always like to stay informed about what's in the market. What would you say is your single biggest differentiator compared to ${['Salesforce', 'HubSpot', 'Pipedrive', 'Monday.com'][Math.floor(Math.random() * 4)]}?\n\nIf the answer is compelling, I'm open to a brief demo.\n\nRegards,\n${prospect.name}\n${prospect.company}`,

  (prospect: Prospect) =>
    `Hello,\n\nInteresting timing — we have our annual vendor review coming up next month.\n\nBefore I schedule a call, can you clarify a few things?\n\n1. Pricing model — per seat, usage-based, or flat fee?\n2. Is there a free trial or proof-of-concept period available?\n3. What's the average time-to-value for a team of ~${Math.floor(Math.random() * 40 + 10)} people?\n\nDepending on your answers, I'd like to involve our Head of Finance in the next conversation.\n\n— ${prospect.name}\n${prospect.role}, ${prospect.company}`,

  (prospect: Prospect) =>
    `Hi there,\n\nI've forwarded your email to our procurement lead and our Operations Director. They handle all new vendor evaluations.\n\nIn the meantime, it would be helpful if you could send over:\n\n• A one-page product overview or pitch deck\n• Customer references in our industry\n• A rough pricing estimate for a team of 50\n\nExpect to hear from our team within 3–5 business days.\n\nThanks,\n${prospect.name}\n${prospect.company}`,

  (prospect: Prospect) =>
    `Hi,\n\nI appreciate the outreach, but the timing isn't ideal — we're deep in a platform migration and have frozen all new vendor decisions until Q3.\n\nI'd suggest following up in about 90 days. Please do put a reminder in your CRM.\n\nIf your product is still a good fit then, I'm genuinely happy to explore it.\n\nAll the best,\n${prospect.name}\n${prospect.role}`,

  (prospect: Prospect, subject: string) =>
    `Hi,\n\nQuick question before I respond in full — are you able to support ${Math.random() > 0.5 ? 'GDPR/CCPA compliance' : 'SSO and enterprise security requirements'}?\n\nThat's a hard requirement for us given our industry, and it would save both our time to know upfront.\n\nIf yes, let's schedule a call. If not, I appreciate the outreach anyway.\n\nCheers,\n${prospect.name}\n${prospect.company}`,
]

function generateAutoReply(prospect: Prospect, subject: string, replyIndex: number): string {
  const template = REPLY_TEMPLATES[replyIndex % REPLY_TEMPLATES.length]
  return template(prospect, subject)
}

/** Converts a thread's message list into AIML-compatible conversation history */
function buildConversationHistory(messages: EmailMessage[]): ConversationTurn[] {
  return messages.map(msg => ({
    role: msg.direction === 'sent' ? ('user' as const) : ('assistant' as const),
    content: msg.body,
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffMins < 1440) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimeFull(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getExtIcon(ext: string) {
  if (ext === 'pdf')              return <span className="text-[9px] font-black text-red-500">PDF</span>
  if (ext === 'ppt' || ext === 'pptx') return <span className="text-[9px] font-black text-orange-500">PPT</span>
  if (ext === 'doc' || ext === 'docx') return <span className="text-[9px] font-black text-blue-500">DOC</span>
  return <span className="text-[9px] font-black text-gray-400">FILE</span>
}

function fileToAttachment(file: File): Attachment {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const size = file.size > 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(file.size / 1024)} KB`
  return { name: file.name, size, ext }
}

// ─── AttachmentChip ───────────────────────────────────────────────────────────

function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove?: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs max-w-[160px]">
      <div className="w-5 h-5 rounded bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
        {getExtIcon(att.ext)}
      </div>
      <span className="truncate text-gray-700 font-medium">{att.name}</span>
      <span className="text-gray-400 flex-shrink-0">{att.size}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-0.5 transition-colors">
          <X size={10} />
        </button>
      )}
    </div>
  )
}

// ─── TypingIndicator ─────────────────────────────────────────────────────────

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex gap-3 items-end">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
        {name.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
        <span className="text-xs text-gray-400 italic">{name.split(' ')[0]} is typing</span>
        <span className="flex gap-0.5 ml-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  task: Task
  onClose: () => void
  onMarkDone: () => void
}

export default function MailPlaygroundModal({ task, onClose, onMarkDone }: Props) {
  const { dispatch } = useApp()

  // ── Restore from saved state or start fresh ──────────────────────────────
  const savedState = task.playgroundState

  const [threads,       setThreads]       = useState<Thread[]>((savedState?.mailThreads as Thread[] | undefined) ?? [])
  const [activeThread,  setActiveThread]  = useState<Thread | null>(null)
  const [view,          setView]          = useState<'inbox' | 'sent'>(savedState?.mailView ?? 'inbox')
  const [composing,     setComposing]     = useState(false)
  const [waitingReply,  setWaitingReply]  = useState<Set<string>>(new Set())

  // Compose fields
  const [compTo,          setCompTo]          = useState('')
  const [compSubject,     setCompSubject]     = useState('')
  const [compBody,        setCompBody]        = useState('')
  const [compAttachments, setCompAttachments] = useState<Attachment[]>([])
  const compFileRef = useRef<HTMLInputElement>(null)

  // Reply fields
  const [replyOpen,        setReplyOpen]        = useState(false)
  const [replyBody,        setReplyBody]        = useState('')
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([])
  const replyFileRef = useRef<HTMLInputElement>(null)

  const replyCountRef = useRef(0)
  const threadEndRef  = useRef<HTMLDivElement>(null)

  // ── Auto-save (debounced 600 ms) whenever threads or view change ──────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef   = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: task.id,
          updates: {
            playgroundState: {
              mailThreads: threads,
              mailView:    view,
              lastSaved:   new Date().toISOString(),
            },
          },
        },
      })
    }, 600)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [threads, view])

  // Auto-scroll on new messages
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages.length, waitingReply.size])

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleFiles = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<Attachment[]>>
  ) => {
    const files = Array.from(e.target.files ?? [])
    setter(prev => [...prev, ...files.map(fileToAttachment)])
    e.target.value = ''
  }

  // ── Send new email ─────────────────────────────────────────────────────────
  const sendEmail = async () => {
    if (!compSubject.trim() || !compBody.trim()) return

    const prospectIdx = threads.length % PROSPECTS.length
    const prospect    = PROSPECTS[prospectIdx]
    const now         = new Date().toISOString()

    const sentMsg: EmailMessage = {
      id:          `msg-${Date.now()}`,
      from:        'You',
      fromEmail:   'me@company.com',
      to:          compTo.trim() || prospect.name,
      toEmail:     prospect.email,
      subject:     compSubject.trim(),
      body:        compBody.trim(),
      timestamp:   now,
      attachments: compAttachments,
      direction:   'sent',
    }

    const thread: Thread = {
      id:       `thread-${Date.now()}`,
      subject:  compSubject.trim(),
      prospect,
      messages: [sentMsg],
      lastAt:   now,
      unread:   false,
    }

    setThreads(prev => [thread, ...prev])
    setActiveThread(thread)
    setComposing(false)
    setCompTo(''); setCompSubject(''); setCompBody(''); setCompAttachments([])

    // Simulate prospect typing & reply (AI-powered)
    setWaitingReply(prev => new Set(prev).add(thread.id))
    const delay = 1500 + Math.random() * 2000
    await new Promise(r => setTimeout(r, delay))

    const history = buildConversationHistory([sentMsg])
    const aiReply = await generateAIEmailReply(
      { name: prospect.name, email: prospect.email, company: prospect.company, role: prospect.role },
      sentMsg.subject,
      [], // first message — no prior history
      sentMsg.body,
    )
    const replyText = aiReply ?? generateAutoReply(prospect, sentMsg.subject, replyCountRef.current++)
    replyCountRef.current++
    const replyMsg: EmailMessage = {
      id:          `msg-${Date.now()}-r`,
      from:        prospect.name,
      fromEmail:   prospect.email,
      to:          'You',
      toEmail:     'me@company.com',
      subject:     `Re: ${sentMsg.subject}`,
      body:        replyText,
      timestamp:   new Date().toISOString(),
      attachments: [],
      direction:   'received',
    }

    setWaitingReply(prev => { const s = new Set(prev); s.delete(thread.id); return s })
    setThreads(prev => prev.map(t =>
      t.id === thread.id
        ? { ...t, messages: [...t.messages, replyMsg], lastAt: replyMsg.timestamp, unread: true }
        : t
    ))
    setActiveThread(prev =>
      prev?.id === thread.id
        ? { ...prev, messages: [...prev.messages, replyMsg], unread: false }
        : prev
    )
  }

  // ── Send reply ─────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!replyBody.trim() || !activeThread) return

    const now = new Date().toISOString()
    const sentMsg: EmailMessage = {
      id:          `msg-${Date.now()}`,
      from:        'You',
      fromEmail:   'me@company.com',
      to:          activeThread.prospect.name,
      toEmail:     activeThread.prospect.email,
      subject:     `Re: ${activeThread.subject}`,
      body:        replyBody.trim(),
      timestamp:   now,
      attachments: replyAttachments,
      direction:   'sent',
    }

    const updatedMsgs = [...activeThread.messages, sentMsg]
    setThreads(prev => prev.map(t =>
      t.id === activeThread.id ? { ...t, messages: updatedMsgs, lastAt: now } : t
    ))
    setActiveThread(prev => prev ? { ...prev, messages: updatedMsgs } : null)
    setReplyBody(''); setReplyAttachments([]); setReplyOpen(false)

    // Auto-reply (AI-powered, context-aware)
    setWaitingReply(prev => new Set(prev).add(activeThread.id))
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000))

    // Build full conversation history from the thread (before this latest reply)
    const history = buildConversationHistory(activeThread.messages)
    const aiReply = await generateAIEmailReply(
      {
        name: activeThread.prospect.name,
        email: activeThread.prospect.email,
        company: activeThread.prospect.company,
        role: activeThread.prospect.role,
      },
      activeThread.subject,
      history,
      sentMsg.body,
    )
    const replyText = aiReply ?? generateAutoReply(activeThread.prospect, activeThread.subject, replyCountRef.current++)
    replyCountRef.current++
    const autoReply: EmailMessage = {
      id:          `msg-${Date.now()}-r`,
      from:        activeThread.prospect.name,
      fromEmail:   activeThread.prospect.email,
      to:          'You',
      toEmail:     'me@company.com',
      subject:     `Re: ${activeThread.subject}`,
      body:        replyText,
      timestamp:   new Date().toISOString(),
      attachments: [],
      direction:   'received',
    }

    const threadId = activeThread.id
    setWaitingReply(prev => { const s = new Set(prev); s.delete(threadId); return s })
    setThreads(prev => prev.map(t =>
      t.id === threadId
        ? { ...t, messages: [...t.messages, autoReply], lastAt: autoReply.timestamp }
        : t
    ))
    setActiveThread(prev =>
      prev?.id === threadId
        ? { ...prev, messages: [...prev.messages, autoReply] }
        : prev
    )
  }

  // ── Thread list shown in sidebar ───────────────────────────────────────────
  const sidebarThreads = view === 'inbox'
    ? threads.filter(t => t.messages.some(m => m.direction === 'received'))
    : threads.filter(t => t.messages.some(m => m.direction === 'sent'))

  const inboxCount = threads.filter(t => t.unread).length

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F6F8FA]">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
            <FlaskConical size={15} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">{task.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">💰 Sales Mail Playground · practice your pitch — responses powered by AI agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkDone}
            className="text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >✓ Mark Done</button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          ><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left sidebar ────────────────────────────────────────────────── */}
        <div className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

          {/* Compose button */}
          <div className="p-3">
            <button
              onClick={() => { setComposing(true); setActiveThread(null); setReplyOpen(false) }}
              className="w-full flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={14} /> Compose
            </button>
          </div>

          {/* Nav */}
          <nav className="px-2 space-y-0.5">
            {[
              { id: 'inbox', label: 'Inbox', icon: <Inbox size={14} />, badge: inboxCount },
              { id: 'sent',  label: 'Sent',  icon: <Send  size={14} />, badge: 0 },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setView(item.id as 'inbox' | 'sent'); setComposing(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === item.id && !composing
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.label}
                {item.badge > 0 && (
                  <span className="ml-auto text-[10px] bg-orange-500 text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto border-t border-gray-100 mt-2">
            {sidebarThreads.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-6 px-3 leading-relaxed">
                {view === 'inbox' ? 'No replies yet.\nSend a pitch to get started!' : 'No sent emails yet.'}
              </p>
            ) : (
              sidebarThreads.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveThread(t); setComposing(false); setThreads(prev => prev.map(th => th.id === t.id ? { ...th, unread: false } : th)) }}
                  className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${activeThread?.id === t.id ? 'bg-orange-50 border-l-2 border-l-orange-400' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: t.prospect.color }}
                    >{t.prospect.initials}</div>
                    <p className={`text-xs truncate flex-1 ${t.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {t.prospect.name}
                    </p>
                    {t.unread && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate pl-7">{t.subject}</p>
                  <p className="text-[10px] text-gray-400 pl-7 mt-0.5">{formatTime(t.lastAt)}</p>
                </button>
              ))
            )}
          </div>

          {/* Subtask hints */}
          {(task.subtasks ?? []).length > 0 && (
            <div className="border-t border-gray-100 p-3 flex-shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Task Steps</p>
              {task.subtasks!.slice(0, 4).map((s, i) => (
                <p key={s.id} className="text-[10px] text-gray-400 mb-1 leading-snug">{i + 1}. {s.title}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* COMPOSE VIEW */}
          {composing && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Compose header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Mail size={15} className="text-orange-500" /> New Message
                  </h3>
                  <button onClick={() => setComposing(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                    <X size={15} />
                  </button>
                </div>

                {/* Fields */}
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-semibold text-gray-400 w-16 flex-shrink-0">To</span>
                    <input
                      value={compTo}
                      onChange={e => setCompTo(e.target.value)}
                      placeholder="Prospect name or email…"
                      className="flex-1 text-sm text-gray-800 focus:outline-none placeholder-gray-300"
                    />
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-semibold text-gray-400 w-16 flex-shrink-0">Subject</span>
                    <input
                      value={compSubject}
                      onChange={e => setCompSubject(e.target.value)}
                      placeholder="Introducing our solution…"
                      className="flex-1 text-sm text-gray-800 focus:outline-none placeholder-gray-300"
                    />
                  </div>
                </div>

                {/* Body */}
                <textarea
                  value={compBody}
                  onChange={e => setCompBody(e.target.value)}
                  placeholder={`Hi [Name],\n\nI'm reaching out because I believe our product can help ${task.description ? task.description.slice(0, 60) + '…' : 'solve a key challenge at your company'}.\n\n[Write your pitch here]`}
                  className="w-full px-5 py-4 text-sm text-gray-800 focus:outline-none resize-none border-none"
                  rows={10}
                  style={{ minHeight: 200 }}
                />

                {/* Attachments */}
                {compAttachments.length > 0 && (
                  <div className="px-5 pb-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    {compAttachments.map((a, i) => (
                      <AttachmentChip
                        key={i} att={a}
                        onRemove={() => setCompAttachments(prev => prev.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <input
                      ref={compFileRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      className="hidden"
                      onChange={e => handleFiles(e, setCompAttachments)}
                    />
                    <button
                      onClick={() => compFileRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Paperclip size={13} /> Attach
                    </button>
                    <span className="text-[10px] text-gray-300">PDF · DOC · PPT</span>
                  </div>
                  <button
                    onClick={sendEmail}
                    disabled={!compSubject.trim() || !compBody.trim()}
                    className="flex items-center gap-2 text-sm font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    <Send size={13} /> Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* THREAD VIEW */}
          {!composing && activeThread && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Thread header */}
              <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setActiveThread(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{activeThread.subject}</p>
                  <p className="text-xs text-gray-400">
                    {activeThread.prospect.name} · {activeThread.prospect.role} · {activeThread.prospect.company}
                  </p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  {activeThread.messages.length} message{activeThread.messages.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {activeThread.messages.map((msg, idx) => (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {idx === 0 || new Date(msg.timestamp).toDateString() !== new Date(activeThread.messages[idx - 1].timestamp).toDateString() ? (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] text-gray-400 font-medium">{new Date(msg.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    ) : null}

                    <div className={`flex gap-3 ${msg.direction === 'sent' ? 'flex-row-reverse' : 'flex-row'}`}>

                      {/* Avatar */}
                      {msg.direction === 'received' ? (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 shadow-sm"
                          style={{ backgroundColor: activeThread.prospect.color }}
                        >
                          {activeThread.prospect.initials}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 shadow-sm">
                          Me
                        </div>
                      )}

                      <div className={`flex flex-col ${msg.direction === 'sent' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {/* Bubble */}
                        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                          msg.direction === 'sent'
                            ? 'bg-orange-500 text-white rounded-tr-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                        }`}>
                          <p className={`text-[10px] font-semibold mb-1.5 ${msg.direction === 'sent' ? 'text-orange-100' : 'text-gray-400'}`}>
                            {msg.direction === 'sent'
                              ? `To: ${msg.to} <${msg.toEmail}>`
                              : `From: ${msg.from} <${msg.fromEmail}>`}
                          </p>
                          {msg.direction === 'received' ? (
                            <MarkdownRenderer
                              content={msg.body}
                              theme="light"
                              className="mt-0.5"
                            />
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                          )}

                          {msg.attachments.length > 0 && (
                            <div className={`mt-3 pt-3 flex flex-wrap gap-1.5 ${msg.direction === 'sent' ? 'border-t border-orange-400/30' : 'border-t border-gray-100'}`}>
                              {msg.attachments.map((a, i) => (
                                <div
                                  key={i}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${
                                    msg.direction === 'sent'
                                      ? 'bg-orange-400/30 text-orange-100'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <Paperclip size={10} />
                                  <span className="max-w-[120px] truncate">{a.name}</span>
                                  <span className="opacity-60">{a.size}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                          {formatTimeFull(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {waitingReply.has(activeThread.id) && (
                  <TypingIndicator name={activeThread.prospect.name} />
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply area */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
                {replyOpen ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        Reply to {activeThread.prospect.name} &lt;{activeThread.prospect.email}&gt;
                      </span>
                      <button
                        onClick={() => { setReplyOpen(false); setReplyBody(''); setReplyAttachments([]) }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <textarea
                      autoFocus
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                      placeholder="Write your reply…"
                      className="w-full px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none resize-none"
                      rows={5}
                    />
                    {replyAttachments.length > 0 && (
                      <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-gray-100 pt-2">
                        {replyAttachments.map((a, i) => (
                          <AttachmentChip
                            key={i} att={a}
                            onRemove={() => setReplyAttachments(prev => prev.filter((_, j) => j !== i))}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={replyFileRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          className="hidden"
                          onChange={e => handleFiles(e, setReplyAttachments)}
                        />
                        <button
                          onClick={() => replyFileRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Paperclip size={12} /> Attach
                        </button>
                        <span className="text-[10px] text-gray-300">PDF · DOC · PPT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setReplyOpen(false); setReplyBody(''); setReplyAttachments([]) }}
                          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Discard
                        </button>
                        <button
                          onClick={sendReply}
                          disabled={!replyBody.trim()}
                          className="flex items-center gap-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Send size={11} /> Send
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyOpen(true)}
                    className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 hover:border-orange-300 hover:bg-orange-50/50 transition-colors flex items-center gap-2"
                  >
                    <Mail size={13} className="text-gray-300" />
                    Reply to {activeThread.prospect.name}…
                  </button>
                )}
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {!composing && !activeThread && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-5">
                  <Mail size={32} className="text-orange-300" />
                </div>
                <p className="text-lg font-bold text-gray-800 mb-2">Sales Mail Playground</p>
                <p className="text-sm text-gray-500 mb-2 leading-relaxed">
                  Practice your sales pitch by writing cold emails. An AI agent will reply as a real B2B client — ask tough questions, raise objections, and push back to test your skills.
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Attach PDFs, decks, or docs to simulate real outreach.
                </p>
                <button
                  onClick={() => setComposing(true)}
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <Plus size={14} /> Write your first pitch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
