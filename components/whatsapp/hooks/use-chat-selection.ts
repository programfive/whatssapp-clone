import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatPreview } from "../types";
import type { ChatMessage } from "@/hooks/use-realtime-chat";
import { createClient } from "@/lib/supabase/client";

export function useChatSelection(chat: ChatPreview, userId: string, username: string, messages: ChatMessage[]) {
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
    const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const [deleteAlsoFromDevice, setDeleteAlsoFromDevice] = useState(true);

    useEffect(() => {
        setIsSelectionMode(false);
        setSelectedMessageIds([]);
        setDeleteConfirmOpen(false);
        setClearConfirmOpen(false);
    }, [chat.id]);

    useEffect(() => {
        if (!chat.id || !userId) return;
        try {
            const raw = localStorage.getItem(`hidden:${userId}:${chat.id}`);
            const ids = raw ? (JSON.parse(raw) as string[]) : [];
            setDeletedMessageIds(Array.isArray(ids) ? ids : []);
        } catch {
            setDeletedMessageIds([]);
        }
    }, [chat.id, userId]);

    const toggleMessageSelection = useCallback((id: string) => {
        setSelectedMessageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }, []);

    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedMessageIds([]);
    }, []);

    const requestDeleteSelectedMessages = useCallback((specificId?: string) => {
        if (specificId) {
            setSelectedMessageIds([specificId]);
            setDeleteConfirmOpen(true);
            return;
        }
        if (selectedMessageIds.length === 0) return;
        setDeleteConfirmOpen(true);
    }, [selectedMessageIds.length]);

    const confirmDeleteForMe = useCallback(() => {
        if (!chat.id || !userId) return;
        if (selectedMessageIds.length === 0) {
            setDeleteConfirmOpen(false);
            exitSelectionMode();
            return;
        }

        const next = Array.from(new Set([...deletedMessageIds, ...selectedMessageIds]));
        setDeletedMessageIds(next);
        try {
            localStorage.setItem(`hidden:${userId}:${chat.id}`, JSON.stringify(next));
        } catch {
            // ignore
        }
        setDeleteConfirmOpen(false);
        exitSelectionMode();
    }, [chat.id, deletedMessageIds, exitSelectionMode, selectedMessageIds, userId]);

    const canDeleteForAll = useMemo(() => {
        if (selectedMessageIds.length === 0) return false;
        for (const id of selectedMessageIds) {
            const m = messages.find((x) => x.id === id);
            if (!m || m.user?.id !== userId) return false;
        }
        return true;
    }, [messages, selectedMessageIds, userId]);

    const confirmDeleteForAll = useCallback(async () => {
        if (!chat.id || !userId) return;
        if (!canDeleteForAll) return;
        if (selectedMessageIds.length === 0) {
            setDeleteConfirmOpen(false);
            exitSelectionMode();
            return;
        }

        // hide immediately to avoid flicker while realtime catches up
        setDeletedMessageIds((prev) => Array.from(new Set([...prev, ...selectedMessageIds])));

        const supabase = createClient();
        const { error } = await supabase.from("messages").delete().in("id", selectedMessageIds);
        if (error) {
            if (process.env.NODE_ENV !== "production") {
                console.error("[messages] delete for all failed", error);
            }
            return;
        }

        setDeleteConfirmOpen(false);
        exitSelectionMode();
    }, [canDeleteForAll, chat.id, exitSelectionMode, selectedMessageIds, userId]);

    const clearChatForMe = useCallback(async () => {
        if (!chat.id || !userId) return;

        const allIds = messages.map((m) => m.id).filter(Boolean);
        if (allIds.length === 0) return;

        setDeletedMessageIds((prev) => {
            const next = Array.from(new Set([...prev, ...allIds]));
            try {
                localStorage.setItem(`hidden:${userId}:${chat.id}`, JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });

        // Insert private system message that only I can see
        const now = new Date();
        const dateStr = now.toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' });
        const systemBody = `Vaciaste el chat ${dateStr}, ${timeStr}`;

        const supabase = createClient();
        const { error } = await supabase.from("messages").insert({
            conversation_id: chat.id,
            sender_id: userId,
            message_type: "system",
            body: systemBody,
        });

        if (error) {
            console.error("Failed to insert clear chat system message:", error);
        }

        setIsSelectionMode(false);
        setSelectedMessageIds([]);
        setDeleteConfirmOpen(false);
    }, [chat.id, messages, userId]);

    const clearChatForAll = useCallback(async () => {
        if (!chat.id) return;

        const allIds = messages.map((m) => m.id).filter(Boolean);
        if (allIds.length > 0) {
            setDeletedMessageIds((prev) => Array.from(new Set([...prev, ...allIds])));
        }

        const supabase = createClient();

        const { error } = await supabase.rpc("clear_chat_for_all", { p_conversation_id: chat.id });

        if (error) {
            console.error("[conversations] clear_chat_for_all failed", error);
        } else {
            console.log("[conversations] clear_chat_for_all success");
        }

        // Insert system message indicating who cleared the chat
        const now = new Date();
        const dateStr = now.toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' });
        const systemBody = `Chat vaciado por ${username} ${dateStr}, ${timeStr}`;

        await supabase.from("messages").insert({
            conversation_id: chat.id,
            sender_id: userId,
            message_type: "system",
            body: systemBody,
        });

        setIsSelectionMode(false);
        setSelectedMessageIds([]);
        setDeleteConfirmOpen(false);
        setClearConfirmOpen(false);
    }, [chat.id, messages, userId, username]);

    return {
        isSelectionMode,
        setIsSelectionMode,
        selectedMessageIds,
        setSelectedMessageIds,
        deletedMessageIds,
        deleteConfirmOpen,
        setDeleteConfirmOpen,
        clearConfirmOpen,
        setClearConfirmOpen,
        deleteAlsoFromDevice,
        setDeleteAlsoFromDevice,
        toggleMessageSelection,
        exitSelectionMode,
        requestDeleteSelectedMessages,
        confirmDeleteForMe,
        canDeleteForAll,
        confirmDeleteForAll,
        clearChatForMe,
        clearChatForAll,
    };
}
