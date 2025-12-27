'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { type ChatMessage, useRealtimeChat, formatMessagePreview } from '@/hooks/use-realtime-chat'
import { Mic, Pause, Play, Send, Smile, Trash2, ChevronDown, Check, Square, Forward } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { ReplyPreview } from '@/components/whatsapp/reply-preview'
import { AttachmentPreviewOverlay } from '@/components/whatsapp/attachment-preview-overlay'
import { SendContactModal, type SendableContact } from '@/components/whatsapp/send-contact-modal'
import { PollCreateModal } from '@/components/whatsapp/poll-create-modal'
import { AttachmentsMenu } from '@/components/whatsapp/attachments-menu'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { ForwardMessageModal } from '@/components/whatsapp/forward-message-modal'
import { createClient } from '@/lib/supabase/client'
import { GroupIntroCard, type GroupIntroCardProps } from '@/components/whatsapp/group-intro-card'
import { ChatIntroSection } from '@/components/whatsapp/chat-intro-section'
import { MediaViewer, type MediaItem } from '@/components/whatsapp/media-viewer'

const ENCRYPTION_NOTICE_TEXT =
  'Los mensajes y las llamadas están cifrados de extremo a extremo. Solo las personas en este chat pueden leerlos, escucharlos o compartirlos. Haz clic para obtener más información.'

function isEncryptionNoticeMessage(message: ChatMessage) {
  const type = (message.messageType ?? '').trim().toLowerCase()
  if (type !== 'system') return false
  const body = (message.content ?? '').trim()
  return body === ENCRYPTION_NOTICE_TEXT
}

interface RealtimeChatProps {
  conversationId: string;
  userId: string;
  username: string;
  isGroup?: boolean;
  onOpenContactChat?: (contact: { id: string; fullName: string }) => void;
  onOpenContactInfo?: () => void;
  onMessage?: (messages: ChatMessage[]) => void;
  messages?: ChatMessage[];
  unreadMarker?: { unreadCount: number; lastReadAt: string | null } | null;
  scrollToMessageId?: string | null;
  selectionMode?: boolean;
  selectedMessageIds?: string[];
  onToggleMessageSelect?: (messageId: string) => void;
  onExitSelectionMode?: () => void;
  onDeleteSelectedMessages?: (id?: string) => void;
  hiddenMessageIds?: string[];
  onDeleteChat?: () => void;
  chatName?: string;
  chatAvatarUrl?: string | null;
  groupIntroCardProps?: Pick<
    GroupIntroCardProps,
    "title" | "meta" | "descriptionHint" | "photoUrl" | "onAddDescription" | "onOpenInfo"
  >;
  creationNoticeText?: string | null;
}

function formatTypingLabel(names: string[]) {
  if (names.length === 0) return ''
  if (names.length === 1) return `${names[0]} está escribiendo...`
  if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo...`
  return `${names[0]}, ${names[1]} y ${names.length - 2} más están escribiendo...`
}

function formatRecordingTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}`
}



export default function RealtimeChat({
  conversationId,
  userId,
  username,
  isGroup = false,
  onOpenContactChat,
  onOpenContactInfo,
  onMessage,
  messages: providedMessages = [],
  unreadMarker,
  scrollToMessageId = null,
  selectionMode = false,
  selectedMessageIds = [],
  onToggleMessageSelect,
  onExitSelectionMode,
  onDeleteSelectedMessages,
  hiddenMessageIds = [],
  onDeleteChat,
  chatName,
  chatAvatarUrl,
  groupIntroCardProps,
  creationNoticeText,
}: RealtimeChatProps) {
  const { containerRef, scrollToBottom } = useChatScroll()

  // ... (rest of the file until NewChatActions usage)

  const hasInitialScrolledRef = useRef(false)
  const initialStickUntilRef = useRef<number>(0)
  const interruptedInitialStickRef = useRef(false)
  const messageInputRef = useRef<HTMLInputElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRecordingPaused, setIsRecordingPaused] = useState(false)
  const [recordingMs, setRecordingMs] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recorderChunksRef = useRef<BlobPart[]>([])
  const recorderStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingStartedAtRef = useRef<number>(0)
  const recordingAccumulatedMsRef = useRef<number>(0)
  const recordingShouldSendRef = useRef<boolean>(false)
  const recordingCanceledRef = useRef<boolean>(false)

  const {
    messages: hookMessages,
    sendMessage,
    sendAttachment,
    sendContacts,
    sendPoll,
    isLoading,
    isSomeoneTyping,
    typingUsers,
    sendTyping,
    toggleReaction,
  } = useRealtimeChat({
    conversationId,
    userId,
    username,
  })
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [pollModalOpen, setPollModalOpen] = useState(false)
  const [forwardModalOpen, setForwardModalOpen] = useState(false)
  const [isForwarding, setIsForwarding] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const lastTypingSentAtRef = useRef<number>(0)
  const [showUnreadMarker, setShowUnreadMarker] = useState(false)
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)
  const lastScrollRequestRef = useRef<string | null>(null)
  const suppressAutoScrollUntilRef = useRef<number>(0)
  const [showScrollToLatest, setShowScrollToLatest] = useState(false)
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false)
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0)
  const mediaItems = useMemo<MediaItem[]>(() => {
    return hookMessages
      .filter((m) => m.messageType === 'image' || m.messageType === 'video')
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl || '',
        type: m.messageType as 'image' | 'video',
        name: m.mediaName,
        senderName: m.user.id === userId ? 'Tú' : m.user.name,
        timestamp: new Date(m.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        mime: m.mediaMime,
        size: m.mediaSize,
      }))
  }, [hookMessages, userId])

  const handleOpenMedia = useCallback((messageId: string) => {
    const idx = mediaItems.findIndex((m) => m.id === messageId)
    if (idx !== -1) {
      setMediaViewerIndex(idx)
      setMediaViewerOpen(true)
    }
  }, [mediaItems])

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`message-${messageId}`)
    if (el) {
      // Prevent auto-scroll for a moment
      suppressAutoScrollUntilRef.current = Date.now() + 1000
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightMessageId(messageId)
      setTimeout(() => setHighlightMessageId((prev) => (prev === messageId ? null : prev)), 2000)
    }
  }, [])

  const skeletonMessages = [
    { width: 'w-3/5', alignRight: false },
    { width: 'w-2/5', alignRight: true },
    { width: 'w-4/6', alignRight: false },
    { width: 'w-1/2', alignRight: true },
  ]

  useEffect(() => {
    if (!unreadMarker || !unreadMarker.unreadCount) return
    setShowUnreadMarker(true)
    setShowOnlyUnread(true)
    const t = setTimeout(() => setShowUnreadMarker(false), 6000)
    return () => clearTimeout(t)
  }, [unreadMarker])

  useEffect(() => {
    setShowOnlyUnread(false)
    setShowUnreadMarker(false)
  }, [conversationId])

  useEffect(() => {
    let cancelled = false
    let el: HTMLDivElement | null = null

    const attach = () => {
      if (cancelled) return
      el = containerRef.current
      if (!el) {
        requestAnimationFrame(attach)
        return
      }

      const update = () => {
        const distanceFromBottom = el!.scrollHeight - el!.scrollTop - el!.clientHeight
        const isScrollable = el!.scrollHeight - el!.clientHeight > 1
        // Show as soon as the user scrolls up a bit from the bottom.
        // Keep a small-ish threshold so it appears in long chats even if the user only scrolls slightly.
        const threshold = Math.min(240, Math.max(120, Math.floor(el!.clientHeight * 0.25)))
        setShowScrollToLatest(isScrollable && distanceFromBottom > threshold)
      }

      update()
      el.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update)

      const ro = new ResizeObserver(() => update())
      ro.observe(el)

      return () => {
        el?.removeEventListener('scroll', update)
        window.removeEventListener('resize', update)
        ro.disconnect()
      }
    }

    const cleanup = attach()
    return () => {
      cancelled = true
      if (cleanup) cleanup()
    }
  }, [containerRef, conversationId, hookMessages.length, providedMessages.length])

  useEffect(() => {
    if (!scrollToMessageId) return

    // While we are trying to jump to a specific message, prevent auto-scroll-to-bottom
    // from snapping back to the latest message.
    suppressAutoScrollUntilRef.current = Date.now() + 2000

    // Allow re-scrolling even if the user clicks the same result twice.
    const requestKey = `${scrollToMessageId}:${Date.now()}`
    lastScrollRequestRef.current = requestKey

    let attempts = 0
    const maxAttempts = 20
    const intervalMs = 50

    const tryScroll = () => {
      if (lastScrollRequestRef.current !== requestKey) return
      const el = document.getElementById(`message-${scrollToMessageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightMessageId(scrollToMessageId)
        const t = setTimeout(
          () => setHighlightMessageId((prev) => (prev === scrollToMessageId ? null : prev)),
          1800
        )
        return () => clearTimeout(t)
      }

      attempts += 1
      if (attempts >= maxAttempts) return
      setTimeout(tryScroll, intervalMs)
    }

    const cleanup = tryScroll()
    return () => {
      if (cleanup) cleanup()
    }
  }, [scrollToMessageId])

  // Merge realtime messages with initial messages
  const allMessages = useMemo(() => {
    const base = Array.isArray(providedMessages) ? providedMessages : []
    const mergedMessages = [...base, ...hookMessages]
    // Remove duplicates based on message id
    const uniqueMessages = mergedMessages.filter(
      (message, index, self) => index === self.findIndex((m) => m.id === message.id)
    )
    // Sort by creation date
    const sortedMessages = uniqueMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return sortedMessages
  }, [providedMessages, hookMessages])

  const lastEmittedMessagesRef = useRef<ChatMessage[]>([])
  useEffect(() => {
    if (onMessage) {
      // Prevent infinite loop: only emit if content actually changed
      const last = lastEmittedMessagesRef.current
      const isSame = allMessages.length === last.length &&
        (allMessages.length === 0 || allMessages[allMessages.length - 1].id === last[last.length - 1].id)

      if (!isSame) {
        lastEmittedMessagesRef.current = allMessages
        onMessage(allMessages)
      }
    }
  }, [allMessages, onMessage])

  useEffect(() => {
    hasInitialScrolledRef.current = false
    initialStickUntilRef.current = 0
    interruptedInitialStickRef.current = false
  }, [conversationId])

  useLayoutEffect(() => {
    if (hasInitialScrolledRef.current) return
    if (allMessages.length === 0) return
    if (scrollToMessageId) return
    scrollToBottom('auto')
    hasInitialScrolledRef.current = true
    initialStickUntilRef.current = Date.now() + 1500
    interruptedInitialStickRef.current = false
  }, [allMessages.length, scrollToBottom, scrollToMessageId])

  useEffect(() => {
    if (!hasInitialScrolledRef.current) return
    if (scrollToMessageId) return
    const el = containerRef.current
    if (!el) return

    const threshold = 120

    const shouldStick = () =>
      !interruptedInitialStickRef.current && Date.now() < initialStickUntilRef.current

    const stickToBottomIfNeeded = () => {
      if (!shouldStick()) return
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromBottom > threshold) return
      scrollToBottom('auto')
    }

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromBottom > threshold) interruptedInitialStickRef.current = true
    }

    el.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => {
      stickToBottomIfNeeded()
    })
    ro.observe(el)

    const onLoadCapture = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        stickToBottomIfNeeded()
      }
    }
    el.addEventListener('load', onLoadCapture, true)

    const raf = requestAnimationFrame(() => {
      stickToBottomIfNeeded()
    })

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('load', onLoadCapture, true)
      ro.disconnect()
    }
  }, [containerRef, scrollToBottom, scrollToMessageId])

  useEffect(() => {
    // After initial positioning, keep smooth scrolling for incoming messages
    if (!hasInitialScrolledRef.current) return
    if (scrollToMessageId) return
    if (Date.now() < suppressAutoScrollUntilRef.current) return
    const el = containerRef.current
    if (!el) return
    const threshold = 120
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom > threshold) return
    scrollToBottom('smooth')
  }, [allMessages, scrollToBottom, scrollToMessageId, containerRef])

  useEffect(() => {
    console.log('[RealtimeChat] 📢 Typing state:', { isSomeoneTyping, typingUsersCount: typingUsers.length, typingUsers })
  }, [isSomeoneTyping, typingUsers])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      isTypingRef.current = false
      void sendTyping(false)

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop()
        } catch {
          // no-op
        }
      }
      if (recorderStreamRef.current) {
        for (const t of recorderStreamRef.current.getTracks()) t.stop()
        recorderStreamRef.current = null
      }
    }
  }, [sendTyping])



  const stopRecordingInternal = useCallback(
    (mode: 'send' | 'cancel') => {
      recordingShouldSendRef.current = mode === 'send'
      recordingCanceledRef.current = mode === 'cancel'

      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          // ignore
        }
      }

      setIsRecording(false)
      setIsRecordingPaused(false)

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    },
    []
  )

  const toggleRecording = useCallback(async () => {
    // Start
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia not supported')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recorderStreamRef.current = stream
      recorderChunksRef.current = []

      recordingShouldSendRef.current = false
      recordingCanceledRef.current = false
      recordingAccumulatedMsRef.current = 0
      recordingStartedAtRef.current = Date.now()
      setRecordingMs(0)
      setIsRecordingPaused(false)

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = setInterval(() => {
        const base = recordingAccumulatedMsRef.current
        const delta = isRecordingPaused ? 0 : Date.now() - recordingStartedAtRef.current
        setRecordingMs(base + delta)
      }, 250)

      const preferred = 'audio/webm;codecs=opus'
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(preferred)
        ? preferred
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recorderChunksRef.current.push(ev.data)
      }

      recorder.onstop = () => {
        const chunks = recorderChunksRef.current
        recorderChunksRef.current = []

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }

        const blob = new Blob(chunks, { type: mimeType })
        if (blob.size === 0) return

        if (recordingCanceledRef.current || !recordingShouldSendRef.current) {
          // cleanup tracks
          if (recorderStreamRef.current) {
            for (const t of recorderStreamRef.current.getTracks()) t.stop()
            recorderStreamRef.current = null
          }
          return
        }

        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mimeType })
        void sendAttachment(file)

        // cleanup tracks
        if (recorderStreamRef.current) {
          for (const t of recorderStreamRef.current.getTracks()) t.stop()
          recorderStreamRef.current = null
        }
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Audio recording error:', err)
      setIsRecording(false)
      if (recorderStreamRef.current) {
        for (const t of recorderStreamRef.current.getTracks()) t.stop()
        recorderStreamRef.current = null
      }
    }
  }, [isRecordingPaused, sendAttachment])

  const togglePauseRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return

    if (recorder.state === 'recording') {
      try {
        recorder.pause()
      } catch {
        return
      }
      const elapsed = Date.now() - recordingStartedAtRef.current
      recordingAccumulatedMsRef.current += elapsed
      recordingStartedAtRef.current = Date.now()
      setIsRecordingPaused(true)
      setRecordingMs(recordingAccumulatedMsRef.current)
      return
    }

    if (recorder.state === 'paused') {
      try {
        recorder.resume()
      } catch {
        return
      }
      recordingStartedAtRef.current = Date.now()
      setIsRecordingPaused(false)
    }
  }, [])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent, explicitContent?: string) => {

      e.preventDefault()
      const trimmed = (explicitContent !== undefined ? explicitContent : newMessage).trim()

      if (pendingFiles.length > 0) {
        const files = pendingFiles
        void (async () => {
          if (files.length === 1) {
            await sendAttachment(files[0], trimmed)
          } else {
            for (const f of files) {
              await sendAttachment(f) // Attachments generally don't have captions in this loop if pure bulk, but single msg logic applies?
              // Actually typically only 1st gets caption or separate text msg.
              // User wants text + files.
            }
            // For multiple files, we usually send the text as a separate message
            // OR attach it to the LAST file? WhatsApp attaches to the first or last?
            // Existing logic sends text as separate message if multiple files.
            if (trimmed) await sendMessage(trimmed, replyingTo?.id)
          }
        })()

        setPendingFiles([])
        setNewMessage('')
        setReplyingTo(null)
      } else {
        if (!trimmed) return
        await sendMessage(trimmed, replyingTo?.id)
        setNewMessage('')
        setReplyingTo(null)
      }

      setShowUnreadMarker(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (isTypingRef.current) {
        isTypingRef.current = false
        void sendTyping(false)
      }
    },
    [newMessage, pendingFiles, replyingTo?.id, sendAttachment, sendTyping, sendMessage]
  )

  const unreadIndex = useMemo(() => {
    if (!showUnreadMarker || !unreadMarker?.unreadCount) return -1
    if (!unreadMarker.lastReadAt) return Math.max(0, allMessages.length - unreadMarker.unreadCount)
    const ts = Date.parse(unreadMarker.lastReadAt)
    if (!Number.isFinite(ts)) return Math.max(0, allMessages.length - unreadMarker.unreadCount)
    const idx = allMessages.findIndex((m) => Date.parse(m.createdAt) > ts)
    return idx
  }, [allMessages, showUnreadMarker, unreadMarker])

  const visibleMessages = useMemo(() => {
    if (!showOnlyUnread) return allMessages
    if (!unreadMarker?.unreadCount) return allMessages
    const idx = unreadIndex >= 0 ? unreadIndex : Math.max(0, allMessages.length - unreadMarker.unreadCount)
    return allMessages.slice(idx)
  }, [allMessages, showOnlyUnread, unreadIndex, unreadMarker])

  const filteredVisibleMessages = useMemo(() => {
    if (!hiddenMessageIds || hiddenMessageIds.length === 0) return visibleMessages
    const hidden = new Set(hiddenMessageIds)
    return visibleMessages.filter((m) => !hidden.has(m.id))
  }, [hiddenMessageIds, visibleMessages])

  const handleChange = useCallback(
    (v: string) => {
      setNewMessage(v)

      const hasText = Boolean(v.trim())

      if (!hasText) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        if (isTypingRef.current) {
          console.log('[handleChange] 🛑 Stopping typing')
          isTypingRef.current = false
          void sendTyping(false)
        }
        return
      }

      if (!isTypingRef.current) {
        console.log('[handleChange] ▶️ START typing')
        isTypingRef.current = true
        lastTypingSentAtRef.current = Date.now()
        void sendTyping(true)
      } else {
        // Heartbeat: keep remote typing indicator alive while user continues typing.
        // Without this, the receiver may timeout (e.g. 1-2s) and hide the indicator even if user is still typing.
        const now = Date.now()
        if (now - lastTypingSentAtRef.current >= 1000) {
          console.log('[handleChange] 💓 HEARTBEAT typing')
          lastTypingSentAtRef.current = now
          void sendTyping(true)
        }
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        if (!isTypingRef.current) return
        console.log('[handleChange] ⏱️ TIMEOUT - stopping typing')
        isTypingRef.current = false
        lastTypingSentAtRef.current = 0
        void sendTyping(false)
      }, 2000)
    },
    [sendTyping]
  )

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = messageInputRef.current
      const current = newMessage

      const start = el?.selectionStart ?? current.length
      const end = el?.selectionEnd ?? current.length
      const next = current.slice(0, start) + emoji + current.slice(end)

      handleChange(next)

      requestAnimationFrame(() => {
        const input = messageInputRef.current
        if (!input) return
        input.focus()
        const pos = start + emoji.length
        input.setSelectionRange(pos, pos)
      })
    },
    [handleChange, newMessage]
  )

  return (
    <div className="relative flex h-full flex-col">
      <AttachmentPreviewOverlay
        files={pendingFiles}
        onFilesChange={(next) => setPendingFiles(next)}
        onSend={(caption) => {
          const ev = { preventDefault: () => { } } as unknown as React.FormEvent
          handleSendMessage(ev, caption)
        }}
      />

      <SendContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        userId={userId}
        onSend={(contacts: SendableContact[]) => {
          void sendContacts(
            contacts.map((c) => ({
              id: c.id,
              fullName: c.fullName,
              email: c.email ?? null,
              avatarUrl: c.avatarUrl,
            }))
          )
        }}
      />

      <PollCreateModal
        open={pollModalOpen}
        onOpenChange={setPollModalOpen}
        onSend={(payload) => {
          void sendPoll(payload)
        }}
      />

      <ForwardMessageModal
        open={forwardModalOpen}
        onOpenChange={setForwardModalOpen}
        userId={userId}
        messageCount={selectedMessageIds.length}
        currentConversationId={conversationId}
        onForward={async (recipientConversationIds) => {
          if (selectedMessageIds.length === 0) return
          setIsForwarding(true)

          try {
            const supabase = createClient()

            // Get the content of selected messages
            const { data: messagesToForward, error: fetchError } = await supabase
              .from('messages')
              .select('body, message_type, media_url, media_name, media_mime, media_size')
              .in('id', selectedMessageIds)
              .eq('conversation_id', conversationId)

            if (fetchError) {
              console.error('[forward] Error fetching messages:', fetchError)
              setIsForwarding(false)
              return
            }

            if (!messagesToForward || messagesToForward.length === 0) {
              console.error('[forward] No messages found to forward')
              setIsForwarding(false)
              return
            }

            // Forward each message to each recipient conversation
            for (const recipientConvoId of recipientConversationIds) {
              for (const msg of messagesToForward) {
                const { error: insertError } = await supabase
                  .from('messages')
                  .insert({
                    conversation_id: recipientConvoId,
                    sender_id: userId,
                    body: msg.body,
                    message_type: msg.message_type || 'text',
                    media_url: msg.media_url,
                    media_name: msg.media_name,
                    media_mime: msg.media_mime,
                    media_size: msg.media_size,
                    is_forwarded: true,
                  })

                if (insertError) {
                  console.error('[forward] Error inserting message:', insertError)
                }
              }
            }

            // Exit selection mode after forwarding
            onExitSelectionMode?.()

          } catch (err) {
            console.error('[forward] Unexpected error:', err)
          } finally {
            setIsForwarding(false)
          }
        }}
      />

      {
        showScrollToLatest ? (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-24 right-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-whatsapp-text-primary shadow-lg ring-1 ring-border hover:bg-background"
            aria-label="Ir al último mensaje"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        ) : null
      }

      <div
        ref={containerRef}
        className={cn(
          'relative flex-1 overflow-y-auto px-4 py-6',
          {
            'pt-0': pendingFiles.length > 0,
          }
        )}
      >

        {isLoading ? (
          <div className="mx-auto w-full  px-2 py-10 space-y-8">

            <div className="space-y-5">
              {skeletonMessages.map(({ width, alignRight }, idx) => (
                <div
                  key={`${width}-${idx}`}
                  className={cn(
                    'flex items-start gap-3',
                    alignRight ? 'justify-end pl-10' : 'justify-start pr-10'
                  )}
                >
                  {!alignRight ? (
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-black/20 dark:bg-white/10 self-start" />
                  ) : null}
                  <div
                    className={cn(
                      'w-full max-w-[70%] space-y-2 rounded-3xl border px-4 py-3 backdrop-blur-sm',
                      alignRight
                        ? 'border-whatsapp-border-soft/40 bg-whatsapp-panel/70'
                        : 'border-white/10 bg-black/10 dark:bg-white/5'
                    )}
                  >
                    <Skeleton className="h-3 w-16 rounded-full bg-white/30 dark:bg-white/20" />
                    <Skeleton
                      className={cn('h-4 rounded-full mb-10 bg-white/40 dark:bg-white/30', width)}
                    />
                    <Skeleton className="h-3 w-14 rounded-full bg-white/30/70 dark:bg-white/20/50" />
                  </div>
                </div>
              ))}
            </div>
          </div >
        ) : null
        }
        <ChatIntroSection
          isGroup={Boolean(isGroup)}
          encryptionNoticeText={ENCRYPTION_NOTICE_TEXT}
          creationNoticeText={
            creationNoticeText && !isGroup
              ? creationNoticeText
              : undefined
          }
          unreadCount={unreadMarker?.unreadCount ?? 0}
          showOnlyUnread={showOnlyUnread}
          onShowAllUnread={() => setShowOnlyUnread(false)}
          showNewChatActions={!isGroup && !isLoading && chatName !== "Yo (Tú)"}
          newChatActions={
            !isGroup && !isLoading && chatName !== "Yo (Tú)"
              ? {
                phoneNumber: chatName || username,
                avatarUrl: chatAvatarUrl,
                fallbackInitial: (chatName || username || '?')
                  .trim()
                  .charAt(0)
                  .toUpperCase() || '?',
                onDelete: onDeleteChat,
                onOpenContactInfo,
              }
              : null
          }
          className="mb-2"
        />

        {(() => {
          const shouldRenderGroupIntro = Boolean(groupIntroCardProps);
          let groupIntroInserted = false;

          const buildGroupIntroCard = (key: string) => {
            if (!groupIntroCardProps) return null;
            return (
              <div key={key} className="mb-6 mt-4 flex justify-center px-4 sm:px-6">
                <GroupIntroCard
                  title={groupIntroCardProps.title}
                  meta={groupIntroCardProps.meta}
                  descriptionHint={groupIntroCardProps.descriptionHint}
                  photoUrl={groupIntroCardProps.photoUrl}
                  onAddDescription={groupIntroCardProps.onAddDescription}
                  onOpenInfo={groupIntroCardProps.onOpenInfo}
                  className="w-full max-w-md"
                />
              </div>
            );
          };

          const isGroupCreationSystemMessage = (message: ChatMessage) => {
            const type = (message.messageType ?? "").trim().toLowerCase();
            if (type !== "system") return false;
            const body = (message.content ?? "").toLowerCase();
            return body.startsWith("nuevo grupo creado");
          };

          const nodes: ReactNode[] = [];
          filteredVisibleMessages.forEach((message, index) => {
            if (isGroup && isEncryptionNoticeMessage(message)) {
              return;
            }

            const prevMessage = index > 0 ? filteredVisibleMessages[index - 1] : null;
            const showHeader = !prevMessage || prevMessage.user.id !== message.user.id;
            const isSelected = selectedMessageIds.includes(message.id);
            const isSystemMessage = (message.messageType ?? "").trim().toLowerCase() === "system";

            let groupIntroBefore: ReactNode = null;
            if (
              shouldRenderGroupIntro &&
              !groupIntroInserted &&
              isGroupCreationSystemMessage(message)
            ) {
              groupIntroInserted = true;
              groupIntroBefore = buildGroupIntroCard(`group-intro-${message.id}`);
            }

            nodes.push(
              <div
                id={`message-${message.id}`}
                key={message.id}
                className={cn(
                  "animate-in fade-in slide-in-from-bottom-4 duration-300",
                  highlightMessageId === message.id ? "rounded-xl ring-2 ring-whatsapp-forest/70" : "",
                )}
              >
                {groupIntroBefore}
                {selectionMode && !isSystemMessage ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onToggleMessageSelect?.(message.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      onToggleMessageSelect?.(message.id);
                    }}
                    className={cn(
                      "group relative -mx-2 rounded-2xl px-2 text-left transition-colors",
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-forest/60",
                      isSelected
                        ? "bg-whatsapp-panel/80 dark:bg-white/10"
                        : "hover:bg-whatsapp-panel/60 dark:hover:bg-white/5",
                    )}
                    aria-label="Seleccionar mensaje"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2",
                        isSelected
                          ? "border-whatsapp-forest bg-whatsapp-forest text-white"
                          : "border-white/30 bg-black/10 text-transparent",
                      )}
                    >
                      {isSelected ? <Check className="h-4 w-4" /> : <Square className="h-3.5 w-3.5" />}
                    </span>

                    <div className="pl-10">
                      <ChatMessageItem
                        message={message}
                        isOwnMessage={message.user.id === userId}
                        showHeader={showHeader}
                        isGroup={isGroup}
                        onOpenContactChat={onOpenContactChat}
                        currentUserId={userId}
                        onOpenMedia={handleOpenMedia}
                        onScrollToMessage={handleScrollToMessage}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={selectionMode ? "pl-4" : undefined}>
                    <ChatMessageItem
                      message={message}
                      isOwnMessage={message.user.id === userId}
                      showHeader={showHeader}
                      isGroup={isGroup}
                      onOpenContactChat={onOpenContactChat}
                      currentUserId={userId}
                      onReact={toggleReaction}
                      onForward={(msg: ChatMessage) => {
                        if (!selectedMessageIds.includes(msg.id)) {
                          onToggleMessageSelect?.(msg.id);
                        }
                        setForwardModalOpen(true);
                      }}
                      onReply={(msg: ChatMessage) => {
                        setReplyingTo({
                          id: msg.id,
                          senderName: msg.user.name,
                          content: formatMessagePreview(msg.content, msg.messageType || null),
                        });
                        messageInputRef.current?.focus();
                      }}
                      onOpenMedia={handleOpenMedia}
                      onScrollToMessage={handleScrollToMessage}
                      onDelete={(id) => onDeleteSelectedMessages?.(id)}
                    />
                  </div>
                )}
              </div>
            );
          });

          if (shouldRenderGroupIntro && !groupIntroInserted) {
            const fallback = buildGroupIntroCard("group-intro-fallback");
            if (fallback) {
              nodes.unshift(fallback);
            }
          }

          return (
            <div className={cn("space-y-1", isLoading ? "pointer-events-none opacity-0" : "")}>
              {nodes}
            </div>
          );
        })()}

        {
          isSomeoneTyping && typingUsers.length > 0 ? (
            <div className="group mt-4 flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Avatar */}
              {isGroup && (
                <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-whatsapp-carbon text-xs font-semibold text-whatsapp-text-primary">
                  {typingUsers[0].avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={typingUsers[0].avatarUrl}
                      alt={typingUsers[0].name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{typingUsers[0].name.trim().slice(0, 1).toUpperCase() || 'U'}</span>
                  )}
                </div>
              )}

              {/* Bubble with typing dots */}
              <div className="relative flex w-fit max-w-[55%] flex-col">
                {/* Name above bubble (for groups) */}
                {isGroup && (
                  <div className="mb-0.5 ml-3 text-xs font-semibold text-whatsapp-text-green">
                    {typingUsers[0].name}
                  </div>
                )}

                <div
                  className={cn(
                    'relative w-fit px-4 py-3 text-sm leading-snug shadow-sm',
                    'rounded-r-lg rounded-bl-lg bg-white dark:bg-[#202c33]',
                    'rounded-tl-none'
                  )}
                >
                  {/* Tail / Bubble Tip */}
                  <span
                    aria-hidden
                    className="absolute top-0 h-3 w-3 -left-2 bg-white dark:bg-[#202c33] [clip-path:polygon(100%_0,100%_100%,0_0)]"
                  />

                  <div className="flex items-center gap-1" aria-label="Escribiendo">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#8696a0] [animation-delay:-0.3s] [animation-duration:1.4s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#8696a0] [animation-delay:-0.15s] [animation-duration:1.4s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#8696a0] [animation-duration:1.4s]" />
                  </div>
                </div>
              </div>
            </div>
          ) : null
        }
      </div >

      {
        selectionMode ? (
          <div className="border-t border-whatsapp-glass dark:bg-[#161717] bg-white  px-3 py-3" >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onExitSelectionMode?.()}
                  className="grid h-10 w-10 place-items-center rounded-full text-whatsapp-text-muted hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
                  aria-label="Cancelar"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="text-sm font-medium text-whatsapp-text-primary">
                  {selectedMessageIds.length} seleccionados
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Forward button */}
                <button
                  type="button"
                  onClick={() => setForwardModalOpen(true)}
                  disabled={selectedMessageIds.length === 0 || isForwarding}
                  className="grid h-10 w-10 place-items-center rounded-full text-whatsapp-text-muted transition-colors hover:bg-whatsapp-panel hover:text-whatsapp-text-primary disabled:opacity-50"
                  aria-label="Reenviar"
                  title="Reenviar"
                >
                  <Forward className="h-5 w-5" />
                </button>
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onDeleteSelectedMessages?.()}
                  disabled={selectedMessageIds.length === 0}
                  className="grid h-10 w-10 place-items-center rounded-full text-whatsapp-text-muted transition-colors hover:bg-whatsapp-panel hover:text-rose-500 disabled:opacity-50"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ChatInputSection
            isRecording={isRecording}
            isLoading={isLoading}
            replyingTo={replyingTo}
            newMessage={newMessage}
            recordingMs={recordingMs}
            isRecordingPaused={isRecordingPaused}
            emojiOpen={emojiOpen}
            pendingFiles={pendingFiles}
            textareaRef={messageInputRef as any}
            onSetNewMessage={handleChange}
            onSetReplyingTo={setReplyingTo}
            onStopRecordingInternal={stopRecordingInternal}
            onTogglePauseRecording={togglePauseRecording}
            onSend={(e: React.FormEvent) => handleSendMessage(e)}
            onToggleRecording={toggleRecording}
            onInsertEmoji={insertEmoji}
            onSetEmojiOpen={setEmojiOpen}
            onSelectFiles={(files: File[]) => setPendingFiles((prev) => [...prev, ...files])}
            onSetContactModalOpen={setContactModalOpen}
            onSetPollModalOpen={setPollModalOpen}
          />
        )}
      <MediaViewer
        items={mediaItems}
        initialIndex={mediaViewerIndex}
        isOpen={mediaViewerOpen}
        onClose={() => setMediaViewerOpen(false)}
        onReply={(id) => {
          const msg = hookMessages.find((m) => m.id === id)
          if (msg) {
            setReplyingTo({
              id: msg.id,
              senderName: msg.user.name,
              content: formatMessagePreview(msg.content, msg.messageType || null),
            })
            setMediaViewerOpen(false)
            if (messageInputRef.current) messageInputRef.current.focus()
          }
        }}
        onForward={(id) => {
          if (!selectedMessageIds.includes(id)) {
            onToggleMessageSelect?.(id)
          }
          setForwardModalOpen(true)
          setMediaViewerOpen(false)
        }}
        onDelete={(id) => {
          onDeleteSelectedMessages?.(id)
          setMediaViewerOpen(false)
        }}
        onReact={(id, emoji) => {
          void toggleReaction(id, emoji)
        }}
      />
    </div>
  )
}

function ChatInputSection({
  isRecording,
  isLoading,
  replyingTo,
  newMessage,
  recordingMs,
  isRecordingPaused,
  emojiOpen,
  textareaRef,
  onSetNewMessage,
  onSetReplyingTo,
  onStopRecordingInternal,
  onTogglePauseRecording,
  onSend,
  onToggleRecording,
  onInsertEmoji,
  onSetEmojiOpen,
  onSelectFiles,
  onSetContactModalOpen,
  onSetPollModalOpen,
}: any) {

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [newMessage, textareaRef])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onSelectFiles(acceptedFiles)
  }, [onSelectFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      'image/*': [],
      'video/*': [],
      'application/*': [],
      'text/*': []
    }
  })

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (newMessage.trim()) {
        onSend(e as unknown as React.FormEvent)
      }
    }
  }

  if (isRecording) {
    return (
      <div className="flex w-full items-end gap-3 border-t border-whatsapp-glass px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
        <div className="flex-1 min-w-0 flex flex-col">
          <ReplyPreview replyTo={replyingTo} onCancel={() => onSetReplyingTo(null)} />
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={() => onStopRecordingInternal('cancel')}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-whatsapp-text-muted transition-colors hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
              aria-label="Cancelar audio"
            >
              <Trash2 className="h-5 w-5" />
            </button>

            <div className="flex flex-1 items-center justify-between gap-3 rounded-full bg-whatsapp-carbon px-4 py-2 text-whatsapp-text-primary">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                <span className="shrink-0 text-sm tabular-nums">{formatRecordingTime(recordingMs)}</span>
              </div>

              <div className="flex flex-1 items-center justify-center px-2">
                <div className="h-2 w-full max-w-[360px] rounded-full bg-black/10" />
              </div>

              <button
                type="button"
                onClick={onTogglePauseRecording}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-whatsapp-text-muted transition-colors hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
                aria-label={isRecordingPaused ? 'Reanudar' : 'Pausar'}
              >
                {isRecordingPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onStopRecordingInternal('send')}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-whatsapp-forest text-white transition-colors hover:bg-whatsapp-deep-forest"
              aria-label="Enviar audio"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSend}
      className={cn(
        "flex w-full items-end gap-3 border-t border-whatsapp-glass px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3",
        isDragActive ? "bg-whatsapp-panel/30" : ""
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <ReplyPreview replyTo={replyingTo} onCancel={() => onSetReplyingTo(null)} />

        <div
          {...getRootProps()}
          className={cn(
            "flex items-end gap-2 border border-whatsapp-border-soft bg-white  dark:bg-[#242626]  px-2 py-1.5 transition-colors",
            replyingTo ? "rounded-b-3xl border-t-0" : "rounded-[24px]", // Rounded styling
            isDragActive ? "ring-2 ring-whatsapp-forest border-transparent" : ""
          )}
        >
          {/* Note: Dropzone input must be present but hidden */}
          <input {...getInputProps()} className="hidden" />

          {/* Attachments */}
          <div className="mb-1">
            <AttachmentsMenu
              onSelectFiles={(_kind, files) => {
                onSelectFiles(Array.from(files))
              }}
              onSelectContact={() => onSetContactModalOpen(true)}
              onSelectPoll={() => onSetPollModalOpen(true)}
            />
          </div>

          <div className="mb-1">
            <EmojiPicker
              open={emojiOpen}
              onOpenChange={onSetEmojiOpen}
              onSelect={(emoji) => onInsertEmoji(emoji)}
              className="border-whatsapp-glass bg-whatsapp-carbon text-whatsapp-text-primary"
            >
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-whatsapp-panel hover:text-whatsapp-text-primary text-whatsapp-text-muted"
                aria-label="Emoji"
              >
                <Smile className="h-6 w-6" />
              </button>
            </EmojiPicker>
          </div>

          <textarea
            ref={textareaRef}
            className="max-h-[120px] min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-whatsapp-text-primary outline-none placeholder:text-whatsapp-text-muted scrollbar-hide"
            value={newMessage}
            disabled={isLoading}
            onChange={(e) => onSetNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje"
            rows={1}
            style={{ height: 'auto' }}
          />

          {/* Send / Mic Wrapper inside the pill, at bottom right */}
          <div className="mb-1 mr-1">
            {newMessage.trim() ? (
              <button
                type="submit"
                disabled={isLoading}
                className="grid h-9 w-9 place-items-center rounded-full bg-whatsapp-forest text-white transition-all hover:bg-whatsapp-deep-forest animate-in zoom-in-50 duration-200"
                aria-label="Enviar"
              >
                <Send className="h-5 w-5 pl-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onToggleRecording()}
                className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Nota de voz"
              >
                <Mic className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

export { RealtimeChat }
