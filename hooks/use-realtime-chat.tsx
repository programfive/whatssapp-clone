'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UseRealtimeChatProps {
  conversationId: string
  userId: string
  username: string
}

export interface ChatMessage {
  id: string
  content: string
  messageType?: string | null
  mediaUrl?: string | null
  mediaName?: string | null
  mediaMime?: string | null
  mediaSize?: number | null
  user: {
    id: string
    name: string
    avatarUrl?: string | null
  }
  createdAt: string
  reactions: MessageReaction[]
  replyTo?: {
    id: string
    content: string
    senderName: string
  } | null
  isForwarded?: boolean
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
}

type ContactPayload = {
  contacts: Array<{ id: string; fullName: string; email: string | null; avatarUrl: string | null }>
}

export type PollPayload = {
  question: string
  options: string[]
  allowMultiple: boolean
}

type MessageRow = {
  id: string
  body: string | null
  sender_id: string
  created_at: string
  message_type?: string | null
  media_url?: string | null
  media_name?: string | null
  media_mime?: string | null
  media_size?: number | null
  reactions?: MessageReactionRow[]
  reply_to_message_id?: string | null
  reply_to_data?: {
    id: string
    content: string
    senderName: string
    messageType: string | null
  } | null
  parent_message?: {
    id: string
    body: string | null
    sender_id: string
    message_type?: string | null
  } | null
  is_forwarded?: boolean
}

type MessageReactionRow = {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

type TypingUser = {
  id: string
  name: string
  avatarUrl?: string | null
}

// ... types

export interface UseRealtimeChatReturn {
  messages: ChatMessage[]
  sendMessage: (content: string, replyToId?: string) => Promise<void>
  sendAttachment: (file: File, caption?: string) => Promise<void>
  sendContacts: (contacts: Array<{ id: string; fullName: string; email: string | null; avatarUrl: string | null }>) => Promise<void>
  sendPoll: (payload: PollPayload) => Promise<void>
  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  isSomeoneTyping: boolean
  typingUsers: TypingUser[]
  sendTyping: (isTyping: boolean) => Promise<void>
  isLoading: boolean
  isConnected: boolean
}

function tryParseLegacyPoll(content: string | null | undefined): string | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object') return null
    const question = typeof parsed.question === 'string' ? parsed.question.trim() : ''
    const options = Array.isArray(parsed.options) ? parsed.options : []
    if (!question) return null
    const optionsText = options.length > 0 ? ` (${options.join(', ')})` : ''
    return `📊 Encuesta: ${question}${optionsText}`
  } catch {
    return null
  }
}

export function formatMessagePreview(content: string, type: string | null): string {
  const pollSummary = tryParseLegacyPoll(content)
  if (pollSummary) return pollSummary

  const t = (type || '').toLowerCase()
  const hasContent = (content || '').trim().length > 0

  if (t === 'image') return hasContent ? `📷 Foto: ${content}` : '📷 Foto'
  if (t === 'video') return hasContent ? `🎥 Video: ${content}` : '🎥 Video'
  if (t === 'audio') return '🎤 Audio'
  if (t === 'document') return hasContent ? `📄 Documento: ${content}` : '📄 Documento'
  if (t === 'contact') return '👤 Contacto'
  if (t === 'poll') return '📊 Encuesta'

  if (t === 'status_reply') {
    try {
      const statusData = JSON.parse(content)
      return `✨ Estado: ${statusData.replyText || 'Respuesta a estado'}`
    } catch (e) {
      return '✨ Respuesta a estado'
    }
  }

  return content || 'Mensaje'
}

export function useRealtimeChat({ conversationId, userId, username }: UseRealtimeChatProps): UseRealtimeChatReturn {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPresenceConnected, setIsPresenceConnected] = useState(false) // Track presence channel connection separately
  const [isLoading, setIsLoading] = useState(false)
  const pendingTypingRef = useRef<boolean | null>(null)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const lastSeenCreatedAtRef = useRef<string | null>(null)

  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const userNamesRef = useRef<Record<string, string>>({})

  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({})
  const userAvatarsRef = useRef<Record<string, string | null>>({})

  const lastClearedAtRef = useRef<string | null>(null)

  const myName = useMemo(() => username || 'Yo', [username])

  useEffect(() => {
    if (!userId) return
    setUserNames((prev) => (prev[userId] ? prev : { ...prev, [userId]: myName }))
  }, [myName, userId])

  useEffect(() => {
    userNamesRef.current = userNames
  }, [userNames])

  useEffect(() => {
    userAvatarsRef.current = userAvatars
  }, [userAvatars])

  useEffect(() => {
    const map = userAvatars
    if (!map || Object.keys(map).length === 0) return
    setMessages((current) =>
      current.map((m) => {
        const nextUrl = map[m.user.id]
        if (nextUrl === undefined) return m
        if ((m.user.avatarUrl ?? null) === nextUrl) return m
        return { ...m, user: { ...m.user, avatarUrl: nextUrl } }
      })
    )
  }, [userAvatars])

  useEffect(() => {
    let active = true

    async function loadMyAvatar() {
      if (!userId) return
      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('id', userId)
        .maybeSingle()
      if (!active) return
      if (error) return
      const url = (data?.avatar_url ?? null) as string | null
      setUserAvatars((prev) => (prev[userId] === url ? prev : { ...prev, [userId]: url }))
      userAvatarsRef.current[userId] = url
    }

    void loadMyAvatar()
    return () => {
      active = false
    }
  }, [supabase, userId])

  useEffect(() => {
    if (messages.length === 0) return
    setUserNames((prev) => {
      let next: Record<string, string> | null = null
      for (const m of messages) {
        const id = m.user?.id
        const name = (m.user?.name ?? '').trim()
        if (!id || !name) continue
        if (name === 'Usuario') continue
        if (prev[id]) continue
        if (!next) next = { ...prev }
        next[id] = name
      }
      return next ?? prev
    })
  }, [messages])

  const ensureUserNames = useCallback(
    async (ids: string[]) => {
      const unique = Array.from(new Set(ids.filter(Boolean)))
      const current = userNamesRef.current
      const currentAvatars = userAvatarsRef.current
      const missing = unique.filter((id) => !current[id] || currentAvatars[id] === undefined)
      if (missing.length === 0) return {}

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', missing)

      if (error) return {}

      const fetched: Record<string, string> = {}
      const fetchedAvatars: Record<string, string | null> = {}
      for (const row of data ?? []) {
        const name = (row.full_name ?? '').trim()
        const email = (row.email ?? '').trim()
        fetched[row.id] = name || email || 'Usuario'
        fetchedAvatars[row.id] = (row.avatar_url ?? null) as string | null
      }

      if (Object.keys(fetched).length > 0) {
        // Update ref immediately so typing indicators can use the resolved names without waiting for state effects
        for (const [id, name] of Object.entries(fetched)) {
          userNamesRef.current[id] = name
        }

        setUserNames((prev) => {
          const next = { ...prev }
          for (const [id, name] of Object.entries(fetched)) next[id] = name
          return next
        })
      }

      if (Object.keys(fetchedAvatars).length > 0) {
        for (const [id, url] of Object.entries(fetchedAvatars)) {
          userAvatarsRef.current[id] = url
        }
        setUserAvatars((prev) => {
          const next = { ...prev }
          for (const [id, url] of Object.entries(fetchedAvatars)) next[id] = url
          return next
        })
      }

      return fetched
    },
    [supabase]
  )

  const recomputeTypingUsers = useCallback(() => {
    const ch = typingChannelRef.current
    if (!ch) {
      setTypingUsers([])
      setIsSomeoneTyping(false)
      return
    }

    const state = ch.presenceState() as Record<
      string,
      Array<{ user_id?: string; name?: string; typing?: boolean; typing_at?: number }>
    >

    const now = Date.now()
    const uniqueByUser = new Map<string, TypingUser>()

    for (const entries of Object.values(state)) {
      for (const p of entries ?? []) {
        const id = p.user_id
        if (!id || id === userId) continue
        if (!p.typing) {
          continue
        }
        const ts = typeof p.typing_at === 'number' ? p.typing_at : 0
        const age = now - ts
        if (ts && now - ts > 4500) {
          continue
        }

        const name = (p.name ?? userNamesRef.current[id] ?? 'Usuario').trim() || 'Usuario'
        const avatarUrl = userAvatarsRef.current[id] ?? null
        if (!uniqueByUser.has(id)) uniqueByUser.set(id, { id, name, avatarUrl })
      }
    }

    const next = Array.from(uniqueByUser.values())
    setTypingUsers(next)
    setIsSomeoneTyping(next.length > 0)
  }, [userId])



  // Poll typing status every 500ms to clean up expired typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      recomputeTypingUsers()
    }, 500)

    return () => clearInterval(interval)
  }, [recomputeTypingUsers])

  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (!last?.createdAt) return
    if (!lastSeenCreatedAtRef.current || last.createdAt > lastSeenCreatedAtRef.current) {
      lastSeenCreatedAtRef.current = last.createdAt
    }
  }, [messages])

  useEffect(() => {
    let active = true

    async function loadInitialMessages() {
      setIsLoading(true)
      const { data: convo } = await supabase
        .from('conversations')
        .select('cleared_at')
        .eq('id', conversationId)
        .maybeSingle()

      const clearedAt = (convo?.cleared_at ?? null) as string | null
      lastClearedAtRef.current = clearedAt

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, body, sender_id, created_at, message_type, media_url, media_name, media_mime, media_size, reply_to_message_id, reply_to_data, is_forwarded,
          reactions:message_reactions(id, message_id, user_id, emoji, created_at),
          parent_message:messages!reply_to_message_id(id, body, sender_id, message_type)
        `)
        .eq('conversation_id', conversationId)
        .gte('created_at', clearedAt ?? '1970-01-01T00:00:00.000Z')
        .order('created_at', { ascending: true })

      if (!active) return
      if (error) {
        setIsLoading(false)
        return
      }

      const senderIds = new Set<string>()
      for (const r of data ?? []) {
        if (r.sender_id) senderIds.add(r.sender_id)
        if (r.parent_message?.sender_id) senderIds.add(r.parent_message.sender_id)
      }
      const fetched = await ensureUserNames(Array.from(senderIds))
      const currentNames = userNamesRef.current
      const currentAvatars = userAvatarsRef.current

      const next: ChatMessage[] = ((data ?? []) as unknown as MessageRow[]).map((row) => ({
        id: row.id,
        content: row.body ?? '',
        messageType: row.message_type ?? null,
        mediaUrl: row.media_url ?? null,
        mediaName: row.media_name ?? null,
        mediaMime: row.media_mime ?? null,
        mediaSize: row.media_size ?? null,
        user: {
          id: row.sender_id,
          name:
            row.sender_id === userId
              ? myName
              : (currentNames[row.sender_id] ?? fetched[row.sender_id] ?? 'Usuario'),
          avatarUrl: currentAvatars[row.sender_id] ?? null,
        },
        createdAt: row.created_at,
        reactions: (row.reactions ?? []).map((r) => ({
          id: r.id,
          messageId: r.message_id,
          userId: r.user_id,
          emoji: r.emoji,
          createdAt: r.created_at,
        })),
        replyTo: row.reply_to_data ? {
          id: row.reply_to_data.id,
          content: formatMessagePreview(row.reply_to_data.content, row.reply_to_data.messageType),
          senderName: row.reply_to_data.senderName
        } : (row.reply_to_message_id && row.parent_message ? {
          id: row.parent_message.id,
          content: formatMessagePreview(row.parent_message.body ?? '', row.parent_message.message_type ?? null),
          senderName: currentNames[row.parent_message.sender_id] ?? fetched[row.parent_message.sender_id] ?? 'Usuario'
        } : null),
        isForwarded: row.is_forwarded,
      }))

      setMessages(next)

      const lastCreatedAt = next.length > 0 ? next[next.length - 1]?.createdAt : null
      lastSeenCreatedAtRef.current = lastCreatedAt ?? null

      setIsLoading(false)
    }

    void loadInitialMessages()

    const newChannel = supabase.channel(`messages:${conversationId}`, {
      config: {
        broadcast: { self: true },
      },
    })

    const conversationChannel = supabase.channel(`conversation:${conversationId}`)

    const presenceChannel = supabase.channel(`typing:${conversationId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    const reactionChannel = supabase.channel(`reactions:${conversationId}`, {
      config: {
        broadcast: { self: true },
      },
    })

    newChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: {
          new: {
            id: string
            body: string | null
            sender_id: string
            created_at: string
            message_type?: string | null
            media_url?: string | null
            media_name?: string | null
            media_mime?: string | null
            media_size?: number | null
            is_forwarded?: boolean
            reply_to_message_id?: string | null
            reply_to_data?: any
          }
        }) => {
          const row = payload.new as {
            id: string
            body: string | null
            sender_id: string
            created_at: string
            message_type?: string | null
            media_url?: string | null
            media_name?: string | null
            media_mime?: string | null
            media_size?: number | null
            is_forwarded?: boolean
            reply_to_message_id?: string | null
            reply_to_data?: any
          }

          const currentNames = userNamesRef.current
          const currentAvatars = userAvatarsRef.current

          const message: ChatMessage = {
            id: row.id,
            content: row.body ?? '',
            messageType: row.message_type ?? null,
            mediaUrl: row.media_url ?? null,
            mediaName: row.media_name ?? null,
            mediaMime: row.media_mime ?? null,
            mediaSize: row.media_size ?? null,
            user: {
              id: row.sender_id,
              name:
                row.sender_id === userId
                  ? myName
                  : currentNames[row.sender_id] ?? 'Usuario',
              avatarUrl: currentAvatars[row.sender_id] ?? null,
            },
            createdAt: row.created_at,
            reactions: [],
            isForwarded: row.is_forwarded,
          }

          setMessages((current) => {
            if (current.some((m) => m.id === row.id)) return current

            let replyToObj = null
            if (row.reply_to_data) {
              replyToObj = {
                id: row.reply_to_data.id,
                content: formatMessagePreview(row.reply_to_data.content, row.reply_to_data.messageType),
                senderName: row.reply_to_data.senderName,
              }
            } else if (row.reply_to_message_id) {
              const parent = current.find((m) => m.id === row.reply_to_message_id)
              if (parent) {
                replyToObj = {
                  id: parent.id,
                  content: formatMessagePreview(parent.content, parent.messageType || null),
                  senderName: parent.user.name,
                }
              } else {
                replyToObj = {
                  id: row.reply_to_message_id,
                  content: '...',
                  senderName: 'Usuario',
                }
              }
            }

            return [...current, { ...message, replyTo: replyToObj, reactions: [] }]
          })

          // Resolve missing names and parent message in background
          void (async () => {
            const currentMessages = await new Promise<ChatMessage[]>((resolve) => {
              setMessages(curr => {
                resolve(curr)
                return curr
              })
            })

            const needsParent = row.reply_to_message_id && !currentMessages.some(m => m.id === row.reply_to_message_id)
            let resolvedParent: any = null

            if (needsParent) {
              const { data: parentData } = await supabase
                .from('messages')
                .select('id, body, sender_id, message_type')
                .eq('id', row.reply_to_message_id)
                .maybeSingle()

              if (parentData) {
                resolvedParent = parentData
              }
            }

            const idsToFetch = [row.sender_id]
            if (resolvedParent?.sender_id) idsToFetch.push(resolvedParent.sender_id)

            const fetched = await ensureUserNames(idsToFetch)
            const resolvedSender = fetched[row.sender_id]
            const avatar = userAvatarsRef.current[row.sender_id] ?? null

            setMessages((current) =>
              current.map((m) => {
                if (m.id !== row.id) return m

                let nextReplyTo = m.replyTo
                if (resolvedParent) {
                  nextReplyTo = {
                    id: resolvedParent.id,
                    content: formatMessagePreview(resolvedParent.body ?? '', resolvedParent.message_type ?? null),
                    senderName: fetched[resolvedParent.sender_id] ?? userNamesRef.current[resolvedParent.sender_id] ?? 'Usuario'
                  }
                } else if (m.replyTo && m.replyTo.senderName === 'Usuario') {
                  // Try to resolve name even if parent was already there but name was missing
                  const parent = current.find(p => p.id === m.replyTo?.id)
                  if (parent) {
                    const pName = fetched[parent.user.id] ?? userNamesRef.current[parent.user.id]
                    if (pName) {
                      nextReplyTo = { ...m.replyTo, senderName: pName }
                    }
                  }
                }

                return {
                  ...m,
                  user: {
                    ...m.user,
                    name: resolvedSender ?? m.user.name,
                    avatarUrl: avatar,
                  },
                  replyTo: nextReplyTo,
                }
              })
            )
          })()

          if (!lastSeenCreatedAtRef.current || row.created_at > lastSeenCreatedAtRef.current) {
            lastSeenCreatedAtRef.current = row.created_at
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { old: { id: string } }) => {
          const row = payload.old as { id: string }
          if (!row?.id) return
          setMessages((current) => current.filter((m) => m.id !== row.id))
        }
      )
      .subscribe(async (status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          // no-op: typing is handled via presence channel
        }
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[realtime]', conversationId, status)
        }
      })

    conversationChannel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload: { new: { cleared_at?: string | null } }) => {
          console.log('[realtime] conversation update received', payload);
          const nextClearedAt = (payload.new?.cleared_at ?? null) as string | null
          const prev = lastClearedAtRef.current
          if (!nextClearedAt) return
          if (prev && nextClearedAt <= prev) return
          lastClearedAtRef.current = nextClearedAt
          lastSeenCreatedAtRef.current = null
          console.log('[realtime] clearing messages due to cleared_at update');
          setMessages([])
        }
      )
      .subscribe()

    reactionChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE', new: Record<string, any>, old: Record<string, any> }) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as MessageReactionRow
            setMessages((current) =>
              current.map((m) => {
                if (m.id !== newReaction.message_id) return m

                // Remove potential duplicate/optimistic reaction from same user
                const filteredReactions = m.reactions.filter(
                  (r) => r.id !== newReaction.id && r.userId !== newReaction.user_id
                )

                return {
                  ...m,
                  reactions: [
                    ...filteredReactions,
                    {
                      id: newReaction.id,
                      messageId: newReaction.message_id,
                      userId: newReaction.user_id,
                      emoji: newReaction.emoji,
                      createdAt: newReaction.created_at,
                    },
                  ],
                }
              })
            )
          } else if (payload.eventType === 'UPDATE') {
            const updatedReaction = payload.new as MessageReactionRow
            setMessages((current) =>
              current.map((m) => {
                if (m.id !== updatedReaction.message_id) return m
                return {
                  ...m,
                  reactions: m.reactions.map((r) =>
                    r.id === updatedReaction.id
                      ? {
                        ...r,
                        emoji: updatedReaction.emoji,
                      }
                      : r
                  ),
                }
              })
            )
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old as { id: string }
            if (!oldReaction.id) return
            setMessages((current) =>
              current.map((m) => {
                if (!m.reactions.some((r) => r.id === oldReaction.id)) return m
                return {
                  ...m,
                  reactions: m.reactions.filter((r) => r.id !== oldReaction.id),
                }
              })
            )
          }
        }
      )
      .subscribe()

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        recomputeTypingUsers()
      })
      .on('presence', { event: 'join' }, () => {
        recomputeTypingUsers()
      })
      .on('presence', { event: 'leave' }, () => {
        recomputeTypingUsers()
      })
      .subscribe(async (status: string) => {
        setIsPresenceConnected(status === 'SUBSCRIBED') // Track presence connection
        if (status !== 'SUBSCRIBED') return
        typingChannelRef.current = presenceChannel
        const pending = pendingTypingRef.current
        const isTyping = pending ?? false
        await presenceChannel.track({
          user_id: userId,
          name: myName,
          typing: isTyping,
          typing_at: isTyping ? Date.now() : 0,
        })
        recomputeTypingUsers()
      })

    setChannel(newChannel)

    const pollIntervalMs = 900
    const poll = setInterval(() => {
      void (async () => {
        const lastSeen = lastSeenCreatedAtRef.current
        if (!lastSeen) return

        const { data, error } = await supabase
          .from('messages')
          .select(`
            id, body, sender_id, created_at, message_type, media_url, media_name, media_mime, media_size, is_forwarded, reply_to_message_id, reply_to_data,
            parent_message:messages!reply_to_message_id(id, body, sender_id, message_type)
          `)
          .eq('conversation_id', conversationId)
          .gt('created_at', lastSeen)
          .order('created_at', { ascending: true })

        if (!active) return
        if (error) return
        if (!data || data.length === 0) return

        const currentNames = userNamesRef.current
        setMessages((current) => {
          const existing = new Set(current.map((m) => m.id))
          const appended: ChatMessage[] = []
          for (const row of (data as unknown as MessageRow[])) {
            if (existing.has(row.id)) continue
            appended.push({
              id: row.id,
              content: row.body ?? '',
              messageType: row.message_type ?? null,
              mediaUrl: row.media_url ?? null,
              mediaName: row.media_name ?? null,
              mediaMime: row.media_mime ?? null,
              mediaSize: row.media_size ?? null,
              user: {
                id: row.sender_id,
                name:
                  row.sender_id === userId
                    ? myName
                    : (currentNames[row.sender_id] ?? 'Usuario'),
              },
              createdAt: row.created_at,
              reactions: [],
              isForwarded: (row as any).is_forwarded,
              replyTo: row.reply_to_data ? {
                id: row.reply_to_data.id,
                content: formatMessagePreview(row.reply_to_data.content, row.reply_to_data.messageType),
                senderName: row.reply_to_data.senderName
              } : (row.reply_to_message_id && row.parent_message ? {
                id: row.parent_message.id,
                content: formatMessagePreview(row.parent_message.body ?? '', row.parent_message.message_type ?? null),
                senderName: currentNames[row.parent_message.sender_id] ?? 'Usuario'
              } : null)
            })
          }

          if (appended.length === 0) return current
          const next = [...current, ...appended]
          const lastCreatedAt = appended[appended.length - 1]?.createdAt
          if (lastCreatedAt && (!lastSeenCreatedAtRef.current || lastCreatedAt > lastSeenCreatedAtRef.current)) {
            lastSeenCreatedAtRef.current = lastCreatedAt
          }
          return next
        })

        const senderIds = (data as Array<{ sender_id: string | null }>).map((row) => row.sender_id)
        const typedSenderIds = senderIds.filter((id): id is string => Boolean(id))
        void ensureUserNames(typedSenderIds)
      })()
    }, pollIntervalMs)

    return () => {
      active = false
      clearInterval(poll)
      setIsSomeoneTyping(false)
      setTypingUsers([])
      setIsLoading(false)
      setIsPresenceConnected(false) // Reset presence connection state
      typingChannelRef.current = null
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(newChannel)
      supabase.removeChannel(conversationChannel)
      supabase.removeChannel(reactionChannel)
    }
  }, [conversationId, ensureUserNames, myName, recomputeTypingUsers, supabase, userId])

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      pendingTypingRef.current = isTyping
      if (!isPresenceConnected) {
        return
      }
      const ch = typingChannelRef.current
      if (!ch) {
        return
      }

      const payload = {
        user_id: userId,
        name: myName,
        typing: isTyping,
        typing_at: isTyping ? Date.now() : 0,
      }
      await ch.track(payload)
      recomputeTypingUsers()
    },
    [isPresenceConnected, myName, recomputeTypingUsers, userId]
  )

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body: trimmed,
          message_type: 'text',
          reply_to_message_id: replyToId || null,
        })
        .select('id, body, sender_id, created_at, message_type, media_url, media_name, media_mime, media_size, reply_to_data')
        .maybeSingle()

      if (error) throw error

      if (!data?.id) return

      setMessages((current) => {
        if (current.some((m) => m.id === data.id)) return current

        let replyToObj = null
        if (replyToId) {
          const parent = current.find((m) => m.id === replyToId)
          if (parent) {
            replyToObj = {
              id: parent.id,
              content: formatMessagePreview(parent.content, parent.messageType || null),
              senderName: parent.user.name,
            }
          }
        }

        const inserted = data as unknown as MessageRow
        const next: ChatMessage = {
          id: data.id,
          content: data.body ?? '',
          messageType: inserted.message_type ?? null,
          mediaUrl: inserted.media_url ?? null,
          mediaName: inserted.media_name ?? null,
          mediaMime: inserted.media_mime ?? null,
          mediaSize: inserted.media_size ?? null,
          user: {
            id: data.sender_id,
            name: myName,
          },
          createdAt: data.created_at,
          reactions: [],
          replyTo: replyToObj,
        }
        return [...current, next]
      })
    },
    [conversationId, myName, supabase, userId]
  )

  const sendPoll = useCallback(
    async (payload: PollPayload) => {
      const question = (payload.question ?? '').trim()
      const options = Array.isArray(payload.options) ? payload.options.map((o) => (o ?? '').trim()).filter(Boolean) : []
      const allowMultiple = Boolean(payload.allowMultiple)

      if (!question || options.length < 2) return

      const body = JSON.stringify({ question, options, allowMultiple } satisfies PollPayload)

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body,
          message_type: 'poll',
        })
        .select('id, body, sender_id, created_at, message_type, media_url, media_name, media_mime, media_size')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) return

      setMessages((current) => {
        if (current.some((m) => m.id === data.id)) return current
        const inserted = data as unknown as MessageRow
        return [
          ...current,
          {
            id: data.id,
            content: data.body ?? '',
            messageType: inserted.message_type ?? null,
            mediaUrl: inserted.media_url ?? null,
            mediaName: inserted.media_name ?? null,
            mediaMime: inserted.media_mime ?? null,
            mediaSize: inserted.media_size ?? null,
            user: {
              id: data.sender_id,
              name: myName,
              avatarUrl: userAvatarsRef.current[data.sender_id] ?? null,
            },
            createdAt: data.created_at,
            reactions: [],
          },
        ]
      })
    },
    [conversationId, myName, supabase, userId]
  )



  const sendAttachment = useCallback(
    async (file: File, caption?: string) => {
      if (!file) return

      const safeName = (file.name || 'archivo')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 120)
      const mime = file.type || 'application/octet-stream'
      const folder = mime.startsWith('audio/') ? 'audio' : 'media'
      const path = `media/${userId}/${folder}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage.from('media').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('media').getPublicUrl(path)
      const mediaUrl = publicData?.publicUrl ?? null

      const type = mime.startsWith('image/')
        ? 'image'
        : mime.startsWith('video/')
          ? 'video'
          : mime.startsWith('audio/')
            ? 'audio'
            : 'document'

      const trimmedCaption = (caption ?? '').trim()

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body: trimmedCaption ? trimmedCaption : null,
          message_type: type,
          media_url: mediaUrl,
          media_name: file.name,
          media_mime: mime,
          media_size: file.size,
        })
        .select('id, body, sender_id, created_at, message_type, media_url, media_name, media_mime, media_size')
        .maybeSingle()

      if (error) throw error

      if (!data?.id) return

      setMessages((current) => {
        if (current.some((m) => m.id === data.id)) return current
        const inserted = data as unknown as MessageRow
        return [
          ...current,
          {
            id: data.id,
            content: data.body ?? '',
            messageType: inserted.message_type ?? null,
            mediaUrl: inserted.media_url ?? null,
            mediaName: inserted.media_name ?? null,
            mediaMime: inserted.media_mime ?? null,
            mediaSize: inserted.media_size ?? null,
            user: {
              id: data.sender_id,
              name: myName,
              avatarUrl: userAvatarsRef.current[data.sender_id] ?? null,
            },
            createdAt: data.created_at,
            reactions: [],
          },
        ]
      })
    },
    [conversationId, myName, supabase, userId]
  )

  const sendContacts = useCallback(
    async (contacts: Array<{ id: string; fullName: string; email: string | null; avatarUrl: string | null }>) => {
      const clean = contacts.filter((c) => Boolean(c?.id) && Boolean((c.fullName ?? '').trim()))
      if (clean.length === 0) return

      const payload: ContactPayload = { contacts: clean }
      const body = JSON.stringify(payload)

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body,
          message_type: 'contact',
        })
        .select('id, body, sender_id, created_at, message_type, media_url, media_name, media_mime, media_size')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) return

      setMessages((current) => {
        if (current.some((m) => m.id === data.id)) return current
        const inserted = data as unknown as MessageRow
        return [
          ...current,
          {
            id: data.id,
            content: data.body ?? '',
            messageType: inserted.message_type ?? null,
            mediaUrl: inserted.media_url ?? null,
            mediaName: inserted.media_name ?? null,
            mediaMime: inserted.media_mime ?? null,
            mediaSize: inserted.media_size ?? null,
            user: {
              id: data.sender_id,
              name: myName,
              avatarUrl: userAvatarsRef.current[data.sender_id] ?? null,
            },
            createdAt: data.created_at,
            reactions: [],
          },
        ]
      })
    },
    [conversationId, myName, supabase, userId]
  )

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      // Check if user already has ANY reaction on this message
      const { data: userReaction, error: fetchError } = await supabase
        .from('message_reactions')
        .select('id, emoji')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .maybeSingle()

      if (fetchError) {
        console.error('Error checking reaction:', fetchError)
        return
      }

      // Optimistic update
      setMessages((current) =>
        current.map((m) => {
          if (m.id !== messageId) return m

          // If user clicks the same emoji they already have, remove it
          if (userReaction && userReaction.emoji === emoji) {
            return {
              ...m,
              reactions: m.reactions.filter((r) => !(r.userId === userId && r.emoji === emoji)),
            }
          }

          // If user has a different emoji, replace it
          if (userReaction && userReaction.emoji !== emoji) {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.userId === userId ? { ...r, emoji, id: `temp-${Date.now()}` } : r
              ),
            }
          }

          // User has no reaction, add new one
          const tempReaction: MessageReaction = {
            id: `temp-${Date.now()}`,
            messageId,
            userId,
            emoji,
            createdAt: new Date().toISOString(),
          }
          return {
            ...m,
            reactions: [...m.reactions, tempReaction],
          }
        })
      )

      // Database operation
      if (userReaction) {
        if (userReaction.emoji === emoji) {
          // Delete - user clicked same emoji
          await supabase.from('message_reactions').delete().eq('id', userReaction.id)
        } else {
          // Update - user clicked different emoji
          await supabase
            .from('message_reactions')
            .update({ emoji })
            .eq('id', userReaction.id)
        }
      } else {
        // Insert - user has no reaction
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: userId,
          emoji: emoji,
        })
      }
    },
    [conversationId, supabase, userId]
  )

  return {
    messages,
    sendMessage,
    sendAttachment,
    sendContacts,
    sendPoll,
    toggleReaction,
    isSomeoneTyping,
    typingUsers,
    sendTyping,
    isLoading,
    isConnected,
  }
}
