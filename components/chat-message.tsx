import { Check, CheckCheck, Download, FileText, Play, Smile, Reply, Forward, ChevronDown, Video, Camera, Star, Trash2, Link, MapPin, MessageCircle, Phone, SquarePen, User2, Image } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { type FC, useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'
import { AudioMessagePlayer } from '@/components/audio-message-player'
import { ContactMessageCard } from '@/components/contact-message-card'
import { PollMessageCard, type PollPayload } from '@/components/poll-message-card'
import { LinkifiedText } from '@/components/linkified-text'
import { MessageReactionPicker } from '@/components/whatsapp/message-reaction-picker'
import { MessageReactions } from '@/components/whatsapp/message-reactions'

const VIDEO_EXT_REGEX = /\.(mp4|mov|webm|mkv|avi)(\?.*)?$/i
const IMAGE_EXT_REGEX = /\.(jpe?g|png|gif|webp|avif|bmp)(\?.*)?$/i

function parsePollPayload(content: string | null | undefined): PollPayload | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed !== 'object' || parsed === null) return null
    const question =
      typeof parsed.question === 'string' && parsed.question.trim().length > 0 ? parsed.question.trim() : null
    const options =
      Array.isArray(parsed.options) && parsed.options.every((opt: unknown) => typeof opt === 'string')
        ? (parsed.options as string[])
        : null
    const allowMultiple =
      parsed.allowMultiple === undefined || typeof parsed.allowMultiple === 'boolean' ? Boolean(parsed.allowMultiple) : null

    if (!question || !options || options.length < 2 || allowMultiple === null) return null

    return { question, options, allowMultiple }
  } catch {
    return null
  }
}

function PollResponsePreview({ payload, isOwnMessage }: { payload: PollPayload; isOwnMessage: boolean }) {
  return (
    <div className="pb-3">
      <div
        className={cn(
          'rounded-xl border px-3 py-2 text-left text-sm',
          isOwnMessage ? 'border-white/30 bg-white/10 text-white' : 'border-black/10 bg-black/5 text-whatsapp-text-primary'
        )}
      >
        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Encuesta respondida</div>
        <div className="mt-1 text-sm font-semibold">{payload.question}</div>
        <div className="mt-1 text-xs opacity-80">
          {payload.allowMultiple ? 'Registraste tu voto en esta encuesta.' : 'Elegiste una opción en esta encuesta.'}
        </div>
      </div>
    </div>
  )
}

const detectStatusMediaType = (typeValue: string | null | undefined, url: string | null | undefined) => {
  const normalized = (typeValue ?? '').toLowerCase()
  if (normalized === 'video' || normalized === 'image') return normalized
  if (!url) return null
  if (VIDEO_EXT_REGEX.test(url)) return 'video'
  if (IMAGE_EXT_REGEX.test(url)) return 'image'
  return null
}

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  isGroup?: boolean
  onOpenContactChat?: (contact: { id: string; fullName: string }) => void
  currentUserId: string
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: ChatMessage) => void
  onForward?: (message: ChatMessage) => void
  onOpenMedia?: (messageId: string) => void
  onScrollToMessage?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onStar?: (messageId: string) => void
}

export const ChatMessageItem: FC<ChatMessageItemProps> = ({
  message,
  isOwnMessage,
  showHeader: _showHeader,
  isGroup = false,
  onOpenContactChat,
  currentUserId,
  onReact,
  onReply,
  onForward,
  onOpenMedia,
  onScrollToMessage,
  onDelete,
}) => {
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false)

  void _showHeader
  const isStatusReply = (message.messageType ?? '').trim().toLowerCase() === 'status_reply'
  let statusData: any = null
  if (isStatusReply) {
    try {
      statusData = JSON.parse(message.content)
    } catch (e) {
      console.warn("Error parsing status_reply content", e)
    }
  }
  const statusContext = statusData?.statusContext ?? null
  const statusContextMediaUrl = statusContext?.mediaUrl ?? statusContext?.media_url ?? null
  const statusContextType = detectStatusMediaType(statusContext?.type, statusContextMediaUrl)
  const isStatusContextVideo = statusContextType === 'video'
  const isStatusContextImage = statusContextType === 'image'
  const [statusPreviewError, setStatusPreviewError] = useState(false)

  useEffect(() => {
    setStatusPreviewError(false)
  }, [statusContextMediaUrl])

  const isSystem = (message.messageType ?? '').trim().toLowerCase() === 'system'
  const isPrivateSystem = isSystem && (message.content || '').startsWith('Vaciaste el chat')

  // If private system message, only show to the sender
  if (isPrivateSystem && !isOwnMessage) {
    return null
  }
  const timeLabel = new Date(message.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const initial = (message.user?.name ?? 'U').trim().slice(0, 1).toUpperCase() || 'U'

  const hasAttachment = Boolean(message.mediaUrl)
  const attachmentKind = (message.messageType ?? 'text').toLowerCase()
  const isImage = hasAttachment && attachmentKind === 'image'
  const isVideo = hasAttachment && attachmentKind === 'video'
  const isAudio = hasAttachment && attachmentKind === 'audio'
  const isDocument = hasAttachment && attachmentKind === 'document'
  const isContact = attachmentKind === 'contact'
  const parsedPollPayload = useMemo(() => parsePollPayload(message.content), [message.content])
  const isOriginalPollMessage = attachmentKind === 'poll'
  const isPollResponseMessage = !isOriginalPollMessage && Boolean(parsedPollPayload)

  if (isSystem) {
    return (
      <div className="mt-6 flex justify-center text-center ">
        <div className=" bg-whatsapp-charcoal text-whatsapp-text-primary rounded-2xl border border-whatsapp-border-soft  px-5 py-3 text-xs font-semibold ">
          {message.content}
        </div>
      </div>
    )
  }

  const sizeLabel = (() => {
    const size = message.mediaSize ?? null
    if (!size || size <= 0) return null
    const kb = Math.round(size / 102.4) / 10
    if (kb < 1024) return `${kb} kB`
    const mb = Math.round((kb / 1024) * 10) / 10
    return `${mb} MB`
  })()

  const docColorClass = (() => {
    const name = (message.mediaName ?? '').trim().toLowerCase()
    const mime = (message.mediaMime ?? '').trim().toLowerCase()

    const isPdf = mime === 'application/pdf' || name.endsWith('.pdf')
    const isWord =
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.doc') ||
      name.endsWith('.docx')

    if (isWord) return 'bg-blue-600/90'
    if (isPdf) return 'bg-red-600/90'
    return 'bg-rose-600/90'
  })()

  return (
    <div
      className={cn(
        'group mt-4 flex gap-2',
        isGroup && !isOwnMessage ? 'items-start' : 'items-end',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      {isGroup && !isOwnMessage ? (
        <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-whatsapp-carbon text-xs font-semibold text-whatsapp-text-primary">
          {message.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.user.avatarUrl} alt={message.user.name} className="h-full w-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
      ) : null}

      <div
        className={cn('relative flex w-fit max-w-[85%] md:max-w-[65%] flex-col ', {
          'items-end': isOwnMessage,
        })}
      >
        {(isReactionPickerOpen) && (
          <button
            onClick={() => setIsReactionPickerOpen(!isReactionPickerOpen)}
            className={cn(
              "absolute top-0 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-whatsapp-charcoal text-whatsapp-text-primary shadow-sm transition-opacity opacity-100",
              isOwnMessage ? "-left-8" : "-right-8"
            )}
          >
            <Smile className="h-4 w-4" />
          </button>
        )}
        {(!isReactionPickerOpen) && (
          <div className={cn(
            "absolute top-0 z-10 flex gap-1 transition-opacity opacity-0 group-hover:opacity-100",
            isOwnMessage ? "-left-10" : "-right-10"
          )}>
            <button
              onClick={() => setIsReactionPickerOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-whatsapp-charcoal text-whatsapp-text-primary shadow-sm hover:bg-black/40"
              title="Reaccionar"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
        )}

        {isReactionPickerOpen && (
          <MessageReactionPicker
            onReact={(emoji) => {
              onReact?.(message.id, emoji)
              setIsReactionPickerOpen(false)
            }}
            onClose={() => setIsReactionPickerOpen(false)}
            align={isOwnMessage ? "right" : "left"}
            side="top"
          />
        )}

        <div
          className={cn(
            'relative w-fit px-3 py-2 text-sm leading-snug shadow-sm',
            isOwnMessage
              ? 'rounded-l-lg rounded-br-lg bg-whatsapp-forest text-white'
              : 'rounded-r-lg rounded-bl-lg bg-whatsapp-charcoal text-whatsapp-text-primary',
            // Specific rounding for when it's the first message in a sequence (has tail)
            isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'
          )}
        >
          {/* Tail / Bubble Tip */}
          <span
            aria-hidden
            className={cn(
              'absolute top-0 h-3 w-3',
              isOwnMessage
                ? '-right-2 bg-whatsapp-forest [clip-path:polygon(0_0,0_100%,100%_0)]'
                : '-left-2 bg-whatsapp-charcoal [clip-path:polygon(100%_0,100%_100%,0_0)]'
            )}
          />

          <div className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full shadow-sm hover:bg-black/20",
                    isOwnMessage ? "text-white" : "text-whatsapp-text-primary"
                  )}
                  title="Más opciones"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onReply?.(message)}>
                  <Reply className="mr-2 h-4 w-4" />
                  <span>Responder</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onForward?.(message)}>
                  <Forward className="mr-2 h-4 w-4" />
                  <span>Reenviar</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete?.(message.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isGroup && !isOwnMessage ? (
            <div className="mb-0.5 pr-12 text-xs font-semibold text-whatsapp-text-green">{message.user.name}</div>
          ) : null}

          {isStatusReply && statusContext && (
            <div className="mb-2 rounded-lg bg-black/10 dark:bg-black/20 p-2 border-l-4 border-l-[#00a884] overflow-hidden min-w-[200px]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#00a884] text-[11px] mb-0.5 truncate">
                    {statusContext.name} · Estados
                  </div>
                  <div className="flex items-center gap-1.5 text-xs opacity-70 truncate">
                    {isStatusContextVideo ? (
                      <Video className="h-3 w-3 shrink-0" />
                    ) : isStatusContextImage ? (
                      <Camera className="h-3 w-3 shrink-0" />
                    ) : (
                      <FileText className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">{statusContext.caption}</span>
                  </div>
                </div>
                {(statusContextMediaUrl && !statusPreviewError) ? (
                  <div
                    className={cn(
                      "shrink-0 overflow-hidden rounded bg-black/10 relative",
                      isStatusContextVideo ? "h-12 w-12" : "h-10 w-10"
                    )}
                  >
                    {isStatusContextVideo ? (
                      <>
                        <video
                          src={statusContextMediaUrl}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                          onError={() => setStatusPreviewError(true)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      </>
                    ) : (
                      <img
                        src={statusContextMediaUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setStatusPreviewError(true)}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "shrink-0 overflow-hidden rounded bg-gradient-to-br from-black/20 via-black/10 to-black/30 text-white/80 flex items-center justify-center",
                      isStatusContextVideo ? "h-12 w-12" : "h-10 w-10"
                    )}
                  >
                    {isStatusContextVideo ? (
                      <Video className="h-4 w-4" />
                    ) : isStatusContextImage ? (
                      <Image className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {message.replyTo && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => message.replyTo && onScrollToMessage?.(message.replyTo.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  message.replyTo && onScrollToMessage?.(message.replyTo.id)
                }
              }}
              className="mb-1 cursor-pointer rounded-lg bg-black/10 transition-colors hover:bg-black/20 dark:bg-black/20 dark:hover:bg-black/30 p-1 border-l-4 border-l-[#00a884] text-xs"
            >
              <div className="font-bold text-[#00a884] mb-0.5">{message.replyTo.senderName}</div>
              <div className="truncate opacity-70 max-w-[200px]">{message.replyTo.content || 'Mensaje'}</div>
            </div>
          )}

          {message.isForwarded ? (
            <div className="mb-1 flex items-center gap-1.5 text-xs italic text-whatsapp-text-muted">
              <Forward className="h-4 w-4" />
              <span>Reenviado</span>
            </div>
          ) : null}

          {isOriginalPollMessage ? (
            <div className="pb-3">
              <PollMessageCard message={message} isOwnMessage={isOwnMessage} currentUserId={currentUserId} />
            </div>
          ) : isPollResponseMessage && parsedPollPayload ? (
            <PollResponsePreview payload={parsedPollPayload} isOwnMessage={isOwnMessage} />
          ) : isContact ? (
            <div className="pb-3">
              <ContactMessageCard
                message={message}
                isOwnMessage={isOwnMessage}
                onOpenContactChat={onOpenContactChat}
              />
            </div>
          ) : hasAttachment ? (
            <div className=" pb-3">
              {isImage && message.mediaUrl && (
                <div
                  className="relative mb-2 cursor-pointer group"
                  onClick={() => onOpenMedia?.(message.id)}
                >
                  <img
                    src={message.mediaUrl}
                    alt={message.mediaName ?? 'Imagen'}
                    className="max-h-64 w-64 rounded-lg object-cover transition-transform group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg" />
                </div>
              )}

              {isVideo && message.mediaUrl && (
                <div
                  className="relative mb-2 w-full sm:w-80 max-w-full overflow-hidden rounded-xl bg-slate-900/10 dark:bg-black/20 aspect-video group cursor-pointer border border-black/5 dark:border-white/10 shadow-sm"
                  onClick={() => onOpenMedia?.(message.id)}
                >
                  <video
                    src={message.mediaUrl}
                    className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100 placeholder-hide"
                    preload="metadata"
                  />
                  <div
                    className="absolute inset-0 flex flex-col justify-between p-3 bg-black/10 transition-colors group-hover:bg-black/25"
                  >
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md tracking-wider">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
                        VIDEO
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-xl ring-1 ring-white/40 transition-all group-hover:scale-110 group-hover:bg-white/40 shadow-2xl">
                        <Play className="ml-1 h-7 w-7 fill-current" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-white text-xs font-semibold drop-shadow-lg">
                      <span className="truncate max-w-[190px]">{message.mediaName ?? 'Video'}</span>
                      <div className="flex items-center gap-2 bg-black/40 rounded-lg px-2 py-1 backdrop-blur-md border border-white/10">
                        <Download className="h-3 w-3" />
                        <span className="text-[10px]">{sizeLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isAudio ? (
                message.mediaUrl ? (
                  <AudioMessagePlayer
                    url={message.mediaUrl}
                    isOwnMessage={isOwnMessage}
                    avatarUrl={message.user.avatarUrl ?? null}
                    avatarFallback={initial}
                  />
                ) : null
              ) : null}

              {isDocument ? (
                <a
                  href={message.mediaUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 flex w-full sm:w-80 max-w-full items-center justify-between gap-3 rounded-lg bg-black/10 p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md text-white', docColorClass)}>
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{message.mediaName ?? 'Documento'}</div>
                      <div className="truncate text-xs opacity-80">
                        {message.mediaMime ?? 'Documento'}
                        {sizeLabel ? ` · ${sizeLabel}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-black/10">
                    <Download className="h-5 w-5 opacity-80" />
                  </span>
                </a>
              ) : null}

              {message.content ? (
                <LinkifiedText
                  text={message.content}
                  className="block whitespace-pre-wrap break-words"
                  tone={isOwnMessage ? 'outgoing' : 'incoming'}
                />
              ) : null}
            </div>
          ) : !isPollResponseMessage ? (
            <LinkifiedText
              text={isStatusReply ? statusData?.replyText : (message.content ?? '')}
              className="block whitespace-pre-wrap break-words pr-12 pb-3"
              tone={isOwnMessage ? 'outgoing' : 'incoming'}
            />
          ) : null}

          <div
            className={cn(
              'absolute bottom-1 right-2 flex items-center gap-1 text-[10px]',
              isOwnMessage ? 'text-white/80' : 'text-whatsapp-text-muted'
            )}
          >
            <span>{timeLabel}</span>
            {isOwnMessage ? (
              <span className="ml-0.5 inline-flex">
                <CheckCheck className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="ml-0.5 inline-flex opacity-0">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>

        <MessageReactions
          reactions={message.reactions}
          currentUserId={currentUserId}
          onToggleReaction={(emoji) => onReact?.(message.id, emoji)}
        />
      </div>
    </div>
  )
}
