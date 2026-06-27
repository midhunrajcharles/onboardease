import { useState, useEffect } from 'react'
import {
  X, FileText, Maximize2, Minimize2, BookOpen,
  Calendar, HardDrive, Download, AlertCircle, RefreshCw
} from 'lucide-react'
import type { Document } from '../../context/AppContext'

interface Props {
  doc: Document
  onClose: () => void
}

/** Convert a base64 data-URL to a Blob URL the browser can safely load in an iframe */
function dataUrlToBlobUrl(dataUrl: string): string {
  const [header, b64] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  return URL.createObjectURL(blob)
}

/** Decode a base64 data-URL to plain text */
function dataUrlToText(dataUrl: string): string {
  try {
    const b64 = dataUrl.split(',')[1]
    return atob(b64)
  } catch {
    return ''
  }
}

/** Trigger a browser download from a data-URL */
function downloadFile(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrlToBlobUrl(dataUrl)
  a.download = filename
  a.click()
}

const VIEWABLE_IN_IFRAME  = ['PDF', 'PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG']
const VIEWABLE_AS_TEXT    = ['TXT', 'MD', 'CSV', 'JSON', 'XML', 'HTML', 'JS', 'TS']

export default function PDFViewerModal({ doc, onClose }: Props) {
  const [maximized, setMaximized] = useState(false)
  const [blobUrl,   setBlobUrl]   = useState<string | null>(null)
  const [textBody,  setTextBody]  = useState<string | null>(null)

  const fileType = doc.type.toUpperCase()
  const canIframe = VIEWABLE_IN_IFRAME.includes(fileType)
  const canText   = VIEWABLE_AS_TEXT.includes(fileType)
  const hasFile   = !!doc.fileData

  // Build a safe Blob URL (avoids Chrome blocking data: URLs in iframes)
  useEffect(() => {
    if (!doc.fileData) return

    if (canIframe) {
      let url: string
      try {
        url = dataUrlToBlobUrl(doc.fileData)
        setBlobUrl(url)
      } catch { return }
      return () => URL.revokeObjectURL(url)
    }

    if (canText) {
      setTextBody(dataUrlToText(doc.fileData))
    }
  }, [doc.fileData, canIframe, canText])

  const paragraphs = doc.content
    .split(/(?<=\. )/)
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={`relative bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-200 ${
          maximized ? 'w-full max-w-5xl h-[94vh]' : 'w-full max-w-2xl h-[680px]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-brown-600 to-brown-800 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{doc.name}</p>
              <p className="text-white/65 text-xs">{doc.type} · {doc.size} · {doc.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-1 ${
              doc.status === 'processed'
                ? 'bg-green-400/30 text-green-100'
                : 'bg-orange-400/30 text-orange-100'
            }`}>
              {doc.status === 'processed' ? '✓ Processed' : 'Processing…'}
            </span>

            {/* Download button — only when file data present */}
            {hasFile && (
              <button
                onClick={() => downloadFile(doc.fileData!, `${doc.name}.${fileType.toLowerCase()}`)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Download file"
              >
                <Download size={15} />
              </button>
            )}

            <button
              onClick={() => setMaximized(v => !v)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
              title={maximized ? 'Restore' : 'Maximize'}
            >
              {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden rounded-b-2xl bg-gray-100">

          {/* ① Real uploaded PDF / image — iframe with Blob URL */}
          {hasFile && canIframe && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0 rounded-b-2xl"
              title={doc.name}
            />
          )}

          {/* ② Real uploaded text file — decoded content */}
          {hasFile && canText && textBody !== null && (
            <div className="h-full overflow-y-auto p-5">
              <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-brown-100">
                <div className="bg-gradient-to-br from-brown-50 to-blue-50 rounded-t-xl px-6 py-4 border-b border-brown-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                    <FileText size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-bold text-brown-900 text-sm">{doc.name}</p>
                    <p className="text-xs text-brown-400">{doc.type} · {doc.size} · {doc.date}</p>
                  </div>
                </div>
                <pre className="px-6 py-5 text-xs text-brown-700 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {textBody || '(empty file)'}
                </pre>
              </div>
            </div>
          )}

          {/* ③ Uploaded but not viewable inline (docx, pptx, xlsx, etc.) — download prompt */}
          {hasFile && !canIframe && !canText && (
            <div className="h-full flex flex-col items-center justify-center gap-5 p-8">
              <div className="w-16 h-16 bg-brown-100 rounded-2xl flex items-center justify-center">
                <FileText size={28} className="text-brown-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-brown-900 text-lg mb-1">{doc.name}</p>
                <p className="text-sm text-brown-500 mb-1">{fileType} files cannot be previewed in the browser.</p>
                <p className="text-xs text-brown-400">Download the file to open it in its native application.</p>
              </div>
              <button
                onClick={() => downloadFile(doc.fileData!, `${doc.name}.${fileType.toLowerCase()}`)}
                className="btn-primary flex items-center gap-2 px-6 py-2.5"
              >
                <Download size={16} /> Download {fileType}
              </button>
            </div>
          )}

          {/* ④ User-uploaded doc whose fileData was lost after page reload */}
          {!hasFile && doc.taskCount === undefined && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                <AlertCircle size={24} className="text-orange-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-brown-900 mb-1">File preview not available</p>
                <p className="text-sm text-brown-500 mb-1">
                  The file content was cleared when the page was reloaded.
                </p>
                <p className="text-xs text-brown-400">Re-upload the document to preview it again.</p>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-sm text-brown-600 border border-brown-200 bg-white px-4 py-2 rounded-xl hover:bg-brown-50 transition-colors"
              >
                <RefreshCw size={14} /> Close & Re-upload
              </button>
            </div>
          )}

          {/* ⑤ Pre-loaded / simulated documents (have taskCount) — formatted content reader */}
          {!hasFile && doc.taskCount !== undefined && (
            <div className="h-full overflow-y-auto p-5">
              <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-brown-100">
                <div className="bg-gradient-to-br from-brown-50 to-blue-50 rounded-t-xl px-8 py-6 border-b border-brown-100">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center border border-red-200 flex-shrink-0">
                      <BookOpen size={24} className="text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-brown-900 text-xl leading-tight mb-1">{doc.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-brown-500 mt-2">
                        <span className="flex items-center gap-1"><Calendar size={11} />{doc.date}</span>
                        <span className="flex items-center gap-1"><HardDrive size={11} />{doc.size}</span>
                        <span className="bg-brown-100 text-brown-600 px-2 py-0.5 rounded-full font-medium">{doc.type}</span>
                        {doc.taskCount && (
                          <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">{doc.taskCount} tasks extracted</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 space-y-4">
                  <h3 className="text-xs font-bold text-brown-400 uppercase tracking-widest">Document Contents</h3>
                  {paragraphs.map((para, i) => (
                    <p key={i} className="text-sm text-brown-700 leading-relaxed text-justify">{para}</p>
                  ))}
                </div>
                <div className="px-8 py-4 border-t border-brown-100 bg-brown-50 rounded-b-xl flex items-center justify-between">
                  <p className="text-xs text-brown-400">Preview Mode · Document content shown for reference</p>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(p => (
                      <div key={p} className={`w-1.5 h-1.5 rounded-full ${p === 1 ? 'bg-brown-500' : 'bg-brown-200'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
