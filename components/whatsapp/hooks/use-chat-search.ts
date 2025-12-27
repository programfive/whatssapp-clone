import { useMemo, useState } from "react";
import type { ChatMessage } from "@/hooks/use-realtime-chat";

export function useChatSearch(messages: ChatMessage[]) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

    const filteredMessages = useMemo(() => {
        const q = normalizedQuery;
        const day = searchDate
            ? new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate()).getTime()
            : null;

        return messages
            .filter((m) => {
                if (!q && !day) return false;

                if (m.messageType === "system") return false;

                const matchesText = q
                    ? (m.content ?? "").toLowerCase().includes(q)
                    : true;

                const matchesDate = day
                    ? (() => {
                        const d = new Date(m.createdAt);
                        const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                        return key === day;
                    })()
                    : true;

                return matchesText && matchesDate;
            })
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [messages, normalizedQuery, searchDate]);

    const groupedResults = useMemo(() => {
        const map = new Map<string, ChatMessage[]>();
        for (const m of filteredMessages) {
            const d = new Date(m.createdAt);
            const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
            const arr = map.get(key) ?? [];
            arr.push(m);
            map.set(key, arr);
        }

        return Array.from(map.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, items]) => ({
                key,
                label: new Date(key).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                }),
                items,
            }));
    }, [filteredMessages]);

    return {
        isSearchOpen,
        setIsSearchOpen,
        searchQuery,
        setSearchQuery,
        searchDate,
        setSearchDate,
        datePickerOpen,
        setDatePickerOpen,
        groupedResults,
    };
}
