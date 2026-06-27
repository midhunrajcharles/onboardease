/**
 * XTerminal — real bash terminal via xterm.js + WebSocket PTY backend.
 *
 * Protocol:
 *   TEXT frames  = JSON control messages (init, sync, resize)
 *   BINARY frames = raw PTY bytes (both directions)
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XTerminalHandle {
  /** Sync files in the workspace, then optionally run a command */
  runCommand: (command: string, files: { path: string; content: string }[]) => void
  /** Just sync files without running anything */
  syncFiles: (files: { path: string; content: string }[]) => void
}

interface Props {
  /** WebSocket URL for the PTY backend */
  wsUrl: string
  /** Initial files to write to the workspace on connect */
  initFiles?: { path: string; content: string }[]
  /** Called when the PTY session is ready */
  onReady?: () => void
  /** Called when the connection drops */
  onDisconnect?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const XTerminal = forwardRef<XTerminalHandle, Props>(
  ({ wsUrl, initFiles = [], onReady, onDisconnect }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const termRef      = useRef<Terminal | null>(null)
    const fitRef       = useRef<FitAddon | null>(null)
    const wsRef        = useRef<WebSocket | null>(null)
    const readyRef     = useRef(false)

    // ── Expose runCommand / syncFiles to parent ──────────────────────────
    useImperativeHandle(ref, () => ({
      runCommand(command, files) {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return
        ws.send(JSON.stringify({ type: 'sync', files, command }))
      },
      syncFiles(files) {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return
        ws.send(JSON.stringify({ type: 'sync', files }))
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return

      // ── Init xterm.js ────────────────────────────────────────────────
      const term = new Terminal({
        theme: {
          background:         '#0c0c14',
          foreground:         '#d4d4d4',
          cursor:             '#00e676',
          cursorAccent:       '#0c0c14',
          selectionBackground:'#ffffff25',
          black:              '#000000',
          red:                '#f44336',
          green:              '#66bb6a',
          yellow:             '#ffb300',
          blue:               '#42a5f5',
          magenta:            '#ab47bc',
          cyan:               '#26c6da',
          white:              '#bdbdbd',
          brightBlack:        '#555555',
          brightRed:          '#ef5350',
          brightGreen:        '#81c784',
          brightYellow:       '#ffd54f',
          brightBlue:         '#64b5f6',
          brightMagenta:      '#ce93d8',
          brightCyan:         '#4dd0e1',
          brightWhite:        '#eeeeee',
        },
        fontFamily:  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        fontSize:    12.5,
        lineHeight:  1.4,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback:  2000,
        allowTransparency: false,
        convertEol: false,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      fitAddon.fit()

      termRef.current = term
      fitRef.current  = fitAddon

      // ── Connect WebSocket ────────────────────────────────────────────
      const connect = () => {
        readyRef.current = false
        const ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'
        wsRef.current  = ws

        ws.onopen = () => {
          // Send init with all current playground files
          ws.send(JSON.stringify({ type: 'init', files: initFiles }))
        }

        ws.onmessage = (evt) => {
          if (typeof evt.data === 'string') {
            // Control frame
            const ctrl = JSON.parse(evt.data)
            if (ctrl.type === 'ready') {
              readyRef.current = true
              onReady?.()
            }
          } else {
            // Raw PTY bytes → write directly to terminal
            term.write(new Uint8Array(evt.data))
          }
        }

        ws.onclose = () => {
          readyRef.current = false
          term.write('\r\n\x1b[33m[session ended — reconnecting…]\x1b[0m\r\n')
          onDisconnect?.()
          setTimeout(connect, 3000)
        }

        ws.onerror = () => ws.close()
      }

      connect()

      // ── Forward keyboard input → PTY ─────────────────────────────────
      term.onData((data) => {
        const ws = wsRef.current
        if (ws?.readyState === WebSocket.OPEN && readyRef.current) {
          ws.send(new TextEncoder().encode(data))
        }
      })

      // ── Forward resize events ─────────────────────────────────────────
      term.onResize(({ cols, rows }) => {
        const ws = wsRef.current
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }))
        }
      })

      // ── Auto-fit on container resize ──────────────────────────────────
      const ro = new ResizeObserver(() => {
        try { fitAddon.fit() } catch (_) { /* ignore during unmount */ }
      })
      ro.observe(containerRef.current)

      return () => {
        ro.disconnect()
        wsRef.current?.close()
        term.dispose()
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsUrl])

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', padding: '4px 2px' }}
      />
    )
  }
)

XTerminal.displayName = 'XTerminal'
export default XTerminal
