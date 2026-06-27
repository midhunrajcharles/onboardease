import { useState, useCallback, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import {
  X, Plus, Trash2, Play, Terminal, FileCode, FileText,
  File, FolderOpen, ChevronRight, FlaskConical, RefreshCw,
  Bot, Send, Sparkles, ChevronLeft, Loader2,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Task } from '../../context/AppContext'
import { generateCodeAssistantReply } from '../../services/aiService'
import type { CodeAssistantMessage } from '../../services/aiService'
import MarkdownRenderer from '../common/MarkdownRenderer'
import XTerminal, { type XTerminalHandle } from '../common/XTerminal'

// ─── File node ────────────────────────────────────────────────────────────────

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  language: string        // '' for folders
  content: string         // '' for folders
  parentId: string | null // null = root
  isOpen: boolean         // folder expanded state
}

// Normalize legacy FileNode arrays (add missing fields)
function normalizeFiles(nodes: any[]): FileNode[] {
  return nodes.map(n => ({
    ...n,
    type:     n.type     ?? 'file',
    parentId: n.parentId ?? null,
    isOpen:   n.isOpen   ?? false,
  }))
}

// Compute slash-separated path from root for a file (used for workspace writes)
function getFilePath(file: FileNode, all: FileNode[]): string {
  const parts: string[] = [file.name]
  let cur = file
  while (cur.parentId) {
    const parent = all.find(f => f.id === cur.parentId)
    if (!parent) break
    parts.unshift(parent.name)
    cur = parent
  }
  return parts.join('/')
}

// ─── Pre-populate files based on task category/title ─────────────────────────

function getInitialFiles(task: Task): any[] {
  const cat   = (task.category   ?? '').toLowerCase()
  const title = (task.title      ?? '').toLowerCase()
  const desc  = (task.description ?? '')

  const isEngineering = cat.includes('technical') || cat.includes('setup') || cat.includes('tools') ||
    title.includes('code') || title.includes('react') || title.includes('develop') ||
    title.includes('github') || title.includes('environment') || title.includes('api') ||
    title.includes('script') || title.includes('test') || title.includes('deploy')

  const isCompliance = cat.includes('compliance') || cat.includes('learning') || cat.includes('admin')

  if (isEngineering) {
    return [
      {
        id: '1', name: 'index.html', language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${task.title}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">
    <h1>🧪 Playground — ${task.title}</h1>
    <p class="subtitle">${desc || 'Practice sandbox — experiment freely!'}</p>
    <div id="output"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        id: '2', name: 'script.js', language: 'javascript',
        content: `// ── ${task.title} ──────────────────────────────────────
// Sandbox environment — experiment freely, nothing here affects real progress.

// Example: modify this function and click Run to see output
function greet(name) {
  return \`👋 Hello, \${name}! Welcome to the playground.\`;
}

// Try it out
const message = greet('New Hire');
console.log(message);

// ── Your practice code below ────────────────────────────
// TODO: Try out the concepts from this task here!
`,
      },
      {
        id: '3', name: 'styles.css', language: 'css',
        content: `/* ── ${task.title} — Styles ─────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
  padding: 2rem;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  background: #1e293b;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 32px rgba(0,0,0,0.4);
}

h1 { font-size: 1.5rem; color: #2dd4bf; margin-bottom: 0.5rem; }
.subtitle { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
#output { margin-top: 1rem; padding: 1rem; background: #0f172a; border-radius: 8px; }
`,
      },
      {
        id: '4', name: 'notes.md', language: 'markdown',
        content: `# ${task.title} — Sandbox Notes

## Task Description
${desc || 'Use this space to practice and explore.'}

## My Progress
${(task.subtasks ?? []).map(s => `- [ ] ${s.title}`).join('\n') || '- [ ] Complete practice\n- [ ] Review output\n- [ ] Note key learnings'}

## Key Learnings
> Write your observations here…

## Questions
1.
2.
3.
`,
      },
      {
        id: '5', name: 'main.py', language: 'python',
        content: `# ── ${task.title} — Python Sandbox ─────────────────────
# Run with ▶ Run button. Executes remotely via Piston API.

def greet(name: str) -> str:
    return f"👋 Hello, {name}! Welcome to the Python sandbox."

# Try it out
print(greet("New Hire"))

# ── Your practice code below ────────────────────────────
# TODO: Experiment with Python concepts here!
`,
      },
      {
        id: '6', name: 'main.cpp', language: 'cpp',
        content: `// ── ${task.title} — C++ Sandbox ──────────────────────────
// Run with ▶ Run button. Compiled & executed remotely via Piston API.

#include <iostream>
#include <string>
using namespace std;

string greet(const string& name) {
    return "Hello, " + name + "! Welcome to the C++ sandbox.";
}

int main() {
    cout << greet("New Hire") << endl;

    // TODO: Experiment with C++ concepts here!
    return 0;
}
`,
      },
    ]
  }

  if (isCompliance) {
    return [
      {
        id: '1', name: 'study-notes.md', language: 'markdown',
        content: `# ${task.title} — Study Notes

## Overview
${desc || 'Document your key learnings and notes here.'}

## Key Points
-
-
-

## Summary
> Write a brief summary of what you've learned…

## Questions for Mentor
1.
2.
`,
      },
      {
        id: '2', name: 'checklist.md', language: 'markdown',
        content: `# ${task.title} — Checklist

${(task.subtasks ?? []).map(s => `- [ ] ${s.title}`).join('\n') || '- [ ] Read the material\n- [ ] Complete the quiz\n- [ ] Discuss with mentor'}

## Notes
> Add any additional observations here…
`,
      },
      {
        id: '3', name: 'quiz.js', language: 'javascript',
        content: `// ${task.title} — Self-Quiz
// Test your understanding by filling in the answers below.

const quiz = [
  {
    question: "What is the main goal of this task?",
    answer: "", // TODO: fill in your answer
  },
  {
    question: "List one key policy or requirement from this task:",
    answer: "", // TODO: fill in your answer
  },
  {
    question: "How does this apply to your daily work?",
    answer: "", // TODO: fill in your answer
  },
];

// Check your answers
quiz.forEach((q, i) => {
  console.log(\`Q\${i + 1}: \${q.question}\`);
  console.log(\`A: \${q.answer || '(not answered yet)'}\`);
  console.log('---');
});
`,
      },
    ]
  }

  // Default — general workspace
  return [
    {
      id: '1', name: 'workspace.md', language: 'markdown',
      content: `# ${task.title}

## Description
${desc || 'Practice workspace for this task.'}

## Notes
Add your notes here…

## Progress
${(task.subtasks ?? []).map(s => `- [ ] ${s.title}`).join('\n') || '- [ ] Complete the task'}
`,
    },
    {
      id: '2', name: 'practice.js', language: 'javascript',
      content: `// ${task.title} — Practice Script
// Use this space to try out any concepts related to this task.

console.log("🧪 Playground ready!");

// TODO: Add your practice code here
`,
    },
    {
      id: '3', name: 'scratch.json', language: 'json',
      content: `{
  "task": "${task.title}",
  "notes": [],
  "progress": 0,
  "completed": false
}
`,
    },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['js', 'jsx'].includes(ext ?? ''))   return <FileCode size={13} className="text-yellow-400 flex-shrink-0" />
  if (['ts', 'tsx'].includes(ext ?? ''))   return <FileCode size={13} className="text-blue-400 flex-shrink-0" />
  if (['css', 'scss'].includes(ext ?? '')) return <FileCode size={13} className="text-sky-400 flex-shrink-0" />
  if (ext === 'html')                      return <FileCode size={13} className="text-orange-400 flex-shrink-0" />
  if (ext === 'md')                        return <FileText size={13} className="text-green-400 flex-shrink-0" />
  if (ext === 'json')                      return <FileText size={13} className="text-amber-400 flex-shrink-0" />
  if (ext === 'py')                        return <FileCode size={13} className="text-blue-300 flex-shrink-0" />
  if (ext === 'cpp' || ext === 'c')        return <FileCode size={13} className="text-purple-400 flex-shrink-0" />
  return <File size={13} className="text-white/40 flex-shrink-0" />
}

function langFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'js'   || ext === 'jsx') return 'javascript'
  if (ext === 'ts'   || ext === 'tsx') return 'typescript'
  if (ext === 'css'  || ext === 'scss') return 'css'
  if (ext === 'html') return 'html'
  if (ext === 'md')   return 'markdown'
  if (ext === 'json') return 'json'
  if (ext === 'py')   return 'python'
  if (ext === 'cpp')  return 'cpp'
  if (ext === 'c')    return 'c'
  return 'plaintext'
}

// ─── Terminal config ──────────────────────────────────────────────────────────

const PTY_WS_URL = import.meta.env.VITE_PTY_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/pty`

// Safe JS sandbox using Function constructor
function runJavaScript(code: string): string {
  const logs: string[] = []
  try {
    const sandboxConsole = {
      log:   (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: any[]) => logs.push('❌ Error: ' + args.join(' ')),
      warn:  (...args: any[]) => logs.push('⚠️  Warning: ' + args.join(' ')),
      info:  (...args: any[]) => logs.push('ℹ️  ' + args.join(' ')),
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function('console', code)
    fn(sandboxConsole)
    return logs.length > 0 ? logs.join('\n') : '✓ Ran successfully — no output'
  } catch (err: any) {
    return `✗ Runtime error: ${err.message}`
  }
}

// ─── AI Message bubble ────────────────────────────────────────────────────────

function AiMessageBubble({ msg }: { msg: CodeAssistantMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[88%] bg-teal-600/25 border border-teal-500/30 rounded-2xl rounded-tr-sm px-3 py-2">
          <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 mb-4">
      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Bot size={11} className="text-white" />
      </div>
      <div className="flex-1 min-w-0 bg-[#1a1a2e] border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5">
        <MarkdownRenderer content={msg.content} theme="dark" />
      </div>
    </div>
  )
}

// ─── Quick prompt chips ───────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: 'Explain this file', prompt: 'Explain what the active file does in plain English.' },
  { label: 'Find bugs', prompt: 'Review the active file and point out any bugs, errors, or potential issues.' },
  { label: 'Improve code', prompt: 'Suggest improvements to make the active file more readable, efficient, or correct.' },
  { label: 'Write tests', prompt: 'Write unit tests for the functions in the active file.' },
  { label: 'Add comments', prompt: 'Add helpful inline comments to the active file to explain what each section does.' },
  { label: 'How does it work?', prompt: 'Walk me through exactly how this code works step by step.' },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  task: Task
  onClose: () => void
  onMarkDone: () => void
}

export default function CodePlaygroundModal({ task, onClose, onMarkDone }: Props) {
  const { dispatch } = useApp()

  // ── Restore from saved state or start fresh ──────────────────────────────
  const savedState   = task.playgroundState
  const initialFiles = normalizeFiles(
    savedState?.codeFiles?.length ? (savedState.codeFiles as FileNode[]) : getInitialFiles(task)
  )

  const [files,         setFiles]         = useState<FileNode[]>(initialFiles)
  const [activeId,      setActiveId]      = useState<string>(savedState?.codeActiveId ?? initialFiles[0]?.id ?? '')
  const [showConsole,   setShowConsole]   = useState(false)
  const [newFileName,   setNewFileName]   = useState('')
  const [newItemType,   setNewItemType]   = useState<'file' | 'folder'>('file')
  const [newItemParent, setNewItemParent] = useState<string | null>(null)
  const [showNewFile,   setShowNewFile]   = useState(false)

  // Ref to the xterm.js terminal handle (runCommand / syncFiles)
  const xtermRef = useRef<XTerminalHandle>(null)

  // ── AI panel draggable width ──────────────────────────────────────────────
  const [aiPanelWidth,   setAiPanelWidth]   = useState(320)
  const isDragging    = useRef(false)
  const dragStartX    = useRef(0)
  const dragStartW    = useRef(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      // Moving left → positive dx → width increases (handle is on left edge)
      const dx   = dragStartX.current - e.clientX
      const newW = Math.max(240, Math.min(640, dragStartW.current + dx))
      setAiPanelWidth(newW)
    }
    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current           = false
      document.body.style.cursor      = ''
      document.body.style.userSelect  = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  const startDrag = (e: React.MouseEvent) => {
    isDragging.current          = true
    dragStartX.current          = e.clientX
    dragStartW.current          = aiPanelWidth
    // Lock cursor + block text selection for the entire document while dragging
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  // ── AI Assistant state ────────────────────────────────────────────────────
  const [showAI,     setShowAI]     = useState(true)
  const [aiMessages, setAiMessages] = useState<CodeAssistantMessage[]>([
    {
      role: 'assistant',
      content: `👋 Hi! I'm your AI code assistant.\n\nI have full access to all ${initialFiles.length} file${initialFiles.length !== 1 ? 's' : ''} in this playground and I know the context of your task.\n\nAsk me anything — I can help you write code, explain logic, debug errors, or suggest improvements.`,
    },
  ])
  const [aiInput,   setAiInput]   = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiEndRef   = useRef<HTMLDivElement>(null)
  const aiInputRef = useRef<HTMLTextAreaElement>(null)

  const activeFile = files.find(f => f.id === activeId)

  // ── Auto-scroll AI chat ───────────────────────────────────────────────────
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, aiLoading])

  // ── Auto-save (debounced 800 ms) whenever files or activeId change ────────
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
              codeFiles:    files,
              codeActiveId: activeId,
              lastSaved:    new Date().toISOString(),
            },
          },
        },
      })
    }, 800)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [files, activeId])

  const updateContent = useCallback((value: string | undefined) => {
    setFiles(prev => prev.map(f => f.id === activeId ? { ...f, content: value ?? '' } : f))
  }, [activeId])

  const addFile = () => {
    const name = newFileName.trim()
    if (!name) return
    const isFolder = newItemType === 'folder'
    const newNode: FileNode = {
      id:       Date.now().toString(),
      name,
      type:     isFolder ? 'folder' : 'file',
      language: isFolder ? '' : langFromName(name),
      content:  isFolder ? '' : `// ${name}\n`,
      parentId: newItemParent,
      isOpen:   isFolder,
    }
    setFiles(prev => {
      // If creating inside a folder, ensure that folder is open
      if (newItemParent) {
        return prev.map(f => f.id === newItemParent ? { ...f, isOpen: true } : f).concat(newNode)
      }
      return [...prev, newNode]
    })
    if (!isFolder) setActiveId(newNode.id)
    setNewFileName('')
    setShowNewFile(false)
    setNewItemParent(null)
    setNewItemType('file')
  }

  const toggleFolder = (id: string) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f))

  const deleteFile = (id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id)
      if (activeId === id && next.length > 0) setActiveId(next[0].id)
      return next
    })
  }

  // Build the shell command to run the active file
  const buildCommand = (file: FileNode): string | null => {
    const lang = file.language
    const path = getFilePath(file, files)
    if (lang === 'javascript')  return `node ${path}`
    if (lang === 'typescript')  return `npx ts-node ${path}`
    if (lang === 'python')      return `python3 ${path}`
    if (lang === 'cpp')         return `g++ -std=c++17 -o /tmp/playground_prog ${path} && /tmp/playground_prog`
    if (lang === 'c')           return `gcc -o /tmp/playground_prog ${path} && /tmp/playground_prog`
    return null
  }

  const filePayload = () =>
    files.filter(f => f.type === 'file').map(f => ({ path: getFilePath(f, files), content: f.content }))

  const runCode = () => {
    if (!activeFile || activeFile.type === 'folder') return
    const cmd = buildCommand(activeFile)
    setShowConsole(true)
    if (!cmd) return
    xtermRef.current?.runCommand(cmd, filePayload())
  }

  const clearTerminal = () => {
    // Send Ctrl+L to bash to clear the screen
    xtermRef.current?.runCommand('clear', filePayload())
  }

  // ── Send message to AI assistant ──────────────────────────────────────────
  const sendAiMessage = async (text?: string) => {
    const msg = (text ?? aiInput).trim()
    if (!msg || aiLoading) return
    setAiInput('')

    const userMsg: CodeAssistantMessage = { role: 'user', content: msg }
    const nextHistory = [...aiMessages, userMsg]
    setAiMessages(nextHistory)
    setAiLoading(true)

    const projectFiles = files.map(f => ({ name: f.name, language: f.language, content: f.content }))
    const historyForApi = nextHistory.filter(m => m.role !== 'assistant' || nextHistory.indexOf(m) > 0)

    const reply = await generateCodeAssistantReply(
      task.title,
      task.description,
      projectFiles,
      activeFile?.name ?? '',
      historyForApi.slice(-10),   // last 10 turns for context window efficiency
      msg,
    )

    setAiMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: reply ?? '⚠️ I couldn\'t reach the AI right now. Please check your connection and try again.',
      },
    ])
    setAiLoading(false)
  }

  const handleAiKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendAiMessage()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#1e1e2e]" style={{ fontFamily: 'inherit' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#12121f] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <FlaskConical size={15} className="text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">{task.title}</p>
            <p className="text-[10px] text-white/40 mt-0.5">🧪 Sandbox · changes don't affect your real progress</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Run */}
          <button
            onClick={runCode}
            className="flex items-center gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Play size={11} /> Run
          </button>

          {/* Console toggle */}
          <button
            onClick={() => setShowConsole(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              showConsole ? 'bg-teal-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white/70'
            }`}
          >
            <Terminal size={11} /> Console
          </button>

          {/* AI Assistant toggle */}
          <button
            onClick={() => setShowAI(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              showAI
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                : 'bg-white/10 hover:bg-white/20 text-white/70'
            }`}
          >
            <Sparkles size={11} /> AI Assistant
          </button>

          {/* Mark done */}
          <button
            onClick={onMarkDone}
            className="text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            ✓ Mark Done
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Main body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── File browser (left) ─────────────────────────────────────────── */}
        <div className="w-52 bg-[#16162a] border-r border-white/10 flex flex-col flex-shrink-0">

          {/* Explorer header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <FolderOpen size={11} className="text-white/30" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Explorer</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { setNewItemType('file'); setNewItemParent(null); setShowNewFile(v => !v) }}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                title="New file"
              ><Plus size={13} /></button>
              <button
                onClick={() => { setNewItemType('folder'); setNewItemParent(null); setShowNewFile(v => !v) }}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-yellow-400 transition-colors"
                title="New folder"
              ><FolderOpen size={12} /></button>
            </div>
          </div>

          {/* New file/folder input */}
          {showNewFile && (
            <div className="px-2 pt-2 pb-1 border-b border-white/10">
              <input
                autoFocus
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  { addFile() }
                  if (e.key === 'Escape') { setShowNewFile(false); setNewFileName(''); setNewItemParent(null) }
                }}
                placeholder={newItemType === 'folder' ? 'folder-name' : 'filename.py'}
                className="w-full bg-[#0f0f1a] text-white text-xs px-2 py-1.5 rounded border border-teal-500/50 focus:outline-none focus:border-teal-400 font-mono"
              />
              <p className="text-[10px] text-white/25 mt-1 px-1">
                {newItemType === 'folder' ? '📁 folder' : '📄 file'} · Enter to create · Esc to cancel
              </p>
            </div>
          )}

          {/* Recursive file tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {(() => {
              const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
                const children = files
                  .filter(n => n.parentId === parentId)
                  .sort((a, b) => {
                    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
                    return a.name.localeCompare(b.name)
                  })
                return children.map(node => {
                  const isActive = activeId === node.id
                  const indent = depth * 10 + 12
                  if (node.type === 'folder') {
                    return (
                      <div key={node.id}>
                        <div
                          onClick={() => toggleFolder(node.id)}
                          style={{ paddingLeft: indent }}
                          className="flex items-center gap-1.5 pr-2 py-1.5 cursor-pointer group text-white/55 hover:bg-white/5 hover:text-white/80 transition-colors"
                        >
                          <ChevronRight size={9} className={`text-white/25 flex-shrink-0 transition-transform ${node.isOpen ? 'rotate-90' : ''}`} />
                          <FolderOpen size={13} className="text-yellow-400/80 flex-shrink-0" />
                          <span className="flex-1 text-xs font-mono truncate">{node.name}</span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                            <button
                              onClick={e => { e.stopPropagation(); setNewItemType('file'); setNewItemParent(node.id); setShowNewFile(true) }}
                              className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70"
                              title="New file inside"
                            ><Plus size={9} /></button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteFile(node.id) }}
                              className="p-0.5 rounded hover:bg-red-500/30 text-white/30 hover:text-red-400"
                              title="Delete folder"
                            ><Trash2 size={9} /></button>
                          </div>
                        </div>
                        {node.isOpen && renderTree(node.id, depth + 1)}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={node.id}
                      onClick={() => setActiveId(node.id)}
                      style={{ paddingLeft: indent }}
                      className={`flex items-center gap-1.5 pr-2 py-1.5 cursor-pointer group transition-colors ${
                        isActive
                          ? 'bg-teal-500/20 text-white border-l-2 border-l-teal-400'
                          : 'text-white/55 hover:bg-white/5 hover:text-white/80 border-l-2 border-l-transparent'
                      }`}
                    >
                      {getFileIcon(node.name)}
                      <span className="flex-1 text-xs font-mono truncate">{node.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteFile(node.id) }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/30 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                        title="Delete file"
                      ><Trash2 size={10} /></button>
                    </div>
                  )
                })
              }
              return renderTree(null, 0)
            })()}
          </div>

          {/* Task subtasks panel */}
          {(task.subtasks ?? []).length > 0 && (
            <div className="border-t border-white/10 px-3 py-3 flex-shrink-0">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Task Steps</p>
              <div className="space-y-1.5">
                {task.subtasks!.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-1.5">
                    <span className="text-[10px] text-teal-500/60 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span className="text-[10px] text-white/40 leading-relaxed">{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Editor + console (center) ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Tab bar — only files, not folders */}
          <div className="flex items-center bg-[#12121f] border-b border-white/10 overflow-x-auto flex-shrink-0 scrollbar-none">
            {files.filter(f => f.type === 'file').map(file => (
              <button
                key={file.id}
                onClick={() => setActiveId(file.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono whitespace-nowrap border-r border-white/10 transition-colors flex-shrink-0 ${
                  activeId === file.id
                    ? 'bg-[#1e1e2e] text-white border-t-2 border-t-teal-400 -mb-px pt-[calc(0.5rem-2px)]'
                    : 'text-white/40 hover:text-white/70 hover:bg-[#1e1e2e]/50 border-t-2 border-t-transparent'
                }`}
              >
                {getFileIcon(file.name)}
                {file.name}
              </button>
            ))}
          </div>

          {/* Monaco editor */}
          <div className="flex-1 min-h-0">
            {activeFile ? (
              <Editor
                height="100%"
                language={activeFile.language}
                value={activeFile.content}
                onChange={updateContent}
                theme="vs-dark"
                options={{
                  fontSize:                   13,
                  fontFamily:                 "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                  fontLigatures:              true,
                  minimap:                    { enabled: false },
                  scrollBeyondLastLine:       false,
                  lineNumbersMinChars:        3,
                  padding:                    { top: 16, bottom: 16 },
                  smoothScrolling:            true,
                  cursorSmoothCaretAnimation: 'on',
                  wordWrap:                   'on',
                  renderLineHighlight:        'line',
                  bracketPairColorization:    { enabled: true },
                  formatOnPaste:              true,
                  tabSize:                    2,
                  automaticLayout:            true,
                  scrollbar: {
                    verticalScrollbarSize:   6,
                    horizontalScrollbarSize: 6,
                  },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-white/20 text-sm">Select a file to edit</p>
              </div>
            )}
          </div>

          {/* xterm.js Terminal */}
          {showConsole && (
            <div className="h-64 bg-[#0c0c14] border-t border-white/10 flex flex-col flex-shrink-0">
              {/* Title bar */}
              <div className="flex items-center justify-between px-3 py-1 border-b border-white/8 bg-[#111120] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70 cursor-pointer" onClick={() => setShowConsole(false)} />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <div className="flex items-center gap-1.5 ml-2">
                    <Terminal size={10} className="text-white/30" />
                    <span className="text-[10px] font-semibold text-white/25 tracking-wide">bash — playground</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={clearTerminal} className="text-[10px] text-white/20 hover:text-white/50 font-mono transition-colors">clear</button>
                  <button onClick={() => setShowConsole(false)} className="text-white/20 hover:text-white/50 transition-colors"><X size={11} /></button>
                </div>
              </div>
              {/* xterm.js fills the rest */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <XTerminal
                  ref={xtermRef}
                  wsUrl={PTY_WS_URL}
                  initFiles={filePayload()}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── AI Assistant pane (right) ────────────────────────────────────── */}
        {showAI && (
          <div
            className="bg-[#13132a] border-l border-white/10 flex flex-col flex-shrink-0 relative"
            style={{ width: aiPanelWidth }}
          >
            {/* Drag handle — left edge (12 px hit area, 2 px visible bar) */}
            <div
              onMouseDown={startDrag}
              style={{ cursor: 'col-resize' }}
              className="absolute left-0 top-0 bottom-0 w-3 z-20 group flex items-center justify-center"
              title="Drag to resize panel"
            >
              {/* Visual bar */}
              <div className="w-0.5 h-full bg-white/8 group-hover:bg-purple-400/70 transition-colors duration-150" />
              {/* Grip dots centred in the bar */}
              <div className="absolute flex flex-col gap-1 pointer-events-none top-1/2 -translate-y-1/2">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className="w-0.5 h-0.5 rounded-full bg-white/20 group-hover:bg-purple-300/80 transition-colors" />
                ))}
              </div>
            </div>

            {/* AI pane header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e0e20] flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                  <Sparkles size={11} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none">AI Code Assistant</p>
                  <p className="text-[9px] text-white/40 mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''} in context · {activeFile?.name ?? 'no file'} active</p>
                </div>
              </div>
              <button
                onClick={() => setShowAI(false)}
                className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
            </div>

            {/* Quick prompts */}
            <div className="px-3 pt-3 pb-2 border-b border-white/5 flex-shrink-0">
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(q => (
                  <button
                    key={q.label}
                    onClick={() => sendAiMessage(q.prompt)}
                    disabled={aiLoading}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-purple-600/30 hover:text-purple-300 text-white/50 border border-white/10 hover:border-purple-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {aiMessages.map((msg, i) => (
                <AiMessageBubble key={i} msg={msg} />
              ))}

              {/* Loading indicator */}
              {aiLoading && (
                <div className="flex gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Loader2 size={11} className="text-white animate-spin" />
                  </div>
                  <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-white/10 flex-shrink-0">
              <div className="flex items-end gap-2 bg-[#0f0f1a] border border-white/10 rounded-xl px-3 py-2 focus-within:border-purple-500/50 transition-colors">
                <textarea
                  ref={aiInputRef}
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={handleAiKeyDown}
                  placeholder="Ask about your code… (Enter to send)"
                  disabled={aiLoading}
                  rows={2}
                  className="flex-1 bg-transparent text-xs text-white/80 placeholder-white/20 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
                  style={{ maxHeight: 80 }}
                />
                <button
                  onClick={() => sendAiMessage()}
                  disabled={!aiInput.trim() || aiLoading}
                  className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
              <p className="text-[9px] text-white/20 mt-1.5 text-center">Shift+Enter for new line · Enter to send</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
