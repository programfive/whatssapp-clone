import { Mic, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/utils'

interface AudioMessagePlayerProps {
  url: string
  isOwnMessage: boolean
  avatarUrl?: string | null
  avatarFallback?: string
}

export const AudioMessagePlayer: FC<AudioMessagePlayerProps> = ({
  url,
  isOwnMessage,
  avatarUrl = null,
  avatarFallback = 'U',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [audioIsPlaying, setAudioIsPlaying] = useState(false)

  const formatAudioTime = useMemo(() => {
    return (seconds: number) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
      const total = Math.floor(seconds)
      const m = Math.floor(total / 60)
      const s = total % 60
      return `${m}:${String(s).padStart(2, '0')}`
    }
  }, [])

  useEffect(() => {
    const audio = new Audio(url)
    audio.preload = 'metadata'
    audioRef.current = audio

    const onLoadedMetadata = () => {
      setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    }
    const onTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime)
    }
    const onEnded = () => {
      setAudioIsPlaying(false)
      setAudioCurrentTime(0)
    }
    const onPlay = () => setAudioIsPlaying(true)
    const onPause = () => setAudioIsPlaying(false)

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.pause()
      audioRef.current = null
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [url])

  const avatarEl = (
    <div className="relative h-10 w-10 shrink-0">
      <div
        className={cn(
          'grid h-10 w-10 place-items-center overflow-hidden rounded-full text-xs font-semibold',
          isOwnMessage ? 'bg-white/15 text-white' : 'bg-whatsapp-carbon text-whatsapp-text-primary'
        )}
        aria-label="Avatar"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span>{avatarFallback}</span>
        )}
      </div>
      <span
        aria-hidden
        className={cn(
          'absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full ring-2',
          isOwnMessage
            ? 'bg-whatsapp-forest text-white ring-whatsapp-forest'
            : 'bg-whatsapp-charcoal text-whatsapp-text-primary ring-whatsapp-charcoal'
        )}
      >
        <Mic className="h-3 w-3" />
      </span>
    </div>
  )

  return (
    <div className="mb-2 w-72 max-w-full rounded-lg bg-black/10 p-3">
      <div className="flex items-center gap-3">
        {isOwnMessage ? avatarEl : null}

        <button
          type="button"
          onClick={() => {
            const audio = audioRef.current
            if (!audio) return
            if (audio.paused) {
              void audio.play()
              return
            }
            audio.pause()
          }}
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors',
            isOwnMessage
              ? 'bg-white/15 text-white hover:bg-white/20'
              : 'bg-black/10 text-whatsapp-text-primary hover:bg-black/15'
          )}
          aria-label={audioIsPlaying ? 'Pausar audio' : 'Reproducir audio'}
        >
          {audioIsPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={(ev) => {
              const audio = audioRef.current
              if (!audio || !Number.isFinite(audioDuration) || audioDuration <= 0) return
              const rect = (ev.currentTarget as HTMLButtonElement).getBoundingClientRect()
              const x = ev.clientX - rect.left
              const ratio = Math.min(1, Math.max(0, x / rect.width))
              audio.currentTime = ratio * audioDuration
            }}
            className="group relative block h-3 w-full"
            aria-label="Barra de reproducción"
          >
            <span
              aria-hidden
              className={cn(
                'absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full',
                isOwnMessage ? 'bg-white/30' : 'bg-black/15'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full',
                isOwnMessage ? 'bg-sky-200/90' : 'bg-sky-500/70'
              )}
              style={{
                width: `${audioDuration > 0 ? Math.min(100, (audioCurrentTime / audioDuration) * 100) : 0}%`,
              }}
            />
            <span
              aria-hidden
              className="absolute left-0 top-1/2 flex w-full -translate-y-1/2 items-center justify-between"
            >
              {Array.from({ length: 36 }).map((_, idx) => {
                const ratio = (idx + 1) / 36
                const active = audioDuration > 0 && audioCurrentTime / audioDuration >= ratio
                return (
                  <span
                    key={idx}
                    className={cn(
                      'h-[6px] w-[2px] rounded-full',
                      active
                        ? isOwnMessage
                          ? 'bg-sky-200/90'
                          : 'bg-sky-500/80'
                        : isOwnMessage
                          ? 'bg-white/25'
                          : 'bg-black/15'
                    )}
                  />
                )
              })}
            </span>
            <span
              aria-hidden
              className={cn(
                'absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full shadow-sm',
                isOwnMessage ? 'bg-sky-200' : 'bg-sky-500'
              )}
              style={{
                left: `calc(${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}% - 5px)`,
              }}
            />
          </button>

          <div className="mt-1 flex items-center justify-between">
            <span
              className={cn(
                'text-xs tabular-nums',
                isOwnMessage ? 'text-white/80' : 'text-whatsapp-text-muted'
              )}
            >
              {formatAudioTime(audioDuration)}
            </span>
          </div>
        </div>

        {!isOwnMessage ? avatarEl : null}
      </div>
    </div>
  )
}
