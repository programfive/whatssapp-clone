"use client"

import { Smile, Plus } from "lucide-react"
import { useState } from "react"

import { EmojiPicker } from "@/components/ui/emoji-picker"
import { cn } from "@/lib/utils"

// Default emojis for quick reactions
const PROMINENT_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

interface MessageReactionPickerProps {
    onReact: (emoji: string) => void
    onClose?: () => void
    align?: "left" | "right"
    side?: "top" | "bottom"
}

export function MessageReactionPicker({
    onReact,
    onClose,
    align = "right",
    side = "top",
}: MessageReactionPickerProps) {
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

    const handleEmojiSelect = (emoji: string) => {
        onReact(emoji)
        setIsEmojiPickerOpen(false)
        onClose?.()
    }

    return (
        <div
            className={cn(
                "absolute z-50 flex items-center gap-1 rounded-full bg-whatsapp-charcoal px-2 py-1.5 shadow-lg ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200",
                side === "top" ? "-top-12" : "-bottom-12",
                align === "right" ? "right-0" : "left-0"
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {PROMINENT_EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-white/10 active:scale-95"
                    type="button"
                >
                    {emoji}
                </button>
            ))}

            <div className="mx-1 h-5 w-px bg-white/10" />

            <EmojiPicker
                open={isEmojiPickerOpen}
                onOpenChange={setIsEmojiPickerOpen}
                onSelect={handleEmojiSelect}
            >
                <button
                    className="flex h-8 w-8 items-center justify-center rounded-full text-whatsapp-text-primary transition-colors hover:bg-white/10"
                    type="button"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </EmojiPicker>
        </div>
    )
}
