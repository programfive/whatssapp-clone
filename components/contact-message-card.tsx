import { useCallback, useEffect, useMemo, useState, type FC } from 'react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'
import { X } from 'lucide-react'

export type ContactPayload = {
  contacts: Array<{ id: string; fullName: string; email: string | null; avatarUrl: string | null }>
}

interface ContactMessageCardProps {
  message: ChatMessage
  isOwnMessage: boolean
  onOpenContactChat?: (contact: { id: string; fullName: string }) => void
}

export const ContactMessageCard: FC<ContactMessageCardProps> = ({
  message,
  isOwnMessage,
  onOpenContactChat,
}) => {
  const [open, setOpen] = useState(false)
  const [emailById, setEmailById] = useState<Record<string, string>>({})

  const contacts = useMemo(() => {
    try {
      const payload = JSON.parse(message.content) as ContactPayload
      return payload?.contacts ?? []
    } catch {
      return []
    }
  }, [message.content])

  const first = contacts[0] ?? null
  const remainingCount = Math.max(0, contacts.length - 1)

  const canOpen = Boolean(onOpenContactChat)

  const openChat = useCallback(
    (contact: { id: string; fullName: string }) => {
      if (!onOpenContactChat) return
      onOpenContactChat(contact)
    },
    [onOpenContactChat]
  )

  const headerLabel = useMemo(() => {
    if (contacts.length <= 1) return 'Contacto'
    return `${contacts.length} contactos`
  }, [contacts.length])

  useEffect(() => {
    if (!open) return
    if (contacts.length <= 1) return

    const idsNeedingEmail = contacts
      .filter((c) => !String(c.email ?? '').trim())
      .map((c) => c.id)
      .filter(Boolean)
      .filter((id) => !emailById[id])

    if (idsNeedingEmail.length === 0) return

    let active = true

    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, username')
          .in('id', idsNeedingEmail)

        if (!active) return
        if (error) return

        const rows = (data ?? []) as Array<{ id: string; email: string | null; username: string | null }>
        setEmailById((prev) => {
          const next = { ...prev }
          for (const r of rows) {
            const v = (r.email ?? r.username ?? '').trim()
            if (v) next[r.id] = v
          }
          return next
        })
      } catch {
        // ignore
      }
    })()

    return () => {
      active = false
    }
  }, [contacts, emailById, open])

  useEffect(() => {
    if (open) return
    if (contacts.length !== 1) return
    const only = contacts[0]
    if (!only?.id) return
    if (String(only.email ?? '').trim()) return
    if (emailById[only.id]) return

    let active = true

    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, username')
          .eq('id', only.id)
          .maybeSingle()

        if (!active) return
        if (error) return
        if (!data?.id) return
        const v = (data.email ?? data.username ?? '').trim()
        if (!v) return

        setEmailById((prev) => ({ ...prev, [data.id]: v }))
      } catch {
        // ignore
      }
    })()

    return () => {
      active = false
    }
  }, [contacts, emailById, open])

  if (!first) {
    return <div className="text-sm opacity-80">Contacto</div>
  }

  const initial = (first.fullName ?? 'U').trim().slice(0, 1).toUpperCase() || 'U'
  const cardEmailLine = String(first.email ?? emailById[first.id] ?? '').trim()
  const cardEmailLabel = cardEmailLine
    ? cardEmailLine.includes('@')
      ? cardEmailLine
      : `@${cardEmailLine}`
    : ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (contacts.length <= 1) return
        setOpen(true)
      }}
      onKeyDown={(e) => {
        if (contacts.length <= 1) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen(true)
        }
      }}
      className={cn(
        'mb-2 w-72 max-w-full rounded-lg p-3 text-left',
        isOwnMessage ? 'bg-white/10' : 'bg-black/10'
      )}
      aria-label={contacts.length > 1 ? 'Abrir contactos' : 'Contacto'}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-black/10 text-xs font-semibold">
          {first.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={first.avatarUrl} alt={first.fullName} className="h-full w-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className={cn('truncate text-sm font-semibold', isOwnMessage ? 'text-white' : 'text-whatsapp-text-primary')}>
            {first.fullName}
            {remainingCount > 0 ? ` y ${remainingCount} contacto más` : ''}
          </div>
          {contacts.length > 1 ? (
            <div className={cn('text-xs', isOwnMessage ? 'text-white/75' : 'text-whatsapp-text-muted')}>
              Contacto
            </div>
          ) : cardEmailLabel ? (
            <div className={cn('text-xs', isOwnMessage ? 'text-white/75' : 'text-whatsapp-text-muted')}>
              {cardEmailLabel}
            </div>
          ) : (
            <div className={cn('text-xs', isOwnMessage ? 'text-white/75' : 'text-whatsapp-text-muted')}>
              Contacto
            </div>
          )}
        </div>
      </div>

      {contacts.length > 1 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
          className={cn(
            'mt-3 w-full border-t border-black/10 pt-2 text-center text-sm font-medium',
            isOwnMessage ? 'text-white' : 'text-whatsapp-text-green'
          )}
        >
          Ver todos
        </button>
      ) : (
        <div className="mt-3 flex justify-center items-center border-t  overflow-hidden rounded-md border border-black/10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openChat({ id: first.id, fullName: first.fullName })
            }}
            disabled={!canOpen}
            className={cn(
              'py-2 text-center text-sm font-medium cursor-pointer ',
              isOwnMessage ? 'text-white' : 'text-whatsapp-text-green',
              'hover:bg-black/5 disabled:opacity-60'
            )}
          >
            Mensaje
          </button>
        </div>
      )}

      {open && contacts.length > 1 ? (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/50"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="absolute left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-whatsapp-panel"
                  aria-label="Cerrar"
                >
                  <X className='w-6 h-6' />
                </button>
                <div className="text-sm font-semibold text-foreground">{headerLabel}</div>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto py-2">
              {contacts.map((c) => {
                const rowInitial = (c.fullName ?? 'U').trim().slice(0, 1).toUpperCase() || 'U'
                const emailLine = String(c.email ?? emailById[c.id] ?? '').trim()
                const emailLabel = emailLine
                  ? emailLine.includes('@')
                    ? emailLine
                    : `@${emailLine}`
                  : ''
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-foreground">
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatarUrl} alt={c.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <span>{rowInitial}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{c.fullName}</div>
                      {emailLabel ? (
                        <div className="truncate text-[11px] leading-4 text-muted-foreground">{emailLabel}</div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        openChat({ id: c.id, fullName: c.fullName })
                        setOpen(false)
                      }}
                      disabled={!canOpen}
                      className={cn(
                        'rounded-full bg-whatsapp-forest px-4 py-2 text-sm font-semibold text-primary-foreground',
                        'hover:opacity-90 disabled:opacity-60'
                      )}
                    >
                      Mensaje
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
