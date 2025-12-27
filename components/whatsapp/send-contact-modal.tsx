'use client'

import { useCallback, useEffect, useMemo, useState, type FC } from 'react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Send } from 'lucide-react'

type PersonRow = {
  id: string
  fullName: string
  email: string | null
  avatarUrl: string | null
}

type ProfileSelectRow = {
  id: string
  full_name: string | null
  email: string | null
  username: string | null
  avatar_url: string | null
}

export type SendableContact = {
  id: string
  fullName: string
  email: string | null
  avatarUrl: string | null
}

interface SendContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSend: (contacts: SendableContact[]) => void
}

export const SendContactModal: FC<SendContactModalProps> = ({
  open,
  onOpenChange,
  userId,
  onSend,
}) => {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<PersonRow[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true

    async function loadPeople() {
      if (!userId) return
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, username, avatar_url')
          .neq('id', userId)
          .order('full_name', { ascending: true })

        if (!active) return
        if (error) throw error

        const rows = (data ?? []) as ProfileSelectRow[]
        setPeople(
          rows.map((p) => ({
            id: p.id,
            fullName: (p.full_name ?? '').trim() || (p.username ?? '').trim() || (p.email ?? '').trim() || 'Usuario',
            email: p.email ?? null,
            avatarUrl: p.avatar_url ?? null,
          }))
        )
      } catch {
        if (!active) return
        setPeople([])
      } finally {
        if (!active) return
        setIsLoading(false)
      }
    }

    void loadPeople()
    return () => {
      active = false
    }
  }, [open, userId])

  useEffect(() => {
    if (open) return
    setQuery('')
    setSelected({})
  }, [open])

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => p.fullName.toLowerCase().includes(q))
  }, [people, query])

  const selectedContacts = useMemo(() => {
    const ids = Object.keys(selected).filter((k) => selected[k])
    const setIds = new Set(ids)
    return people.filter((p) => setIds.has(p.id))
  }, [people, selected])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleSend = useCallback(() => {
    const contacts: SendableContact[] = selectedContacts.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      email: p.email ?? null,
      avatarUrl: p.avatarUrl,
    }))
    if (contacts.length === 0) return
    onSend(contacts)
    onOpenChange(false)
  }, [onOpenChange, onSend, selectedContacts])

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
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="text-sm font-semibold text-foreground">Envía contactos</div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex h-11 items-center gap-2 rounded-full border border-primary px-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Buscar un nombre o número"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="h-[380px] px-2 py-3">
          <div className="px-3">
            {isLoading ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">Cargando…</div>
            ) : null}

            {!isLoading && filteredPeople.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">No hay contactos.</div>
            ) : null}

            {filteredPeople.map((p) => {
              const checked = Boolean(selected[p.id])
              const initial = p.fullName.trim().slice(0, 1).toUpperCase() || 'U'
              const emailLine = (p.email ?? '').trim()
              const emailLabel = emailLine
                ? emailLine.includes('@')
                  ? emailLine
                  : `@${emailLine}`
                : ''
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(p.id)
                    }
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted',
                    checked ? 'bg-muted' : ''
                  )}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(p.id)
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <Checkbox checked={checked} />
                  </div>
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-foreground">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt={p.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{p.fullName}</div>
                    {emailLabel ? (
                      <div className="truncate text-xs text-muted-foreground">{emailLabel}</div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="min-w-0 truncate text-sm text-muted-foreground">
            {selectedContacts.length > 0
              ? selectedContacts[0]?.fullName + (selectedContacts.length > 1 ? ` y ${selectedContacts.length - 1} más` : '')
              : 'Selecciona contactos'}
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={selectedContacts.length === 0}
            className={cn(
              'grid h-11 w-11 place-items-center rounded-full bg-whatsapp-forest text-primary-foreground',
              'disabled:opacity-50'
            )}
            aria-label="Enviar"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
