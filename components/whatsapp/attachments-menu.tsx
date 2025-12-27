'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  Camera,
  BarChart3,
  FileText,
  Image as ImageIcon,
  Mic,
  Plus,
  User,
} from 'lucide-react'
import { type FC, useCallback, useRef } from 'react'

export type AttachmentKind = 'document' | 'media' | 'camera' | 'audio' | 'contact'

interface AttachmentsMenuProps {
  className?: string
  buttonClassName?: string
  onSelectFiles?: (kind: Exclude<AttachmentKind, 'contact'>, files: FileList) => void
  onSelectContact?: () => void
  onSelectPoll?: () => void
}

export const AttachmentsMenu: FC<AttachmentsMenuProps> = ({
  className,
  buttonClassName,
  onSelectFiles,
  onSelectContact,
  onSelectPoll,
}) => {
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const mediaInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const audioInputRef = useRef<HTMLInputElement | null>(null)

  const consumeFiles = useCallback(
    (kind: Exclude<AttachmentKind, 'contact'>, files: FileList | null) => {
      if (!files || files.length === 0) return
      onSelectFiles?.(kind, files)
    },
    [onSelectFiles]
  )

  return (
    <div className={cn('relative', className)}>
      <input
        ref={docInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          consumeFiles('document', e.target.files)
          e.currentTarget.value = ''
        }}
      />
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          consumeFiles('media', e.target.files)
          e.currentTarget.value = ''
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          consumeFiles('camera', e.target.files)
          e.currentTarget.value = ''
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          consumeFiles('audio', e.target.files)
          e.currentTarget.value = ''
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'grid h-9 w-9 place-items-center rounded-full hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary',
              buttonClassName
            )}
            aria-label="Adjuntar"
          >
            <Plus className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={12}
          className="w-60 rounded-2xl border-whatsapp-border-soft bg-whatsapp-carbon p-2 text-whatsapp-text-primary shadow-xl"
        >
          <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2 focus:bg-whatsapp-panel focus:text-whatsapp-text-primary"
            onSelect={() => {
              requestAnimationFrame(() => docInputRef.current?.click())
            }}
          >
            <FileText className="h-5 w-5 " aria-hidden />
            <span className="text-sm font-medium">Documento</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2 focus:bg-whatsapp-panel focus:text-whatsapp-text-primary"
            onSelect={() => {
              requestAnimationFrame(() => mediaInputRef.current?.click())
            }}
          >
            <ImageIcon className="h-5 w-5 " aria-hidden />
            <span className="text-sm font-medium">Fotos y videos</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2 focus:bg-whatsapp-panel focus:text-whatsapp-text-primary"
            onSelect={() => {
              requestAnimationFrame(() => cameraInputRef.current?.click())
            }}
          >
            <Camera className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium">Cámara</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2 focus:bg-whatsapp-panel focus:text-whatsapp-text-primary"
            onSelect={() => {
              requestAnimationFrame(() => audioInputRef.current?.click())
            }}
          >
            <Mic className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium">Audio</span>
          </DropdownMenuItem>
                      <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2 focus:bg-whatsapp-panel focus:text-whatsapp-text-primary"
            onSelect={() => {
              onSelectPoll?.()
            }}
          >
            <BarChart3 className="h-5 w-5 " aria-hidden />
            <span className="text-sm font-medium">Encuesta</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2 focus:bg-whatsapp-panel focus:text-whatsapp-text-primary"
            onSelect={() => {
              onSelectContact?.()
            }}
          >
            <User className="h-5 w-5 " aria-hidden />
            <span className="text-sm font-medium">Contacto</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
