'use client'

import { useCallback, useEffect, useState, useMemo, forwardRef, type ComponentPropsWithoutRef } from 'react'
import {
    X,
    ChevronLeft,
    ChevronRight,
    Download,
    Smile,
    Trash2,
    Forward,
    Reply,
    CheckCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmojiPicker } from '@/components/ui/emoji-picker'

export type MediaItem = {
    id: string
    url: string
    type: 'image' | 'video'
    name?: string | null
    senderName: string
    timestamp: string
    mime?: string | null
    size?: number | null
}

interface MediaViewerProps {
    items: MediaItem[]
    initialIndex: number
    isOpen: boolean
    onClose: () => void
    onReply?: (itemId: string) => void
    onForward?: (itemId: string) => void
    onDelete?: (itemId: string) => void
    onReact?: (itemId: string, emoji: string) => void
}

export function MediaViewer({
    items,
    initialIndex,
    isOpen,
    onClose,
    onReply,
    onForward,
    onDelete,
    onReact,
}: MediaViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [showThumbs, setShowThumbs] = useState(true)
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

    useEffect(() => {
        setCurrentIndex(initialIndex)
    }, [initialIndex])

    const activeItem = items[currentIndex]

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => Math.max(0, prev - 1))
    }, [])

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))
    }, [items.length])

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft') handlePrev()
            if (e.key === 'ArrowRight') handleNext()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, handlePrev, handleNext])

    if (!isOpen || !activeItem) return null

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white animate-in fade-in duration-200">
            {/* Top Bar */}
            <header className="flex h-16 items-center justify-between px-4 bg-gradient-to-b from-black/40 to-transparent">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{activeItem.senderName}</span>
                        <span className="text-xs opacity-70">{activeItem.timestamp}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-4">
                    {/* Actions as seen in user image */}
                    <ActionButton icon={Reply} onClick={() => onReply?.(activeItem.id)} label="Responder" />
                    <EmojiPicker
                        open={emojiPickerOpen}
                        onOpenChange={setEmojiPickerOpen}
                        onSelect={(emoji) => {
                            onReact?.(activeItem.id, emoji)
                            setEmojiPickerOpen(false)
                        }}
                        className="bg-whatsapp-carbon border-white/10 z-[110]"
                    >
                        <ActionButton icon={Smile} label="Reaccionar" />
                    </EmojiPicker>
                    <ActionButton icon={Trash2} onClick={() => onDelete?.(activeItem.id)} label="Eliminar" />
                    <ActionButton icon={Forward} onClick={() => onForward?.(activeItem.id)} label="Reenviar" />
                    <a
                        href={activeItem.url}
                        download={activeItem.name ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Download className="h-5 w-5" />
                    </a>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="relative flex-1 flex items-center justify-center p-4">
                {/* Navigation Arrows */}
                {currentIndex > 0 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 z-10 p-3 rounded-full bg-black/20 hover:bg-black/40 transition-all active:scale-90"
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </button>
                )}

                {currentIndex < items.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 z-10 p-3 rounded-full bg-black/20 hover:bg-black/40 transition-all active:scale-90"
                    >
                        <ChevronRight className="h-8 w-8" />
                    </button>
                )}

                <div className="max-h-full max-w-full flex flex-col items-center justify-center gap-4">
                    {activeItem.type === 'image' ? (
                        <img
                            src={activeItem.url}
                            alt={activeItem.name ?? 'Media'}
                            className="max-h-[70vh] max-w-full object-contain shadow-2xl rounded-sm transition-transform duration-300"
                        />
                    ) : (
                        <video
                            src={activeItem.url}
                            controls
                            autoPlay
                            className="max-h-[70vh] max-w-full shadow-2xl rounded-sm"
                        />
                    )}

                    {/* Counter as seen in user image */}
                    <div className="text-sm font-medium opacity-80 mt-2">
                        {currentIndex + 1} de {items.length}
                    </div>
                </div>
            </div>

            {/* Bottom Thumbnails Area */}
            {showThumbs && items.length > 1 && (
                <footer className="h-24 px-4 py-3 bg-black/60 backdrop-blur-md overflow-x-auto scrollbar-hide border-t border-white/5">
                    <div className="flex gap-2 mx-auto w-fit">
                        {items.map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={cn(
                                    "relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                                    idx === currentIndex
                                        ? "border-whatsapp-forest scale-105 shadow-[0_0_15px_rgba(37,211,102,0.4)]"
                                        : "border-transparent opacity-60 hover:opacity-100"
                                )}
                            >
                                {item.type === 'image' ? (
                                    <img src={item.url} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full relative">
                                        <video src={item.url} className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                            < ChevronRight className="h-4 w-4 fill-current rotate-[ -90deg]" /> {/* Play icon proxy */}
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </footer>
            )}
        </div>
    )
}

const ActionButton = forwardRef<
    HTMLButtonElement,
    { icon: any; onClick?: () => void; label: string } & ComponentPropsWithoutRef<'button'>
>(({ icon: Icon, onClick, label, ...props }, ref) => {
    return (
        <button
            ref={ref}
            onClick={onClick}
            className="p-2 rounded-full hover:bg-white/10 transition-colors group relative"
            aria-label={label}
            {...props}
        >
            <Icon className="h-5 w-5" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {label}
            </span>
        </button>
    )
})
ActionButton.displayName = 'ActionButton'
