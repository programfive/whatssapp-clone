import { Calendar as CalendarIcon, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type ChatMessage, formatMessagePreview } from "@/hooks/use-realtime-chat";

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, query: string) {
    const q = query.trim();
    if (!q) return text;

    const re = new RegExp(`(${escapeRegExp(q)})`, "ig");
    const parts = text.split(re);
    return parts.map((part, idx) => {
        if (!part) return null;
        const isMatch = part.toLowerCase() === q.toLowerCase();
        return isMatch ? (
            <span key={idx} className="font-semibold text-whatsapp-text-mint">
                {part}
            </span>
        ) : (
            <span key={idx}>{part}</span>
        );
    });
}

type GroupedResult = {
    key: string;
    label: string;
    items: ChatMessage[];
};

type Props = {
    searchQuery: string;
    onSearchQueryChange: (val: string) => void;
    searchDate: Date | undefined;
    onSearchDateChange: (val: Date | undefined) => void;
    datePickerOpen: boolean;
    onDatePickerOpenChange: (val: boolean) => void;
    groupedResults: GroupedResult[];
    onClose: () => void;
    onMessageClick: (messageId: string) => void;
};

export function ChatSearchPanel({
    searchQuery,
    onSearchQueryChange,
    searchDate,
    onSearchDateChange,
    datePickerOpen,
    onDatePickerOpenChange,
    groupedResults,
    onClose,
    onMessageClick,
}: Props) {
    return (
        <div className="flex h-full flex-col bg-white py-5 text-foreground dark:bg-[#161717]">
            <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <Popover open={datePickerOpen} onOpenChange={onDatePickerOpenChange}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                                aria-label="Filtrar por fecha"
                            >
                                <CalendarIcon className="h-5 w-5" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="start"
                            className="w-auto rounded-2xl border border-border bg-background p-2 shadow-xl"
                        >
                            <Calendar
                                mode="single"
                                className="bg-red-500"
                                selected={searchDate}
                                onSelect={(d) => {
                                    onSearchDateChange(d);
                                    onDatePickerOpenChange(false);
                                }}
                            />
                        </PopoverContent>
                    </Popover>

                    <div
                        className={cn(
                            "flex h-10 flex-1 items-center gap-2 rounded-full border  px-4",
                            "border-whatsapp-forest",
                        )}
                    >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                            value={searchQuery}
                            onChange={(e) => onSearchQueryChange(e.target.value)}
                            className="h-full w-full  text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Buscar"
                            autoFocus
                        />
                        {searchQuery.trim() || searchDate ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onSearchQueryChange("");
                                    onSearchDateChange(undefined);
                                }}
                                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                                aria-label="Limpiar"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-4 pb-3">
                {!searchQuery.trim() && !searchDate ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                        Busca mensajes enviados a este chat.
                    </div>
                ) : null}

                {searchQuery.trim() || searchDate ? (
                    <div className="mt-3 space-y-5">
                        {groupedResults.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">No se encontraron resultados.</div>
                        ) : (
                            groupedResults.map((group) => (
                                <div key={group.key}>
                                    <div className="mb-2 text-sm font-medium text-muted-foreground">{group.label}</div>
                                    <div className="space-y-2">
                                        {group.items.map((m) => {
                                            const time = new Date(m.createdAt).toLocaleTimeString("es-ES", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            });
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => onMessageClick(m.id)}
                                                    className={cn(
                                                        "w-full cursor-pointer rounded-xl px-3 py-2 text-left transition-colors",
                                                        "hover:bg-whatsapp-panel dark:hover:bg-[#ffffff1a]",
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-medium text-muted-foreground">
                                                                {m.user?.name ?? ""}
                                                            </div>
                                                            <div className="mt-0.5 text-sm text-foreground">
                                                                {renderHighlightedText(
                                                                    formatMessagePreview(m.content ?? "", m.messageType ?? null),
                                                                    searchQuery
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 pt-0.5 text-xs text-muted-foreground">{time}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : null}
            </ScrollArea>
        </div>
    );
}
