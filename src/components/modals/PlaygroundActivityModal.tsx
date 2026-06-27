import { useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  X, Eye, FlaskConical, Code, Mail, FileCode,
  Clock, Send, Inbox,
} from 'lucide-react'
import type {
  Task, PlaygroundCodeFile, PlaygroundMailThread,
} from '../../context/AppContext'

interface Props {
  task: Task
  employeeName: string
  onClose: () => void
}

export default function PlaygroundActivityModal({ task, employeeName, onClose }: Props) {
  const ps        = task.playgroundState
  const isCode    = (task.playgroundType ?? 'engineering') === 'engineering'
  const isMail    = task.playgroundType === 'sales'

  // ── Code state ────────────────────────────────────────────────────────────
  const codeFiles: PlaygroundCodeFile[] = ps?.codeFiles ?? []
  const [activeFileId, setActiveFileId] = useState<string>(
    ps?.codeActiveId ?? codeFiles[0]?.id ?? ''
  )
  const activeFile = codeFiles.find(f => f.id === activeFileId)
  const totalLines = codeFiles.reduce((s, f) => s + f.content.split('\n').length, 0)

  // ── Mail state ────────────────────────────────────────────────────────────
  const mailThreads: PlaygroundMailThread[] = (ps?.mailThreads ?? []) as PlaygroundMailThread[]
  const [mailView,       setMailView]       = useState<'inbox' | 'sent'>(ps?.mailView ?? 'inbox')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(mailThreads[0]?.id ?? null)
  const activeThread = mailThreads.find(t => t.id === activeThreadId)
  const sentCount     = mailThreads.reduce((s, t) => s + t.messages.filter(m => m.direction === 'sent').length, 0)
  const receivedCount = mailThreads.reduce((s, t) => s + t.messages.filter(m => m.direction === 'received').length, 0)

  const hasActivity = (isCode && codeFiles.length > 0) || (isMail && mailThreads.length > 0)

  const lastSavedLabel = ps?.lastSaved
    ? new Date(ps.lastSaved).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  // ── Filtered threads for sidebar ──────────────────────────────────────────
  const sidebarThreads = mailThreads.filter(t =>
    mailView === 'inbox'
      ? t.messages.some(m => m.direction === 'received')
      : t.messages.some(m => m.direction === 'sent')
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Eye size={15} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-bold text-sm leading-tight">{task.title}</p>
                <span className="text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {isCode ? '💻 Engineering' : '📧 Sales Mail'} Playground
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-white/70 text-xs">
                  <span className="font-semibold text-white/90">{employeeName}</span>'s activity
                </p>
                {lastSavedLabel && (
                  <p className="flex items-center gap-1 text-white/60 text-[10px]">
                    <Clock size={9} /> Last saved {lastSavedLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 px-5 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FlaskConical size={12} className="text-teal-600" />
            <span className="font-semibold text-gray-700">Playground Activity</span>
          </div>
          {isCode && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <FileCode size={11} />
                <span>{codeFiles.length} file{codeFiles.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Code size={11} />
                <span>{totalLines} lines written</span>
              </div>
            </>
          )}
          {isMail && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Send size={11} />
                <span>{sentCount} email{sentCount !== 1 ? 's' : ''} sent</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Inbox size={11} />
                <span>{receivedCount} repl{receivedCount !== 1 ? 'ies' : 'y'} received</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Mail size={11} />
                <span>{mailThreads.length} thread{mailThreads.length !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
            <Eye size={10} /> Read-only view
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        {!hasActivity ? (
          /* No activity yet */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <FlaskConical size={48} className="opacity-20" />
            <p className="text-lg font-semibold text-gray-500">No activity yet</p>
            <p className="text-sm">{employeeName} hasn't used this playground yet.</p>
          </div>

        ) : isCode ? (
          /* ── Code playground view ──────────────────────────────────────── */
          <div className="flex-1 flex overflow-hidden">

            {/* File sidebar */}
            <div className="w-52 border-r border-gray-200 bg-[#1e1e1e] flex flex-col flex-shrink-0">
              <div className="px-3 py-2.5 border-b border-white/10">
                <p className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                  <FolderOpenIcon /> Explorer
                </p>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {codeFiles.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFileId(f.id)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                      f.id === activeFileId
                        ? 'bg-white/10 text-white border-l-2 border-teal-400'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <FileCode size={11} className="flex-shrink-0 opacity-70" />
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto text-white/30 text-[9px] flex-shrink-0">
                      {f.content.split('\n').length}L
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Code viewer */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeFile ? (
                <>
                  {/* Tab bar */}
                  <div className="flex items-center gap-0 bg-[#2d2d2d] border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border-t-2 border-teal-400">
                      <FileCode size={12} className="text-teal-400" />
                      <span className="text-xs text-white/90 font-medium">{activeFile.name}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      height="100%"
                      language={activeFile.language}
                      value={activeFile.content}
                      theme="vs-dark"
                      options={{
                        readOnly:              true,
                        minimap:               { enabled: true },
                        fontSize:              13,
                        lineNumbers:           'on',
                        scrollBeyondLastLine:  false,
                        wordWrap:              'on',
                        contextmenu:           false,
                        renderLineHighlight:   'none',
                        cursorBlinking:        'solid',
                        cursorStyle:           'underline',
                        domReadOnly:           true,
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/30 text-sm bg-[#1e1e1e]">
                  Select a file
                </div>
              )}
            </div>
          </div>

        ) : (
          /* ── Mail playground view ──────────────────────────────────────── */
          <div className="flex-1 flex overflow-hidden">

            {/* Thread sidebar */}
            <div className="w-72 border-r border-gray-200 flex flex-col flex-shrink-0 bg-white">
              {/* Inbox / Sent tabs */}
              <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50 flex gap-1">
                {(['inbox', 'sent'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setMailView(v)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      mailView === v
                        ? 'bg-white shadow-sm text-gray-800 border border-gray-200'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {v === 'inbox' ? <Inbox size={11} /> : <Send size={11} />}
                    {v === 'inbox' ? `Inbox (${receivedCount})` : `Sent (${sentCount})`}
                  </button>
                ))}
              </div>

              {/* Thread list */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {sidebarThreads.length === 0 ? (
                  <div className="text-center py-10 text-xs text-gray-400">
                    No {mailView} messages
                  </div>
                ) : sidebarThreads.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      t.id === activeThreadId
                        ? 'bg-orange-50 border-l-4 border-orange-400'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ background: t.prospect.color }}
                      >
                        {t.prospect.initials}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 truncate">{t.prospect.name}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-700 truncate mb-0.5">{t.subject}</p>
                    <p className="text-[10px] text-gray-400">
                      {t.prospect.role} · {t.prospect.company}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {t.messages.length} message{t.messages.length !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Message thread viewer */}
            <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
              {activeThread ? (
                <>
                  {/* Thread header */}
                  <div className="px-6 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{activeThread.subject}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ background: activeThread.prospect.color }}
                      >
                        {activeThread.prospect.initials}
                      </div>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{activeThread.prospect.name}</span>
                        {' · '}{activeThread.prospect.role}{' @ '}{activeThread.prospect.company}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {activeThread.messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                          msg.direction === 'sent'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className={`text-[10px] font-semibold ${
                              msg.direction === 'sent' ? 'text-orange-200' : 'text-gray-500'
                            }`}>
                              {msg.direction === 'sent' ? employeeName : msg.from}
                            </p>
                            <p className={`text-[10px] ml-auto ${
                              msg.direction === 'sent' ? 'text-orange-200' : 'text-gray-400'
                            }`}>
                              {msg.timestamp}
                            </p>
                          </div>
                          <p className={`text-xs whitespace-pre-wrap leading-relaxed ${
                            msg.direction === 'sent' ? 'text-white' : 'text-gray-700'
                          }`}>
                            {msg.body}
                          </p>
                          {msg.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {msg.attachments.map((a, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                                    msg.direction === 'sent'
                                      ? 'bg-orange-400 text-white'
                                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                                  }`}
                                >
                                  📎 {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Mail size={32} className="opacity-30" />
                  <p className="text-sm">Select a thread to view messages</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// tiny inline icon to avoid extra import
function FolderOpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
