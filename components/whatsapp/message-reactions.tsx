"use client"

import { cn } from "@/lib/utils"
import type { MessageReaction } from "@/hooks/use-realtime-chat"

interface MessageReactionsProps {
    reactions: MessageReaction[]
    currentUserId: string
    onToggleReaction?: (emoji: string) => void
}

export function MessageReactions({
    reactions,
    currentUserId,
    onToggleReaction,
}: MessageReactionsProps) {
    if (!reactions || reactions.length === 0) return null

    // Group reactions by emoji
    const groups = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = {
                emoji: reaction.emoji,
                count: 0,
                hasReacted: false,
            }
        }
        acc[reaction.emoji].count++
        if (reaction.userId === currentUserId) {
            acc[reaction.emoji].hasReacted = true
        }
        return acc
    }, {} as Record<string, { emoji: string; count: number; hasReacted: boolean }>)

    const sortedGroups = Object.values(groups).sort((a, b) => b.count - a.count)

    const totalCount = reactions.length
    if (totalCount === 0) return null

    return (
        <div className="absolute -bottom-3 right-0 z-10">
            <div className="flex items-center gap-1 rounded-full border border-whatsapp-border-soft bg-whatsapp-charcoal px-1.5 py-1 text-sm text-whatsapp-text-primary shadow-sm active:scale-95 transition-transform cursor-pointer">
                {sortedGroups.map((group) => (
                    <span
                        key={group.emoji}
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleReaction?.(group.emoji)
                        }}
                        className={cn(
                            "hover:scale-125 transition-transform px-0.5",
                            group.hasReacted && "bg-whatsapp-forest/10 rounded-full" // Subtle highlight? Or just standard.
                        )}
                        role="button"
                    >
                        {group.emoji}
                    </span>
                ))}
                {totalCount > 1 && (
                    <span className="ml-1 text-xs font-medium text-whatsapp-text-primary/90">
                        {totalCount}
                    </span>
                )}
            </div>
        </div>
    )
}
