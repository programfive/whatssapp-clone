'use client'

import { Send, X, Plus, FileText, File } from 'lucide-react'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'

// Simulación de AttachmentsMenu (reemplaza con tu componente real)
const AttachmentsMenu: FC<{ buttonClassName: string; onSelectFiles: (kind: string, files: FileList) => void }> = ({
  buttonClassName,
  onSelectFiles,
}) => {
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'image/*,application/pdf'
        input.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement
          const files = target.files
          if (files) onSelectFiles('file', files)
        }
        input.click()
      }}
    >
      <Plus className="h-5 w-5 text-current" />
    </button>
  )
}

type AttachmentPreviewOverlayProps = {
  files: File[]
  onFilesChange: (next: File[]) => void
  onSend: (caption?: string) => void | Promise<void>
}

export function AttachmentPreviewOverlay({
  files,
  onFilesChange,
  onSend,
}: AttachmentPreviewOverlayProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const [pdfPreviews, setPdfPreviews] = useState<Record<string, string>>({})
  const [caption, setCaption] = useState('')

  const isOpen = files.length > 0

  const getFileKey = useCallback((f: File) => `${f.name}-${f.size}-${f.lastModified}`, [])

  // Load PDF.js from CDN if not already loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any)['pdfjs-dist/build/pdf']) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.async = true
      script.onload = () => {
        const pdfjsLib = (window as any)['pdfjs-dist/build/pdf']
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
      }
      document.head.appendChild(script)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0)
      return
    }
    setActiveIndex((idx) => {
      if (idx < 0) return 0
      if (idx >= files.length) return Math.max(0, files.length - 1)
      return idx
    })
  }, [files.length, isOpen])

  useEffect(() => {
    setFileUrls((prev) => {
      const next: Record<string, string> = { ...prev }
      const keepKeys = new Set(files.map(getFileKey))

      for (const [k, url] of Object.entries(next)) {
        if (!keepKeys.has(k)) {
          URL.revokeObjectURL(url)
          delete next[k]
        }
      }

      for (const f of files) {
        const k = getFileKey(f)
        if (!next[k]) next[k] = URL.createObjectURL(f)
      }

      return next
    })
  }, [files, getFileKey])

  useEffect(() => {
    if (!isOpen) {
      setFileUrls((prev) => {
        for (const url of Object.values(prev)) URL.revokeObjectURL(url)
        return {}
      })
      setPdfPreviews({})
      setCaption('')
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      setFileUrls((prev) => {
        for (const url of Object.values(prev)) URL.revokeObjectURL(url)
        return {}
      })
      setPdfPreviews({})
    }
  }, [])

  const activeFile = files[activeIndex]
  const activeUrl = useMemo(() => {
    if (!activeFile) return undefined
    return fileUrls[getFileKey(activeFile)]
  }, [activeFile, fileUrls, getFileKey])

  // Generate PDF preview for the first page
  useEffect(() => {
    const generatePdfPreview = async (file: File, key: string) => {
      if (pdfPreviews[key]) return

      try {
        const pdfjsLib = (window as any)['pdfjs-dist/build/pdf']
        if (!pdfjsLib) {
          console.warn('PDF.js not loaded')
          return
        }

        const url = fileUrls[key]
        if (!url) return

        const loadingTask = pdfjsLib.getDocument(url)
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)

        const scale = 1.5
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) return

        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        const previewUrl = canvas.toDataURL()
        setPdfPreviews((prev) => ({ ...prev, [key]: previewUrl }))
      } catch (error) {
        console.error('Error generating PDF preview:', error)
      }
    }

    const pdfFiles = files.filter(
      (f) => f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf')
    )

    for (const file of pdfFiles) {
      const key = getFileKey(file)
      if (fileUrls[key] && !pdfPreviews[key]) {
        void generatePdfPreview(file, key)
      }
    }
  }, [files, fileUrls, pdfPreviews, getFileKey])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-20 flex h-full flex-col bg-whatsapp-carbon">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          className="text-whatsapp-text-muted hover:text-whatsapp-text-primary"
          aria-label="Cerrar"
          onClick={() => onFilesChange([])}
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex-1 text-center">
          <div className="truncate text-base font-medium text-whatsapp-text-primary">
            {activeFile?.name ?? 'Archivo'}
          </div>
        </div>

        <div className="w-6" />
      </div>

      {/* Preview Area */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-whatsapp-carbon p-8">
        {(() => {
          const file = activeFile
          const url = activeUrl
          const mime = file?.type ?? ''
          const isImg = mime.startsWith('image/')
          const isPdf = mime === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf')

          if (isImg && url) {
            return (
              <div className="relative flex h-full w-full items-center justify-center">
                <img
                  src={url}
                  alt={file?.name ?? 'Imagen'}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </div>
            )
          }

          if (isPdf && url) {
            const pdfPreview = pdfPreviews[getFileKey(file)]

            if (pdfPreview) {
              return (
                <div className="relative flex h-full w-full items-center justify-center p-4">
                  <div className="relative h-full max-h-full w-auto max-w-[500px] overflow-hidden rounded-lg bg-white shadow-lg">
                    <img
                      src={pdfPreview}
                      alt={file?.name ?? 'PDF Preview'}
                      className="h-full w-full object-contain"
                    />
                    <div className="absolute bottom-4 left-4 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      PDF
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-whatsapp-glass bg-whatsapp-charcoal p-8">
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-whatsapp-glass bg-whatsapp-panel">
                  <FileText className="h-16 w-16 text-whatsapp-text-blue" />
                </div>
                <div className="text-center">
                  <div className="mb-1 text-lg font-medium text-whatsapp-text-primary">
                    {file?.name ?? 'Documento.pdf'}
                  </div>
                  <div className="text-sm text-whatsapp-text-muted">
                    PDF • {formatFileSize(file?.size ?? 0)}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-whatsapp-glass bg-whatsapp-charcoal p-8">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-whatsapp-panel">
                <FileText className="h-16 w-16 text-whatsapp-text-muted" />
              </div>
              <div className="text-center">
                <div className="mb-1 text-lg font-medium text-whatsapp-text-primary">
                  {file?.name ?? 'Archivo'}
                </div>
                <div className="text-sm text-whatsapp-text-muted">
                  {formatFileSize(file?.size ?? 0)}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-whatsapp-glass bg-whatsapp-charcoal p-4">
        {/* Thumbnails Row */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
          {files.map((f, idx) => {
            const mime = f.type || ''
            const isImg = mime.startsWith('image/')
            const isPdf = mime === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf')
            const url = fileUrls[getFileKey(f)]
            const isActive = idx === activeIndex

            return (
              <button
                key={`${f.name}-${f.size}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${isActive ? 'border-whatsapp-forest scale-105' : 'border-transparent opacity-60'
                  }`}
                aria-label={f.name}
              >
                {isImg && url ? (
                  <img
                    src={url}
                    alt={f.name}
                    className="h-full w-full object-cover"
                  />
                ) : isPdf ? (
                  pdfPreviews[getFileKey(f)] ? (
                    <div className="relative h-full w-full">
                      <img
                        src={pdfPreviews[getFileKey(f)]}
                        alt={f.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">
                        PDF
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-whatsapp-panel">
                      <FileText className="h-6 w-6 text-whatsapp-text-blue" />
                    </div>
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-whatsapp-panel">
                    <File className="h-6 w-6 text-whatsapp-text-muted" />
                  </div>
                )}
              </button>
            )
          })}

          <AttachmentsMenu
            buttonClassName="h-16 w-16 shrink-0 rounded-lg border-2 border-dashed border-whatsapp-border-soft bg-whatsapp-carbon hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel transition-colors flex items-center justify-center text-whatsapp-text-muted hover:text-whatsapp-text-primary"
            onSelectFiles={(_kind: string, list: FileList) => {
              const incoming = Array.from(list)
              if (incoming.length === 0) return
              onFilesChange([...files, ...incoming])
            }}
          />
        </div>

        {/* Input and Send Button */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Añade un comentario..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="flex-1 rounded-lg bg-whatsapp-carbon px-4 py-3 text-whatsapp-text-primary placeholder:text-whatsapp-text-muted outline-none focus:bg-whatsapp-panel"
          />

          <button
            type="button"
            onClick={() => void onSend(caption)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-whatsapp-forest text-white transition-colors hover:bg-whatsapp-deep-forest"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}