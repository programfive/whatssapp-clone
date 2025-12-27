import { Lock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { NewChatActions } from '@/components/whatsapp/new-chat-actions'

interface ChatIntroSectionProps {
  isGroup: boolean
  encryptionNoticeText?: string
  creationNoticeText?: string
  unreadCount?: number | null
  showOnlyUnread?: boolean
  onShowAllUnread?: () => void
  showNewChatActions?: boolean
  newChatActions?: {
    phoneNumber: string
    avatarUrl?: string | null
    fallbackInitial?: string
    onDelete?: () => void
    onOpenContactInfo?: () => void
  } | null
  className?: string
}

export function ChatIntroSection({
  isGroup,
  encryptionNoticeText,
  creationNoticeText,
  unreadCount,
  showOnlyUnread,
  onShowAllUnread,
  showNewChatActions,
  newChatActions,
  className,
}: ChatIntroSectionProps) {
  const shouldRenderUnread = Boolean(showOnlyUnread && (unreadCount ?? 0) > 0)

  return (
    <div className={cn('space-y-4', className)}>
      {encryptionNoticeText ? (
        <div className="flex justify-center px-4 sm:px-6">
          <div className="bg-whatsapp-charcoal flex w-full max-w-xl items-center gap-2 rounded-2xl border border-whatsapp-border-soft px-5 py-3 text-left text-sm font-semibold dark:text-[#FFD279] shadow-lg shadow-black/20">
            <span className="flex items-center gap-2 leading-relaxed">
              <Lock className="shrink-0 h-4 w-4 mb-auto mt-2 dark:text-white  " />
              {encryptionNoticeText}
            </span>
          </div>
        </div>
      ) : null}

      {!isGroup && showNewChatActions && newChatActions ? (
        <NewChatActions
          key={newChatActions.avatarUrl ?? newChatActions.phoneNumber}
          phoneNumber={newChatActions.phoneNumber}
          avatarUrl={newChatActions.avatarUrl ?? undefined}
          fallbackInitial={newChatActions.fallbackInitial}
          onOpenContactInfo={newChatActions.onOpenContactInfo}
          onDelete={newChatActions.onDelete}
        />
      ) : null}

      {shouldRenderUnread ? (
        <div className="flex items-center justify-center gap-3">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-medium text-muted-foreground">
            {unreadCount ?? 0} mensajes no leídos
          </div>
          {onShowAllUnread ? (
            <button
              type="button"
              onClick={onShowAllUnread}
              className="text-xs font-medium text-whatsapp-forest hover:underline"
            >
              Ver mensajes anteriores
            </button>
          ) : null}
        </div>
      ) : null}

      {creationNoticeText ? (
        <div className="flex justify-center px-4 sm:px-6">
          <div className="bg-whatsapp-charcoal w-fit rounded-2xl border border-whatsapp-border-soft px-5 py-3 text-center text-xs font-semibold dark:text-white shadow-lg shadow-black/20">
            {creationNoticeText}
          </div>
        </div>
      ) : null}
    </div>
  )
}
