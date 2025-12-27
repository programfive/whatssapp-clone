
'use client'

import { useCallback, useEffect, useMemo, useState, type FC } from 'react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'

export type PollPayload = {
  question: string
  options: string[]
  allowMultiple: boolean
}

type PollVoteRow = {
  id: string
  message_id: string
  voter_id: string
  option_index: number
  created_at?: string
}

type VoterProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface PollMessageCardProps {
  message: ChatMessage
  isOwnMessage: boolean
  currentUserId: string
}

export const PollMessageCard: FC<PollMessageCardProps> = ({ message, isOwnMessage, currentUserId }) => {
  const [votes, setVotes] = useState<PollVoteRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [voterProfiles, setVoterProfiles] = useState<Record<string, VoterProfile>>({})

  const getInitial = useCallback((name: string) => {
    const v = (name ?? '').trim()
    return v ? v.slice(0, 1).toUpperCase() : '?'
  }, [])

  const payload = useMemo(() => {
    try {
      return JSON.parse(message.content) as PollPayload
    } catch {
      return null
    }
  }, [message.content])

  const question = (payload?.question ?? '').trim()
  const options = Array.isArray(payload?.options) ? payload!.options : []
  const allowMultiple = Boolean(payload?.allowMultiple)

  const mySelected = useMemo(() => {
    const set = new Set<number>()
    for (const v of votes) {
      if (v.voter_id === currentUserId) set.add(v.option_index)
    }
    return set
  }, [currentUserId, votes])

  const counts = useMemo(() => {
    const arr = new Array(options.length).fill(0)
    for (const v of votes) {
      if (v.option_index >= 0 && v.option_index < arr.length) arr[v.option_index] += 1
    }
    return arr
  }, [options.length, votes])

  const totalVotes = useMemo(() => votes.length, [votes.length])
  const maxCount = useMemo(() => Math.max(1, ...counts), [counts])

  const loadVotes = useCallback(async () => {
    if (!message.id) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('poll_votes')
        .select('id, message_id, voter_id, option_index, created_at')
        .eq('message_id', message.id)

      if (error) {
        setErrorMessage(error.message)
        return
      }
      setVotes((data ?? []) as PollVoteRow[])
    } finally {
      setIsLoading(false)
    }
  }, [message.id])

  const loadProfilesForVotes = useCallback(async () => {
    const ids = Array.from(new Set(votes.map((v) => v.voter_id).filter(Boolean)))
    if (ids.length === 0) {
      setVoterProfiles({})
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', ids)

    if (error) return
    const next: Record<string, VoterProfile> = {}
    for (const row of (data ?? []) as VoterProfile[]) {
      next[row.id] = row
    }
    setVoterProfiles(next)
  }, [votes])

  useEffect(() => {
    void loadVotes()
  }, [loadVotes])

  useEffect(() => {
    void loadProfilesForVotes()
  }, [loadProfilesForVotes])

  useEffect(() => {
    if (!message.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`poll_votes:${message.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `message_id=eq.${message.id}`,
        },
        () => {
          void loadVotes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadVotes, message.id])

  const toggleVote = useCallback(
    async (idx: number) => {
      if (!message.id) return
      if (!currentUserId) return
      if (idx < 0 || idx >= options.length) return
      if (isSaving) return

      setErrorMessage(null)

      const supabase = createClient()

      setIsSaving(true)

      try {
        if (!allowMultiple) {
          const hasSelectedThis = mySelected.has(idx)

          // Always clear existing single-choice selection(s)
          const { error: delErr } = await supabase
            .from('poll_votes')
            .delete()
            .eq('message_id', message.id)
            .eq('voter_id', currentUserId)

          if (delErr) {
            setErrorMessage(delErr.message)
            return
          }

          // If user clicked the same selected option, treat as unvote.
          if (hasSelectedThis) return

          const { error: insErr } = await supabase.from('poll_votes').insert({
            message_id: message.id,
            voter_id: currentUserId,
            option_index: idx,
          })

          if (insErr) {
            setErrorMessage(insErr.message)
            return
          }
          return
        }

        const has = mySelected.has(idx)
        if (has) {
          const { error } = await supabase
            .from('poll_votes')
            .delete()
            .eq('message_id', message.id)
            .eq('voter_id', currentUserId)
            .eq('option_index', idx)

          if (error) {
            setErrorMessage(error.message)
            return
          }
          return
        }

        const { error } = await supabase.from('poll_votes').insert({
          message_id: message.id,
          voter_id: currentUserId,
          option_index: idx,
        })

        if (error) {
          setErrorMessage(error.message)
          return
        }
      } finally {
        setIsSaving(false)
      }
    },
    [allowMultiple, currentUserId, isSaving, message.id, mySelected, options.length]
  )

  const votesByOption = useMemo(() => {
    const map = new Map<number, PollVoteRow[]>()
    for (const v of votes) {
      const arr = map.get(v.option_index) ?? []
      arr.push(v)
      map.set(v.option_index, arr)
    }
    return map
  }, [votes])

  if (!payload || !question || options.length < 2) {
    return <div className="text-sm opacity-80">Encuesta</div>
  }

  return (
    <div className={cn('mb-2 w-72 max-w-full rounded-lg p-3 text-left', isOwnMessage ? 'bg-white/10' : 'bg-black/10')}>
      <div className={cn('mb-1 text-sm font-semibold', isOwnMessage ? 'text-white' : 'text-whatsapp-text-primary')}>
        {question}
      </div>
      <div className={cn('mb-3 text-xs', isOwnMessage ? 'text-white/75' : 'text-whatsapp-text-muted')}>
        {allowMultiple ? 'Selecciona una opción o más.' : 'Selecciona una opción.'}
      </div>

      <div className="space-y-3">
        {options.map((label, idx) => {
          const selected = mySelected.has(idx)
          const count = counts[idx] ?? 0
          const pct = Math.round((count / maxCount) * 100)

          const votersForOption = (votesByOption.get(idx) ?? [])
            .map((v) => v.voter_id)
            .filter(Boolean)
          const uniqueVoters = Array.from(new Set(votersForOption))
          const topVoters = uniqueVoters.slice(0, 2)
          const restCount = uniqueVoters.length > 2 ? uniqueVoters.length - 2 : 0

          return (
            <button
              key={idx}
              type="button"
              onClick={() => void toggleVote(idx)}
              disabled={isSaving}
              className={cn('w-full text-left', isSaving ? 'cursor-not-allowed opacity-80' : 'cursor-pointer')}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                    selected
                      ? 'border-whatsapp-forest bg-whatsapp-forest text-white'
                      : isOwnMessage
                        ? 'border-white/60'
                        : 'border-whatsapp-text-muted'
                  )}
                >
                  {selected ? <span className="text-[10px] leading-none">✓</span> : null}
                </span>

                <div className={cn('flex-1 text-sm', isOwnMessage ? 'text-white' : 'text-whatsapp-text-primary')}>
                  {label}
                </div>

                <div className="flex items-center gap-1">
                  {uniqueVoters.length > 0 ? (
                    <div className="flex items-center">
                      {topVoters.map((voterId, i) => {
                        const p = voterProfiles[voterId]
                        const displayName = (p?.full_name ?? '').trim() || 'Usuario'
                        const avatarUrl = p?.avatar_url ?? null
                        return (
                          <div
                            key={voterId}
                            className={cn(
                              'relative h-[18px] w-[18px] overflow-hidden rounded-full border',
                              isOwnMessage ? 'border-white/30' : 'border-border',
                              i === 0 ? '' : '-ml-2'
                            )}
                            title={displayName}
                          >
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                              <div className={cn('grid h-full w-full place-items-center text-[10px] font-semibold', isOwnMessage ? 'bg-white/15 text-white' : 'bg-muted text-foreground')}>
                                {getInitial(displayName)}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {restCount > 0 ? (
                        <div
                          className={cn(
                            'grid h-[18px] w-[18px] -ml-2 place-items-center rounded-full border text-[9px] font-semibold',
                            isOwnMessage ? 'border-white/30 bg-white/15 text-white' : 'border-border bg-muted text-foreground'
                          )}
                          title={`+${restCount}`}
                        >
                          +{restCount}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'min-w-[10px] text-right text-xs tabular-nums',
                      isOwnMessage ? 'text-white/80' : 'text-whatsapp-text-muted'
                    )}
                  >
                    {count}
                  </div>
                </div>
              </div>

              <div className={cn('mt-2 h-2 w-full overflow-hidden rounded-full', isOwnMessage ? 'bg-white/20' : 'bg-black/10')}>
                <div
                  className={cn('h-full rounded-full', selected ? 'bg-whatsapp-forest' : isOwnMessage ? 'bg-white/30' : 'bg-whatsapp-panel')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>

      <div className={cn('mt-3 text-center text-sm font-medium', isOwnMessage ? 'text-white/90' : 'text-whatsapp-text-green')}>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="cursor-pointer"
        >
          {isLoading ? 'Actualizando…' : totalVotes > 0 ? `Ver votos (${totalVotes})` : 'Ver votos'}
        </button>
      </div>

      {errorMessage ? (
        <div className={cn('mt-2 text-xs', isOwnMessage ? 'text-white/70' : 'text-destructive')}>
          {errorMessage}
        </div>
      ) : null}

      {detailsOpen ? (
        <div className="fixed inset-0 z-[140]">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDetailsOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background text-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="text-sm font-semibold">Detalles de la encuesta</div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
              <div className="mb-4 text-base font-semibold">{question}</div>

              <div className="space-y-6">
                {options.map((label, idx) => {
                  const rows = votesByOption.get(idx) ?? []
                  const count = rows.length

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium">{label}</div>
                        <div className={cn('rounded-full px-2 py-0.5 text-xs font-medium', count > 0 ? 'bg-whatsapp-forest/15 text-whatsapp-forest' : 'bg-muted text-muted-foreground')}>
                          {count === 1 ? '1 voto' : `${count} votos`}
                        </div>
                      </div>

                      {rows.length > 0 ? (
                        <div className="space-y-2">
                          {rows
                            .slice()
                            .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
                            .map((v) => {
                              const p = voterProfiles[v.voter_id]
                              const name = (p?.full_name ?? '').trim() || 'Usuario'
                              const time = v.created_at
                                ? new Date(v.created_at).toLocaleString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                  })
                                : ''
                              const isMe = v.voter_id === currentUserId
                              return (
                                <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">
                                      {isMe ? 'Tú' : name}
                                    </div>
                                    {time ? <div className="text-xs text-muted-foreground">{time}</div> : null}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">0 votos</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
