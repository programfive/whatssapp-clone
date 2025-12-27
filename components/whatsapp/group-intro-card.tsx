import { UsersRound } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface GroupIntroCardProps {
  title: string
  meta?: string
  descriptionHint?: string
  photoUrl?: string | null
  onAddDescription?: () => void
  onOpenInfo?: () => void
  className?: string
}

export function GroupIntroCard({
  title,
  meta,
  descriptionHint = 'Añadir miembros',
  photoUrl,
  onAddDescription,
  onOpenInfo,
  className,
}: GroupIntroCardProps) {
  return (
    <div
      className={cn(
        'bg-whatsapp-charcoal max-w-xl w-full text-whatsapp-text-primary rounded-2xl border border-whatsapp-border-soft  px-5 py-3 text-xs font-semibold ',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-whatsapp-deep-forest text-white shadow-lg">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <UsersRound className="h-7 w-7" />
          )}
        </div>

        <div>
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          {meta ? <p className="mt-1 text-sm text-whatsapp-text-muted dark:text-white/70">{meta}</p> : null}
        </div>

        <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={onAddDescription}
            className="text-sm font-semibold text-whatsapp-forest underline-offset-2 transition-colors hover:text-whatsapp-deep-forest dark:text-whatsapp-teal dark:hover:text-white"
          >
            {descriptionHint}
          </button>
          <button
            type="button"
            onClick={onOpenInfo}
            className="inline-flex items-center justify-center rounded-full bg-whatsapp-forest px-6 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-whatsapp-deep-forest"
          >
            Info. del grupo
          </button>
        </div>
      </div>
    </div>
  )
}
