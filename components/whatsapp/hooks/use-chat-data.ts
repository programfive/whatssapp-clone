import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatPreview } from "../types";

type ConversationMemberHeaderRow = {
    user_id: string | null;
    profiles: {
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
    } | null;
};

export function useChatData(chat: ChatPreview, userId: string, onlineUserIds: string[]) {
    const [otherUserId, setOtherUserId] = useState<string | null>(null);
    const [otherUserAvatarUrl, setOtherUserAvatarUrl] = useState<string | null>(null);
    const [isGroup, setIsGroup] = useState(false);
    const [groupPhotoUrl, setGroupPhotoUrl] = useState<string | null>(null);
    const [conversationCreatedBy, setConversationCreatedBy] = useState<string | null>(null);
    const [conversationCreatedByName, setConversationCreatedByName] = useState<string | null>(null);
    const [conversationCreatedAt, setConversationCreatedAt] = useState<string | null>(null);
    const [groupMembersLine, setGroupMembersLine] = useState<string>("");
    const [groupMemberCount, setGroupMemberCount] = useState<number>(0);
    const [localUnreadMarker, setLocalUnreadMarker] = useState<{
        lastReadAt: string | null;
        unreadCount: number;
    } | null>(null);

    useEffect(() => {
        const unread = chat.unreadCount ?? 0;
        if (unread > 0) {
            setLocalUnreadMarker({ lastReadAt: chat.lastReadAt ?? null, unreadCount: unread });
            return;
        }
        setLocalUnreadMarker(null);
    }, [chat.id, chat.lastReadAt, chat.unreadCount]);

    useEffect(() => {
        let active = true;

        const supabase = createClient();

        if (!chat.id || !userId) return;

        async function loadConversationHeaderData() {
            const { data: convo } = await supabase
                .from("conversations")
                .select("is_group, photo_url, created_by, created_at")
                .eq("id", chat.id)
                .maybeSingle();

            const { data: memberRows, error: memberJoinError } = await supabase
                .from("conversation_members")
                .select("user_id, profiles(full_name, email, avatar_url)")
                .eq("conversation_id", chat.id);

            if (!active) return;

            let typedRows = (memberRows ?? []) as ConversationMemberHeaderRow[];
            let memberIds = typedRows.map((r) => r.user_id).filter(Boolean) as string[];

            if (memberJoinError) {
                const { data: rawMemberRows } = await supabase
                    .from("conversation_members")
                    .select("user_id")
                    .eq("conversation_id", chat.id);

                if (!active) return;

                memberIds = (rawMemberRows ?? [])
                    .map((r: { user_id: string | null }) => r.user_id)
                    .filter(Boolean) as string[];

                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, full_name, email")
                    .in("id", memberIds);

                if (!active) return;

                const profileMap = new Map<
                    string,
                    { full_name: string | null; email: string | null; avatar_url: string | null }
                >();
                for (const p of profiles ?? []) {
                    profileMap.set(p.id, {
                        full_name: p.full_name ?? null,
                        email: p.email ?? null,
                        avatar_url: null,
                    });
                }

                typedRows = memberIds.map((id) => {
                    const prof = profileMap.get(id);
                    return {
                        user_id: id,
                        profiles: {
                            full_name: prof?.full_name ?? null,
                            email: prof?.email ?? null,
                            avatar_url: prof?.avatar_url ?? null,
                        },
                    };
                });
            }

            setGroupMemberCount(memberIds.length);

            const inferredIsGroup = memberIds.length > 2;
            setIsGroup(Boolean(convo?.is_group) || inferredIsGroup);
            const creatorId = convo?.created_by ?? null;
            setGroupPhotoUrl(convo?.photo_url ?? null);
            setConversationCreatedBy(creatorId);
            setConversationCreatedAt(convo?.created_at ?? null);

            // Determine other user ID for 1:1

            const other = memberIds.find((id) => id !== userId) ?? null;
            setOtherUserId(other);

            const otherAvatar =
                typedRows.find((r) => r.user_id && r.user_id !== userId)?.profiles?.avatar_url ?? null;
            setOtherUserAvatarUrl(otherAvatar);

            if (memberIds.length === 0) {
                setGroupMembersLine("");
                return;
            }

            const labels = typedRows
                .map((r) => {
                    const id = r.user_id;
                    if (!id) return null;
                    const name = (r.profiles?.full_name ?? "").trim();
                    const email = (r.profiles?.email ?? "").trim();
                    return { id, label: name || email || "Usuario" };
                })
                .filter(Boolean) as Array<{ id: string; label: string }>;

            const withoutMe = labels.filter((l) => l.id !== userId).map((l) => l.label);
            const toShow = (withoutMe.length > 0 ? withoutMe : labels.map((l) => l.label)).slice(0, 6);
            const suffix = withoutMe.length > 6 ? ` y ${withoutMe.length - 6} más` : "";
            setGroupMembersLine(toShow.join(", ") + suffix);

            if (creatorId) {
                const creatorRow = typedRows.find((row) => row.user_id === creatorId);
                const creatorLabel =
                    (creatorRow?.profiles?.full_name ?? "").trim() ||
                    (creatorRow?.profiles?.email ?? "").trim() ||
                    null;
                setConversationCreatedByName(creatorLabel);
            } else {
                setConversationCreatedByName(null);
            }
        }

        void loadConversationHeaderData();

        const channel = supabase.channel(`conversation_members:conversation:${chat.id}`);
        channel
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "conversation_members",
                    filter: `conversation_id=eq.${chat.id}`,
                },
                () => {
                    void loadConversationHeaderData();
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "conversation_members",
                    filter: `conversation_id=eq.${chat.id}`,
                },
                () => {
                    void loadConversationHeaderData();
                },
            )
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(channel);
        };
    }, [chat.id, userId]);

    const statusText = useMemo(() => {
        if (isGroup) return groupMembersLine || (groupMemberCount > 0 ? `${groupMemberCount} miembros` : "");
        if (!otherUserId) return "";
        return onlineUserIds.includes(otherUserId) ? "En línea" : "Desconectado";
    }, [groupMemberCount, groupMembersLine, isGroup, onlineUserIds, otherUserId]);

    const groupAvatarItems = useMemo(() => {
        const raw = groupMembersLine.trim();
        const parts = raw
            ? raw
                .split(",")
                .map((p) => p.trim())
                .filter(Boolean)
            : [];
        if (parts.length === 0) {
            const fallback = (chat.name ?? "").trim().split(/\s+/).filter(Boolean);
            return (fallback.length > 0 ? fallback : [chat.avatarText]).slice(0, 3).map((label) => ({ label }));
        }
        return parts.slice(0, 3).map((label) => ({ label }));
    }, [chat.avatarText, chat.name, groupMembersLine]);

    return {
        otherUserId,
        otherUserAvatarUrl,
        isGroup,
        groupPhotoUrl,
        conversationCreatedBy,
        conversationCreatedAt,
        conversationCreatedByName,
        groupMembersLine,
        groupMemberCount,
        localUnreadMarker,
        statusText,
        groupAvatarItems,
    };
}
