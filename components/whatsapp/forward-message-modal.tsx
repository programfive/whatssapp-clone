'use client'

import { useCallback, useEffect, useMemo, useState, type FC } from 'react'
import { Search, X, Send, Check } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GroupAvatar } from './group-avatar'

type ChatRecipient = {
    id: string
    name: string
    email: string | null
    avatarUrl: string | null
    isGroup: boolean
    memberCount?: number
}

type ConversationRow = {
    id: string
    title: string | null
    is_group: boolean
    photo_url: string | null
}

type MemberProfileRow = {
    conversation_id: string
    user_id: string
    profiles: {
        id: string
        full_name: string | null
        email: string | null
        avatar_url: string | null
    } | null
}

interface ForwardMessageModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId: string
    onForward: (recipientIds: string[]) => void
    messageCount?: number
    currentConversationId?: string
}

export const ForwardMessageModal: FC<ForwardMessageModalProps> = ({
    open,
    onOpenChange,
    userId,
    onForward,
    messageCount = 1,
    currentConversationId,
}) => {
    const [query, setQuery] = useState('')
    const [chats, setChats] = useState<ChatRecipient[]>([])
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!open) return
        let active = true

        async function loadChats() {
            if (!userId) return
            setIsLoading(true)
            try {
                const supabase = createClient()

                // Get all conversations user is part of
                const { data: memberRows, error: memberError } = await supabase
                    .from('conversation_members')
                    .select('conversation_id')
                    .eq('user_id', userId)

                if (memberError) throw memberError
                if (!active) return

                const conversationIds = ((memberRows ?? []) as { conversation_id: string | null }[])
                    .map((r: any) => r.conversation_id)
                    .filter((id): id is string => typeof id === 'string' && id.length > 0)
                    .filter((id) => id !== currentConversationId)

                if (conversationIds.length === 0) {
                    setChats([])
                    setIsLoading(false)
                    return
                }

                // Get conversation details
                const { data: conversations, error: convoError } = await supabase
                    .from('conversations')
                    .select('id, title, is_group, photo_url')
                    .in('id', conversationIds)

                if (convoError) throw convoError
                if (!active) return

                const convos = (conversations ?? []) as ConversationRow[]

                // For each conversation, get members and then their profiles
                const { data: allMembers, error: membersError } = await supabase
                    .from('conversation_members')
                    .select('conversation_id, user_id')
                    .in('conversation_id', conversationIds)

                if (membersError) throw membersError
                if (!active) return

                // Fetch profiles for all members
                const allMemberRows = (allMembers ?? []) as { conversation_id: string; user_id: string }[]
                const userIds = Array.from(new Set(allMemberRows.map((m) => m.user_id)))
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url')
                    .in('id', userIds)

                if (profilesError) throw profilesError
                if (!active) return

                type ProfileRow = { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
                const profilesMap = new Map(
                    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
                )

                const membersByConvo = new Map<string, MemberProfileRow[]>()
                for (const m of (allMembers ?? []) as { conversation_id: string; user_id: string }[]) {
                    const list = membersByConvo.get(m.conversation_id) || []
                    list.push({
                        conversation_id: m.conversation_id,
                        user_id: m.user_id,
                        profiles: profilesMap.get(m.user_id) || null,
                    })
                    membersByConvo.set(m.conversation_id, list)
                }

                // Build recipient list
                const recipients: ChatRecipient[] = convos.map((c) => {
                    const members = membersByConvo.get(c.id) || []
                    const otherMembers = members.filter((m) => m.user_id !== userId)

                    if (c.is_group) {
                        return {
                            id: c.id,
                            name: (c.title ?? '').trim() || 'Grupo',
                            email: null,
                            avatarUrl: c.photo_url,
                            isGroup: true,
                            memberCount: members.length,
                        }
                    }

                    // For 1:1 chats, show the other person's info
                    const other = otherMembers[0]?.profiles
                    const name = (other?.full_name ?? '').trim() || (other?.email ?? '').trim() || 'Chat'
                    return {
                        id: c.id,
                        name,
                        email: other?.email ?? null,
                        avatarUrl: other?.avatar_url ?? null,
                        isGroup: false,
                    }
                })

                // Sort alphabetically
                recipients.sort((a, b) => a.name.localeCompare(b.name))

                setChats(recipients)
            } catch (err) {
                console.error('[ForwardMessageModal] loadChats error:', err)
                if (!active) return
                setChats([])
            } finally {
                if (!active) return
                setIsLoading(false)
            }
        }

        void loadChats()
        return () => {
            active = false
        }
    }, [open, userId, currentConversationId])

    useEffect(() => {
        if (open) return
        setQuery('')
        setSelected({})
    }, [open])

    const filteredChats = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return chats
        return chats.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.email && c.email.toLowerCase().includes(q))
        )
    }, [chats, query])

    const selectedChats = useMemo(() => {
        const ids = Object.keys(selected).filter((k) => selected[k])
        const setIds = new Set(ids)
        return chats.filter((c) => setIds.has(c.id))
    }, [chats, selected])

    const toggle = useCallback((id: string) => {
        setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
    }, [])

    const handleForward = useCallback(() => {
        const recipientIds = selectedChats.map((c) => c.id)
        if (recipientIds.length === 0) return
        onForward(recipientIds)
        onOpenChange(false)
    }, [onForward, onOpenChange, selectedChats])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100]">
            <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0 bg-black/50"
                onClick={() => onOpenChange(false)}
            />

            <div className="absolute left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-whatsapp-panel"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="text-base font-semibold text-foreground">Reenviar mensaje a</div>
                </div>

                {/* Search */}
                <div className="px-5 pt-4">
                    <div className="flex h-11 items-center gap-2 rounded-full border border-whatsapp-forest px-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                            placeholder="Buscar un nombre o número"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Recent chats label */}
                <div className="px-5 pb-2 pt-4">
                    <div className="text-sm font-medium text-muted-foreground">Chats recientes</div>
                </div>

                {/* Chat list */}
                <ScrollArea className="h-[340px] px-2">
                    <div className="px-3">
                        {isLoading ? (
                            <div className="px-2 py-4 text-sm text-muted-foreground">Cargando…</div>
                        ) : null}

                        {!isLoading && filteredChats.length === 0 ? (
                            <div className="px-2 py-4 text-sm text-muted-foreground">No hay chats disponibles.</div>
                        ) : null}

                        {filteredChats.map((chat) => {
                            const checked = Boolean(selected[chat.id])
                            const initial = chat.name.trim().slice(0, 1).toUpperCase() || 'U'
                            const subtitle = chat.isGroup
                                ? `${chat.memberCount ?? 0} participantes`
                                : chat.email ?? ''

                            return (
                                <div
                                    key={chat.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggle(chat.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            toggle(chat.id)
                                        }
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors',
                                        'hover:bg-muted',
                                        checked ? 'bg-muted/60' : ''
                                    )}
                                >
                                    {/* Checkbox circle */}
                                    <div
                                        className={cn(
                                            'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                                            checked
                                                ? 'border-whatsapp-forest bg-whatsapp-forest text-white'
                                                : 'border-muted-foreground/40'
                                        )}
                                    >
                                        {checked ? <Check className="h-3 w-3" /> : null}
                                    </div>

                                    {/* Avatar */}
                                    {chat.isGroup ? (
                                        chat.avatarUrl ? (
                                            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={chat.avatarUrl} alt={chat.name} className="h-full w-full object-cover" />
                                            </div>
                                        ) : (
                                            <GroupAvatar items={[{ label: chat.name }]} size="sm" />
                                        )
                                    ) : (
                                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-foreground">
                                            {chat.avatarUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={chat.avatarUrl} alt={chat.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span>{initial}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Name and subtitle */}
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-foreground">{chat.name}</div>
                                        {subtitle ? (
                                            <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
                    <div className="min-w-0 truncate text-sm text-muted-foreground">
                        {selectedChats.length > 0
                            ? selectedChats[0]?.name + (selectedChats.length > 1 ? ` y ${selectedChats.length - 1} más` : '')
                            : 'Selecciona un chat'}
                    </div>
                    <button
                        type="button"
                        onClick={handleForward}
                        disabled={selectedChats.length === 0}
                        className={cn(
                            'grid h-11 w-11 place-items-center rounded-full bg-whatsapp-forest text-white transition-opacity',
                            'disabled:opacity-50'
                        )}
                        aria-label="Reenviar"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
