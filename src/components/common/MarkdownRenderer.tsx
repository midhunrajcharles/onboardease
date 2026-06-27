/**
 * MarkdownRenderer — lightweight markdown renderer for AI assistant replies.
 * Supports: fenced code blocks, headers (H1–H3), bold, italic, inline code,
 * bullet lists, numbered lists, horizontal rules, and plain paragraphs.
 * Themes: 'dark' (VS Code playground) | 'light' (email playground / chat)
 */

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  content: string
  /** 'dark' = VS Code dark bg · 'light' = white/gray card bg */
  theme?: 'dark' | 'light'
  className?: string
}

// ─── Code block sub-component ─────────────────────────────────────────────────

function CodeBlock({ raw, dark }: { raw: string; dark: boolean }) {
  const [copied, setCopied] = useState(false)

  // Strip opening/closing fences
  const inner      = raw.replace(/^```([a-z]*)\n?/, '').replace(/\n?```$/, '')
  const langMatch  = raw.match(/^```([a-z]*)/)
  const lang       = langMatch?.[1] ?? ''
  const code       = inner.replace(/\n$/, '')

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`my-2 rounded-lg overflow-hidden border ${dark ? 'border-white/10' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-1.5 ${dark ? 'bg-white/5 border-b border-white/10' : 'bg-gray-50 border-b border-gray-200'}`}>
        <span className={`text-[10px] font-mono font-semibold ${dark ? 'text-white/40' : 'text-gray-400'}`}>
          {lang || 'code'}
        </span>
        <button
          onClick={copy}
          className={`flex items-center gap-1 text-[10px] transition-colors ${dark ? 'text-white/35 hover:text-teal-400' : 'text-gray-400 hover:text-teal-600'}`}
        >
          {copied ? <Check size={9} /> : <Copy size={9} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className={`px-3 py-3 text-[11.5px] font-mono overflow-x-auto leading-relaxed whitespace-pre ${dark ? 'bg-[#0d0d1a] text-emerald-300' : 'bg-[#1e1e2e] text-emerald-300'}`}>
        {code}
      </pre>
    </div>
  )
}

// ─── Inline markdown (bold, italic, inline code) ──────────────────────────────

function renderInline(text: string, dark: boolean): React.ReactNode {
  // Split on **bold**, `code`, *italic*
  const tokens = text.split(/(\*\*[\s\S]+?\*\*|`[^`\n]+`|\*[\s\S]+?\*)/g)
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('**') && tok.endsWith('**')) {
          return (
            <strong key={i} className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
              {tok.slice(2, -2)}
            </strong>
          )
        }
        if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
          return (
            <code
              key={i}
              className={`text-[11px] font-mono px-1 py-0.5 rounded ${dark ? 'bg-white/10 text-yellow-300' : 'bg-gray-100 text-pink-600 border border-gray-200'}`}
            >
              {tok.slice(1, -1)}
            </code>
          )
        }
        if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
          return <em key={i} className={dark ? 'text-white/85 italic' : 'text-gray-700 italic'}>{tok.slice(1, -1)}</em>
        }
        return <React.Fragment key={i}>{tok}</React.Fragment>
      })}
    </>
  )
}

// ─── Text segment — renders non-code markdown ─────────────────────────────────

function TextBlock({ text, dark }: { text: string; dark: boolean }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  const tx = (s: string) => renderInline(s, dark)

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty
    if (trimmed === '') {
      if (nodes.length > 0) nodes.push(<div key={`gap-${i}`} className="h-1.5" />)
      i++; continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      nodes.push(<hr key={i} className={`my-2 ${dark ? 'border-white/10' : 'border-gray-200'}`} />)
      i++; continue
    }

    // H3
    if (trimmed.startsWith('### ')) {
      nodes.push(
        <p key={i} className={`text-xs font-bold mt-2 mb-0.5 ${dark ? 'text-white/90' : 'text-gray-800'}`}>
          {tx(trimmed.slice(4))}
        </p>
      )
      i++; continue
    }
    // H2
    if (trimmed.startsWith('## ')) {
      nodes.push(
        <p key={i} className={`text-sm font-bold mt-2.5 mb-1 ${dark ? 'text-teal-300' : 'text-gray-900'}`}>
          {tx(trimmed.slice(3))}
        </p>
      )
      i++; continue
    }
    // H1
    if (trimmed.startsWith('# ')) {
      nodes.push(
        <p key={i} className={`text-sm font-extrabold mt-2.5 mb-1 ${dark ? 'text-teal-300' : 'text-gray-900'}`}>
          {tx(trimmed.slice(2))}
        </p>
      )
      i++; continue
    }

    // Bullet list — collect consecutive bullet items
    if (/^[-•*]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•*]\s/, ''))
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 space-y-0.5 pl-0.5">
          {items.map((item, j) => (
            <li key={j} className={`flex items-start gap-2 text-xs leading-relaxed ${dark ? 'text-white/80' : 'text-gray-700'}`}>
              <span className={`mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${dark ? 'bg-teal-400/70' : 'bg-gray-400'}`} />
              <span>{tx(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list — collect consecutive numbered items
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      let num = 0
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        num++; i++
      }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1 space-y-0.5 pl-0.5">
          {items.map((item, j) => (
            <li key={j} className={`flex items-start gap-2 text-xs leading-relaxed ${dark ? 'text-white/80' : 'text-gray-700'}`}>
              <span className={`flex-shrink-0 text-[10px] font-bold min-w-[14px] text-right mt-0.5 ${dark ? 'text-teal-400/60' : 'text-gray-400'}`}>
                {j + 1}.
              </span>
              <span>{tx(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Regular line
    nodes.push(
      <p key={i} className={`text-xs leading-relaxed ${dark ? 'text-white/80' : 'text-gray-700'}`}>
        {tx(trimmed)}
      </p>
    )
    i++
  }

  return <>{nodes}</>
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function MarkdownRenderer({ content, theme = 'dark', className }: Props) {
  const dark = theme === 'dark'

  // Split into fenced code blocks and text segments
  const segments = content
    .split(/(```(?:[a-zA-Z0-9]*)\n?[\s\S]*?```)/g)
    .filter(s => s.length > 0)

  return (
    <div className={`space-y-0.5 ${className ?? ''}`}>
      {segments.map((seg, i) =>
        seg.startsWith('```')
          ? <CodeBlock key={i} raw={seg} dark={dark} />
          : <TextBlock key={i} text={seg} dark={dark} />
      )}
    </div>
  )
}
