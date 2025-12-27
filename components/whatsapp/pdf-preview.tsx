'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { type FC, useEffect, useMemo, useState } from 'react'

type PdfPreviewProps = {
  url: string
  title?: string
  className?: string
}

type PdfJsDocument = {
  getPage: (pageNumber: number) => Promise<PdfJsPage>
}

type PdfJsViewport = {
  width: number
  height: number
}

type PdfJsRenderTask = {
  promise: Promise<void>
}

type PdfJsPage = {
  getViewport: (opts: { scale: number }) => PdfJsViewport
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: PdfJsViewport }) => PdfJsRenderTask
}

type PdfJsLoadingTask = {
  promise: Promise<PdfJsDocument>
}

type PdfJsApi = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (src: { data: ArrayBuffer }) => PdfJsLoadingTask
}

export const PdfPreview: FC<PdfPreviewProps> = ({ url, title = 'PDF', className }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const safeUrl = useMemo(() => url, [url])

  useEffect(() => {
    let cancelled = false

    async function render() {
      setError(null)
      setDataUrl(null)

      try {
        const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs')
        const pdfjs = pdfjsModule as unknown as PdfJsApi
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        const res = await fetch(safeUrl)
        const buf = await res.arrayBuffer()

        const doc = await pdfjs.getDocument({ data: buf }).promise
        const page = await doc.getPage(1)

        const viewport = page.getViewport({ scale: 1 })
        const targetWidth = 520
        const scale = Math.max(1, targetWidth / Math.max(1, viewport.width))
        const scaledViewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas_context')

        canvas.width = Math.floor(scaledViewport.width)
        canvas.height = Math.floor(scaledViewport.height)

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise

        const nextUrl = canvas.toDataURL('image/png')
        if (cancelled) return
        setDataUrl(nextUrl)
      } catch {
        if (cancelled) return
        setError('preview_failed')
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [safeUrl])

  if (dataUrl) {
    return (
      <div className={cn('relative min-h-0 flex-1', className)}>
        <Image
          src={dataUrl}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 520px"
          className="object-contain"
        />
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-1 items-center justify-center', className)}>
      <div className="text-center text-sm text-whatsapp-text-muted">
        {error ? 'No se pudo previsualizar el PDF' : 'Cargando…'}
      </div>
    </div>
  )
}
