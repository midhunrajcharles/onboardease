import { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, FileText, ChevronDown, ListChecks, Sparkles, Upload } from 'lucide-react'
import { useApp, Document } from '../../context/AppContext'
import { generateTasksFromDocument, parseTasksFromResponse, ParsedTask } from '../../services/aiService'
import AssignTaskModal from '../modals/AssignTaskModal'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  tasks?: ParsedTask[]
  timestamp: Date
}

interface Props {
  onClose: () => void
  assignedBy: 'admin' | 'hr'
  assignedByName: string
  preselectedDocId?: string
}

export default function AIDocumentChat({ onClose, assignedBy, assignedByName, preselectedDocId }: Props) {
  const { state, dispatch } = useApp()
  const [selectedDocId, setSelectedDocId] = useState(preselectedDocId ?? state.documents[0]?.id ?? '')
  const [input, setInput]     = useState('')
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'ai', timestamp: new Date(),
    content: "👋 Hi! I'm your AI Onboarding Specialist. Select a document above and I'll generate a personalized task list from it.\n\nYou can ask me things like:\n• **\"Generate onboarding tasks for a new developer\"**\n• **\"Create a compliance checklist from this policy\"**\n• **\"What tasks should I assign for day 1?\"**",
  }])
  const [typing, setTyping]   = useState(false)
  const [pendingTasks, setPendingTasks] = useState<ParsedTask[] | null>(null)
  const [showAssign, setShowAssign]     = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedDoc = state.documents.find(d => d.id === selectedDocId)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || typing) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    const aiText = await generateTasksFromDocument(
      selectedDoc?.content ?? '',
      selectedDoc?.name ?? 'uploaded document',
      msg,
      undefined,
      messages.map(m => ({ role: m.role === 'ai' ? 'ai' : 'user', content: m.content }))
    )

    const parsed = parseTasksFromResponse(aiText)
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(), role: 'ai', content: aiText,
      tasks: parsed.length > 0 ? parsed : undefined, timestamp: new Date(),
    }
    setMessages(prev => [...prev, aiMsg])
    if (parsed.length > 0) setPendingTasks(parsed)
    setTyping(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleUploadDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: file.name.split('.').pop()?.toUpperCase() ?? 'PDF',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: 'processing',
        uploadedBy: assignedBy,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        content: `Document: ${file.name}. This document contains important information about company policies, procedures, and guidelines that need to be reviewed by new employees.`,
        fileData: reader.result as string,  // base64 data URL for in-session viewing
      }
      dispatch({ type: 'ADD_DOCUMENT', payload: newDoc })
      setSelectedDocId(newDoc.id)
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', timestamp: new Date(), content: `✅ **${file.name}** uploaded and processed! I've analyzed the document. What kind of tasks would you like me to generate from it?` }])
      }, 2000)
    }
    reader.readAsDataURL(file)
  }

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[700px] flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brown-600 to-brown-800 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white">AI Onboarding Specialist</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft" />
                  <span className="text-white/70 text-xs">Online · Powered by Deploy AI</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"><X size={18} /></button>
          </div>

          {/* Document selector */}
          <div className="px-4 py-3 border-b border-brown-100 bg-brown-50 flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-brown-700 flex-shrink-0">
              <FileText size={14} className="text-brown-500" />
              Context:
            </div>
            <div className="relative flex-1 min-w-[160px]">
              <select
                className="w-full border border-brown-200 rounded-lg px-3 py-1.5 text-sm text-brown-800 bg-white focus:outline-none focus:border-brown-500 appearance-none pr-7"
                value={selectedDocId}
                onChange={e => setSelectedDocId(e.target.value)}
              >
                {state.documents.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-brown-400 pointer-events-none" />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-brown-600 border border-brown-200 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-brown-100 transition-colors flex-shrink-0">
              <Upload size={13} /> Upload Doc
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleUploadDoc} />
            </label>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brown-50/20">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 bg-brown-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={15} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brown-500 text-white rounded-tr-sm'
                        : 'bg-white text-brown-800 border border-brown-200 rounded-tl-sm shadow-sm'
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                  {msg.tasks && msg.tasks.length > 0 && (
                    <button
                      onClick={() => { setPendingTasks(msg.tasks!); setShowAssign(true) }}
                      className="flex items-center gap-2 text-xs font-semibold text-white bg-brown-500 hover:bg-brown-600 px-3 py-2 rounded-lg mt-1 transition-colors"
                    >
                      <ListChecks size={14} /> Assign {msg.tasks.length} Tasks to Employee
                    </button>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2 animate-fade-in">
                <div className="w-8 h-8 bg-brown-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-white border border-brown-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-4 py-2 border-t border-brown-100 flex gap-2 overflow-x-auto flex-shrink-0">
            {['Generate onboarding tasks', 'Create compliance checklist', 'Day 1 task plan', 'Tools & setup tasks'].map(p => (
              <button key={p} onClick={() => sendMessage(p)}
                className="flex-shrink-0 text-xs bg-brown-50 text-brown-600 border border-brown-200 px-2.5 py-1.5 rounded-full hover:bg-brown-100 transition-colors">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-1 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white border border-brown-200 rounded-xl px-4 py-2.5">
              <input
                value={input} onChange={e => setInput(e.target.value)} onKeyPress={handleKeyPress}
                placeholder={`Ask about ${selectedDoc?.name ?? 'documents'}...`}
                className="flex-1 bg-transparent text-sm text-brown-800 placeholder-brown-400 outline-none"
              />
              <button onClick={() => sendMessage()} disabled={!input.trim() || typing}
                className="w-8 h-8 bg-brown-500 rounded-lg flex items-center justify-center text-white disabled:opacity-40 hover:bg-brown-600 transition-colors">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAssign && pendingTasks && (
        <AssignTaskModal
          tasks={pendingTasks}
          onClose={() => setShowAssign(false)}
          assignedBy={assignedBy}
          assignedByName={assignedByName}
        />
      )}
    </>
  )
}
