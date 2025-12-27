import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReplyPreviewProps {
    replyTo: {
        id: string
        senderName: string
        content: string
    } | null
    onCancel: () => void
}

export function ReplyPreview({ replyTo, onCancel }: ReplyPreviewProps) {
    if (!replyTo) return null

    return (
        <div className="flex items-center justify-between bg-white dark:bg-[#242626] px-4 py-2 rounded-t-3xl border border-whatsapp-border-soft border-b-0 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="relative flex-1 bg-gray-100 dark:bg-[#161717] rounded-lg p-2 mr-2 border-l-4 border-l-[#00a884] overflow-hidden">
                <div className="text-[#00a884] text-xs font-bold mb-0.5">
                    {replyTo.senderName}
                </div>
                <div className="text-gray-600 dark:text-gray-300 text-sm truncate pr-4">
                    {replyTo.content || 'Escribe un mensaje'}
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-transparent"
                onClick={onCancel}
            >
                <X className="h-5 w-5" />
            </Button>
        </div>
    )
}
