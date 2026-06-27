import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Plus, Send, Paperclip, X, Users, MessageSquare,
  FileText, Image, CheckCheck, Check, UserPlus, Trash2
} from 'lucide-react'
import { useApp, initialMentors } from '../../context/AppContext'
import type { ChatConversation, ChatMessage } from '../../context/AppContext'

// ─── User helpers ─────────────────────────────────────────────────────────────

interface ChatUser {
  id: string
  name: string
  role: string
  initials: string
  color: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#2B85DC', hr: '#7C3AED', mentor: '#0D9488', employee: '#16A34A',
}
const ROLE_ICONS: Record<string, string> = {
  admin: '🔑', hr: '👔', mentor: '🤝', employee: '👤',
}

function useAllUsers(): (state: any) => ChatUser[] {
  return (state: any) => {
    const users: ChatUser[] = [
      { id: 'admin', name: 'Admin',      role: 'admin', initials: 'A',  color: ROLE_COLORS.admin },
      { id: 'hr',    name: 'HR Manager', role: 'hr',    initials: 'HR', color: ROLE_COLORS.hr    },
      ...[...initialMentors, ...state.mentors].map((m: any) => ({
        id: m.id, name: m.name, role: 'mentor', initials: m.initials, color: m.color,
      })),
      ...state.employees.map((e: any) => ({
        id: e.id, name: e.name, role: 'employee', initials: e.initials, color: e.color,
      })),
    ]
    // Deduplicate by id
    return users.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)
  }
}

function getCurrentUserId(state: any): string {
  if (state.currentRole === 'admin') return 'admin'
  if (state.currentRole === 'hr')    return 'hr'
  return state.currentUserId ?? 'admin'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ user, size = 8 }: { user: ChatUser; size?: number }) {
  const px = size * 4
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: px, height: px, background: user.color, fontSize: size < 8 ? 10 : 13 }}
    >
      {user.initials}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatTab({ openWithUserId }: { openWithUserId?: string }) {
  const { state, dispatch } = useApp()
  const getAllUsers = useAllUsers()
  const allUsers    = getAllUsers(state)
  const currentId   = getCurrentUserId(state)
  const currentUser = allUsers.find(u => u.id === currentId) ?? allUsers[0]

  // ── local state ─────────────────────────────────────────────────────────────
  const [selectedConvId,    setSelectedConvId]    = useState<string | null>(null)
  const [input,             setInput]             = useState('')
  const [showNewChat,       setShowNewChat]       = useState(false)
  const [newChatSearch,     setNewChatSearch]     = useState('')
  const [selectedPeople,    setSelectedPeople]    = useState<string[]>([])
  const [groupName,         setGroupName]         = useState('')
  const [convSearch,        setConvSearch]        = useState('')
  const [attachedFile,      setAttachedFile]      = useState<File | null>(null)
  const [attachedData,      setAttachedData]      = useState<string | null>(null)
  const [toast,             setToast]             = useState<string | null>(null)
  // id of conv pending delete confirmation
  const [pendingDeleteId,   setPendingDeleteId]   = useState<string | null>(null)

  const messagesEndRef   = useRef<HTMLDivElement>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)
  // Track processed message ids to avoid duplicate notifications
  const notifiedIds      = useRef<Set<string>>(new Set())

  // ── helpers ──────────────────────────────────────────────────────────────────
  const myConversations = state.conversations
    .filter(c => c.participants.includes(currentId))
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt))

  const unreadCount = (convId: string) =>
    state.chatMessages.filter(
      m => m.conversationId === convId &&
           m.senderId !== currentId &&
           !m.readBy.includes(currentId)
    ).length

  const totalUnread = myConversations.reduce((n, c) => n + unreadCount(c.id), 0)

  const getConvName = (conv: ChatConversation) => {
    if (conv.name) return conv.name
    const other = conv.participants.find(p => p !== currentId)
    return allUsers.find(u => u.id === other)?.name ?? 'Unknown'
  }

  const getConvAvatar = (conv: ChatConversation): ChatUser | null => {
    if (conv.type === 'group') return null
    const other = conv.participants.find(p => p !== currentId)
    return allUsers.find(u => u.id === other) ?? null
  }

  const lastMessage = (convId: string) => {
    const msgs = state.chatMessages.filter(m => m.conversationId === convId)
    return msgs[msgs.length - 1] ?? null
  }

  const selectedConv  = state.conversations.find(c => c.id === selectedConvId) ?? null
  const activeMessages = state.chatMessages.filter(m => m.conversationId === selectedConvId)

  // Guard: track which userId we've already processed so we never create
  // duplicate conversations (guards against React Strict Mode double-invoke)
  const processedConvRef = useRef<string | null>(null)

  // ── auto-open conversation when openWithUserId prop is provided ───────────────
  useEffect(() => {
    if (!openWithUserId) return
    // Already handled this userId in this mount — skip
    if (processedConvRef.current === openWithUserId) return
    processedConvRef.current = openWithUserId

    // Look for an existing direct conversation first
    const existing = state.conversations.find(
      c => c.type === 'direct' &&
           c.participants.includes(currentId) &&
           c.participants.includes(openWithUserId)
    )
    if (existing) {
      setSelectedConvId(existing.id)
    } else {
      const conv: ChatConversation = {
        id:            `conv-${Date.now()}`,
        type:          'direct',
        participants:  [currentId, openWithUserId],
        createdAt:     new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
      }
      dispatch({ type: 'CREATE_CONVERSATION', payload: conv })
      setSelectedConvId(conv.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWithUserId])

  // ── mark as read when opening conversation ───────────────────────────────────
  useEffect(() => {
    if (selectedConvId) {
      dispatch({ type: 'MARK_CHAT_READ', payload: { conversationId: selectedConvId, userId: currentId } })
    }
  }, [selectedConvId, activeMessages.length])

  // ── auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length, selectedConvId])

  // ── toast auto-dismiss ────────────────────────────────────────────────────────
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) }
  }, [toast])

  // ── Request browser notification permission on mount ──────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ── Fire browser + toast notifications for incoming messages ─────────────────
  // "Incoming" = message not sent by me, in a conversation I'm part of
  useEffect(() => {
    state.chatMessages.forEach(msg => {
      // Skip if already notified, or sent by current user
      if (notifiedIds.current.has(msg.id) || msg.senderId === currentId) return

      const conv = state.conversations.find(c => c.id === msg.conversationId)
      if (!conv || !conv.participants.includes(currentId)) return

      // Mark as processed
      notifiedIds.current.add(msg.id)

      const convDisplayName = conv.name || allUsers.find(u => u.id === msg.senderId)?.name || 'Someone'
      const bodyText = msg.type !== 'text' ? `📎 ${msg.fileName ?? 'Attachment'}` : msg.content

      // Show in-app toast when not viewing this conversation
      if (msg.conversationId !== selectedConvId) {
        setToast(`💬 ${msg.senderName}: ${bodyText.slice(0, 60)}${bodyText.length > 60 ? '…' : ''}`)
      }

      // Browser push notification when tab is hidden or conversation not active
      if (
        'Notification' in window &&
        Notification.permission === 'granted' &&
        (document.hidden || msg.conversationId !== selectedConvId)
      ) {
        try {
          new Notification(`New message from ${msg.senderName}`, {
            body: bodyText.slice(0, 100),
            icon: '/logo.png',
            tag:  msg.conversationId, // group by conversation
            silent: false,
          })
        } catch {
          // Notification API unavailable in this environment – silently ignore
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.chatMessages.length])

  // ── file attach ───────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setToast('File must be under 5 MB'); return }
    const reader = new FileReader()
    reader.onload = () => { setAttachedFile(file); setAttachedData(reader.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── send message ──────────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!selectedConvId) return
    const text = input.trim()
    if (!text && !attachedFile) return

    const isImg   = attachedFile?.type.startsWith('image/')
    const msgType = attachedFile ? (isImg ? 'image' : 'file') : 'text'

    const msg: ChatMessage = {
      id:             `msg-${Date.now()}`,
      conversationId: selectedConvId,
      senderId:       currentId,
      senderName:     currentUser.name,
      senderRole:     currentUser.role,
      content:        text || (attachedFile ? attachedFile.name : ''),
      type:           msgType,
      fileName:       attachedFile?.name,
      fileData:       attachedData ?? undefined,
      fileType:       attachedFile?.type,
      createdAt:      new Date().toISOString(),
      readBy:         [currentId],
    }
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: msg })
    setInput('')
    setAttachedFile(null)
    setAttachedData(null)

    // Toast-notify if other participants are not in this conv (simulated)
    const conv = state.conversations.find(c => c.id === selectedConvId)
    if (conv) {
      const others = conv.participants.filter(p => p !== currentId)
      const otherNames = others.map(id => allUsers.find(u => u.id === id)?.name ?? id).join(', ')
      if (otherNames) setToast(`Message sent to ${otherNames}`)
    }
  }

  // ── create conversation ───────────────────────────────────────────────────────
  const createConversation = () => {
    if (selectedPeople.length === 0) return
    const participants = [currentId, ...selectedPeople]
    const isGroup      = participants.length > 2

    // Check if direct conv already exists
    if (!isGroup) {
      const existing = state.conversations.find(
        c => c.type === 'direct' &&
             c.participants.includes(currentId) &&
             c.participants.includes(selectedPeople[0])
      )
      if (existing) { setSelectedConvId(existing.id); setShowNewChat(false); return }
    }

    const conv: ChatConversation = {
      id:           `conv-${Date.now()}`,
      name:         isGroup ? (groupName.trim() || `Group (${participants.length})`) : undefined,
      type:         isGroup ? 'group' : 'direct',
      participants,
      createdAt:    new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    }
    dispatch({ type: 'CREATE_CONVERSATION', payload: conv })
    setSelectedConvId(conv.id)
    setShowNewChat(false)
    setSelectedPeople([])
    setGroupName('')
    setNewChatSearch('')
  }

  const deleteConversation = (convId: string) => {
    dispatch({ type: 'DELETE_CONVERSATION', payload: { id: convId } })
    if (selectedConvId === convId) setSelectedConvId(null)
    setPendingDeleteId(null)
    setToast('Conversation deleted')
  }

  const filteredConvs = myConversations
    .filter(c => state.chatMessages.some(m => m.conversationId === c.id)) // only show if messages exist
    .filter(c => getConvName(c).toLowerCase().includes(convSearch.toLowerCase()))

  const othersForNewChat = allUsers
    .filter(u => u.id !== currentId)
    .filter(u => u.name.toLowerCase().includes(newChatSearch.toLowerCase()))

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white relative">

      {/* Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-brown-800 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* ─── Left: Conversation list ─────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-brown-100">
        {/* Header */}
        <div className="px-4 py-4 border-b border-brown-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-brown-900 text-base flex items-center gap-2">
              <MessageSquare size={16} className="text-brown-500" /> Messages
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {totalUnread}
                </span>
              )}
            </h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-1.5 rounded-lg bg-brown-600 text-white hover:bg-brown-700 transition-colors"
              title="New conversation"
            >
              <UserPlus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-brown-200 bg-brown-50 focus:outline-none focus:ring-1 focus:ring-brown-400"
              placeholder="Search conversations…"
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-brown-50">
          {filteredConvs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-brown-400 px-4 text-center">
              <MessageSquare size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs mt-1">Click <strong>+</strong> to start chatting</p>
            </div>
          )}
          {filteredConvs.map(conv => {
            const unread     = unreadCount(conv.id)
            const last       = lastMessage(conv.id)
            const avatar     = getConvAvatar(conv)
            const name       = getConvName(conv)
            const isSelected = conv.id === selectedConvId
            const isPending  = pendingDeleteId === conv.id

            return (
              <div
                key={conv.id}
                className={`relative group flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer ${isSelected ? 'bg-brown-50' : 'hover:bg-brown-50/60'}`}
                onClick={() => { if (!isPending) setSelectedConvId(conv.id) }}
              >
                {/* Avatar */}
                {conv.type === 'group' ? (
                  <div className="w-9 h-9 rounded-full bg-brown-200 flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-brown-600" />
                  </div>
                ) : avatar ? (
                  <Avatar user={avatar} size={9} />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">?</div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-brown-900' : 'font-medium text-brown-700'}`}>{name}</p>
                    {last && !isPending && (
                      <span className="text-[10px] text-brown-400 flex-shrink-0 ml-1">
                        {new Date(last.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {!isPending && (
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-brown-400 truncate">
                        {last ? (last.type !== 'text' ? `📎 ${last.fileName}` : last.content) : 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="ml-1 flex-shrink-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Inline delete confirm */}
                  {isPending && (
                    <div className="flex items-center gap-2 mt-0.5" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-red-600 font-medium">Delete this chat?</span>
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors"
                      >Yes</button>
                      <button
                        onClick={() => setPendingDeleteId(null)}
                        className="text-xs font-medium text-brown-600 bg-brown-100 hover:bg-brown-200 px-2 py-0.5 rounded-md transition-colors"
                      >No</button>
                    </div>
                  )}
                </div>

                {/* Hover-reveal trash icon */}
                {!isPending && (
                  <button
                    onClick={e => { e.stopPropagation(); setPendingDeleteId(conv.id) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-brown-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ─── Right: Message thread ────────────────────────────────────────────── */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conv header */}
          <div className="px-5 py-3.5 border-b border-brown-100 flex items-center gap-3 bg-white">
            {selectedConv.type === 'group' ? (
              <div className="w-9 h-9 rounded-full bg-brown-200 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-brown-600" />
              </div>
            ) : (() => {
              const av = getConvAvatar(selectedConv)
              return av ? <Avatar user={av} size={9} /> : null
            })()}
            <div>
              <p className="font-bold text-brown-900 text-sm">{getConvName(selectedConv)}</p>
              <p className="text-xs text-brown-400">
                {selectedConv.type === 'group'
                  ? `${selectedConv.participants.length} participants`
                  : allUsers.find(u => u.id === selectedConv.participants.find(p => p !== currentId))?.role ?? ''}
              </p>
            </div>
            {selectedConv.type === 'group' && (
              <div className="ml-auto flex -space-x-2">
                {selectedConv.participants.slice(0, 4).map(pid => {
                  const u = allUsers.find(u => u.id === pid)
                  return u ? (
                    <div key={pid} title={u.name}
                      className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ background: u.color }}>
                      {u.initials[0]}
                    </div>
                  ) : null
                })}
                {selectedConv.participants.length > 4 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-brown-300 flex items-center justify-center text-[9px] font-bold text-brown-700">
                    +{selectedConv.participants.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: '#F8FBFF' }}>
            {activeMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-brown-400">
                <MessageSquare size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">Say hello! 👋</p>
              </div>
            )}
            {activeMessages.map((msg, idx) => {
              const isMine  = msg.senderId === currentId
              const sender  = allUsers.find(u => u.id === msg.senderId)
              const prevMsg = activeMessages[idx - 1]
              const showSenderInfo = !prevMsg || prevMsg.senderId !== msg.senderId

              return (
                <div key={msg.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar — only show when sender changes */}
                  {showSenderInfo && sender ? (
                    <Avatar user={sender} size={8} />
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}

                  <div className={`flex flex-col max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {showSenderInfo && (
                      <div className={`flex items-center gap-1.5 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-semibold text-brown-700">{msg.senderName}</span>
                        <span className="text-[10px]">{ROLE_ICONS[msg.senderRole] ?? ''}</span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      isMine
                        ? 'bg-brown-600 text-white rounded-tr-sm'
                        : 'bg-white text-brown-800 border border-brown-100 rounded-tl-sm'
                    }`}>
                      {msg.type === 'image' && msg.fileData && (
                        <img src={msg.fileData} alt={msg.fileName} className="max-w-xs max-h-48 rounded-lg mb-1.5 object-cover" />
                      )}
                      {msg.type === 'file' && (
                        <div className={`flex items-center gap-2 mb-1.5 px-2 py-1.5 rounded-lg ${isMine ? 'bg-white/10' : 'bg-brown-50'}`}>
                          <FileText size={14} className={isMine ? 'text-white/80' : 'text-brown-500'} />
                          <span className={`text-xs font-medium truncate max-w-[150px] ${isMine ? 'text-white' : 'text-brown-700'}`}>
                            {msg.fileName}
                          </span>
                        </div>
                      )}
                      {msg.content && (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      )}
                    </div>

                    {/* Timestamp + read receipt */}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] text-brown-400">
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && (
                        msg.readBy.length > 1
                          ? <CheckCheck size={11} className="text-blue-500" />
                          : <Check size={11} className="text-brown-400" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-brown-100 bg-white">
            {attachedFile && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-brown-50 rounded-lg border border-brown-200">
                {attachedFile.type.startsWith('image/')
                  ? <Image size={13} className="text-brown-500 flex-shrink-0" />
                  : <FileText size={13} className="text-brown-500 flex-shrink-0" />}
                <span className="text-xs text-brown-700 flex-1 truncate">{attachedFile.name}</span>
                <button onClick={() => { setAttachedFile(null); setAttachedData(null) }} className="text-brown-400 hover:text-red-500 transition-colors">
                  <X size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileChange} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-brown-400 hover:bg-brown-100 hover:text-brown-600 transition-colors flex-shrink-0"
                title="Attach file or image"
              >
                <Paperclip size={18} />
              </button>
              <input
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-brown-200 bg-brown-50 focus:outline-none focus:ring-2 focus:ring-brown-400 focus:bg-white transition-colors"
                placeholder="Type a message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() && !attachedFile}
                className="p-2 rounded-xl bg-brown-600 text-white hover:bg-brown-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-brown-400" style={{ background: '#F8FBFF' }}>
          <MessageSquare size={48} className="mb-4 opacity-20" />
          <p className="text-base font-semibold text-brown-500">Select a conversation</p>
          <p className="text-sm mt-1 text-brown-400">or start a new one with the <strong>+</strong> button</p>
        </div>
      )}

      {/* ─── New Chat Modal ───────────────────────────────────────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowNewChat(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-brown-100">
              <h3 className="font-bold text-brown-900 flex items-center gap-2"><Plus size={16} />New Conversation</h3>
              <button onClick={() => setShowNewChat(false)} className="p-1.5 rounded-lg hover:bg-brown-100 text-brown-500 transition-colors"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-brown-200 focus:outline-none focus:ring-1 focus:ring-brown-400"
                  placeholder="Search people…"
                  value={newChatSearch}
                  onChange={e => setNewChatSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* People list */}
              <div className="max-h-52 overflow-y-auto space-y-1">
                {othersForNewChat.map(user => {
                  const sel = selectedPeople.includes(user.id)
                  return (
                    <label key={user.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${sel ? 'bg-brown-50 border border-brown-300' : 'hover:bg-brown-50 border border-transparent'}`}>
                      <input type="checkbox" className="sr-only" checked={sel}
                        onChange={() => setSelectedPeople(prev =>
                          prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                        )} />
                      <Avatar user={user} size={9} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-brown-800">{user.name}</p>
                        <p className="text-xs text-brown-400 capitalize">{ROLE_ICONS[user.role]} {user.role}</p>
                      </div>
                      {sel && <CheckCheck size={16} className="text-brown-600 flex-shrink-0" />}
                    </label>
                  )
                })}
              </div>

              {/* Group name if >1 person selected */}
              {selectedPeople.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-brown-600 mb-1.5">Group name (optional)</label>
                  <input
                    className="input-field text-sm py-2"
                    placeholder="e.g. Onboarding Team"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                  />
                </div>
              )}

              {selectedPeople.length > 0 && (
                <p className="text-xs text-brown-500">
                  {selectedPeople.length === 1
                    ? `Direct message with ${allUsers.find(u => u.id === selectedPeople[0])?.name}`
                    : `Group of ${selectedPeople.length + 1} people`}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowNewChat(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button
                onClick={createConversation}
                disabled={selectedPeople.length === 0}
                className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Exported helper: total unread for sidebar badge ─────────────────────────
export function useChatUnread() {
  const { state } = useApp()
  const currentId = getCurrentUserId(state)
  return state.conversations
    .filter(c => c.participants.includes(currentId))
    .reduce((n, c) => n + state.chatMessages.filter(
      m => m.conversationId === c.id && m.senderId !== currentId && !m.readBy.includes(currentId)
    ).length, 0)
}
