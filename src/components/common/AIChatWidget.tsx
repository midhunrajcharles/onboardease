import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, Minimize2, Maximize2, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickActions = [
  'What should I do first?',
  'How do I access tools?',
  'Who is my buddy?',
  'View my schedule',
]

const aiResponses: Record<string, string> = {
  default: "I'm your AI onboarding assistant! I'm here to help you navigate your first days. What would you like to know?",
  first: "Great question! Start by completing your profile setup, then check today's task list. Your first priority is the company overview module — it takes about 20 minutes and gives you key context about the mission and team. 🚀",
  tools: "Your tool access is being provisioned! You should receive invites to Slack, Google Workspace, and GitHub within the next 30 minutes. Check your email for setup links. Need help with any specific tool?",
  buddy: "You've been matched with Sarah Chen from the Engineering team! She has 3 years of experience and specializes in your role area. Your first check-in is scheduled for tomorrow at 2 PM. I've sent her a message about your questions!",
  schedule: "Here's your schedule for today:\n• 9:00 AM — Company overview module\n• 11:00 AM — Meet your buddy Sarah\n• 2:00 PM — HR paperwork completion\n• 4:00 PM — Team standup (observer)\nYou're doing great — 3 tasks already done!",
  welcome: "Welcome to OnboardEase! 🎉 I'm your AI onboarding assistant. I can help you with tasks, answer questions, find resources, and connect you with the right people. What would you like to know?",
}

function getAIResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('first') || lower.includes('start') || lower.includes('begin')) return aiResponses.first
  if (lower.includes('tool') || lower.includes('access') || lower.includes('slack') || lower.includes('github')) return aiResponses.tools
  if (lower.includes('buddy') || lower.includes('mentor') || lower.includes('partner')) return aiResponses.buddy
  if (lower.includes('schedule') || lower.includes('today') || lower.includes('calendar') || lower.includes('task')) return aiResponses.schedule
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) return aiResponses.welcome
  return `Great question! Let me look that up for you...\n\nBased on your onboarding plan, I found relevant information in your knowledge base. For more specific guidance, you can also check the Resources section or ask your buddy Sarah. Is there anything else I can help clarify? 😊`
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "👋 Hi! I'm your AI onboarding assistant. How can I help you today?",
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setUnread(0)
      scrollToBottom()
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate AI response delay
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(messageText),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
      if (!isOpen) setUnread(prev => prev + 1)
    }, 1200 + Math.random() * 800)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {isOpen && (
        <div
          className={`bg-white rounded-2xl shadow-2xl border border-brown-200 flex flex-col transition-all duration-300 ${
            isMinimized ? 'h-14' : 'h-[520px]'
          }`}
          style={{ width: 340 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brown-500 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">AI Assistant</p>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft"></span>
                  <span className="text-white/70 text-xs">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brown-50/30">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 bg-brown-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot size={14} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === 'user'
                            ? 'bg-brown-500 text-white rounded-tr-sm'
                            : 'bg-white text-brown-800 border border-brown-200 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-xs text-brown-400">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-2 animate-fade-in">
                    <div className="w-7 h-7 bg-brown-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="bg-white border border-brown-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions */}
              <div className="px-3 py-2 border-t border-brown-100 flex gap-1.5 overflow-x-auto scrollbar-none">
                {quickActions.map(action => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="flex-shrink-0 text-xs bg-brown-50 text-brown-600 border border-brown-200 px-2.5 py-1.5 rounded-full hover:bg-brown-100 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-3 pb-3 pt-1">
                <div className="flex items-center gap-2 bg-brown-50 border border-brown-200 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-sm text-brown-800 placeholder-brown-400 outline-none"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim()}
                    className="w-8 h-8 bg-brown-500 rounded-lg flex items-center justify-center text-white disabled:opacity-40 hover:bg-brown-600 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-brown-500 hover:bg-brown-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center relative"
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <>
            <MessageCircle size={24} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-brown-300 rounded-full flex items-center justify-center">
              <Sparkles size={11} className="text-brown-800" />
            </span>
          </>
        )}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    </div>
  )
}
