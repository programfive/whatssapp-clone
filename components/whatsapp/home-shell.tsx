"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { IconSidebar } from "./icon-sidebar";
import { ChatListPanel } from "./chat-list-panel";
import { ChatViewPanel } from "./chat-view-panel";
import { StatusPanel, StatusViewer, type StatusSummary, getProfileName, getInitials } from "./status-panel";
import { useStatuses, type StatusRecord } from "./hooks/use-statuses";
import { SettingsPanel } from "./settings-panel";
import { ProfilePanel } from "./profile-panel";
import { PeoplePanel } from "./people-panel";
import { createClient } from "@/lib/supabase/client";
import type { ChatPreview } from "./types";
import { Clock, Clock1, Clock10, Download, Lock } from "lucide-react";
import { MessageHome } from "../icons/message-home";
import { WallpaperModal, type WallpaperOption } from "./wallpaper-modal";
import { AuthenticationShell } from "./authentication-shell";

type ChatSummaryRow = {
  conversation_id: string;
  title: string | null;
  last_message: string | null;
  last_time: string | null;
  unread_count: number | null;
  last_read_at: string | null;
  is_group: boolean | null;
  photo_url: string | null;
  last_message_id: string | null;
  message_type: string | null;
  media_name: string | null;
  last_reaction_user: string | null;
  last_reaction_emoji: string | null;
  last_message_sender_id: string | null;
};

type MessagesInsertPayload = {
  new: {
    conversation_id: string;
    body: string | null;
    message_type?: string | null;
    media_name?: string | null;
    created_at: string;
    sender_id: string;
  };
};

type ConversationMembersInsertPayload = {
  new: {
    conversation_id: string;
    user_id: string;
  };
};

type ConversationMembersDeletePayload = {
  old: {
    conversation_id: string;
    user_id: string;
  };
};

function lastReadStorageKey(userId: string) {
  return `wa:last_read_at:${userId}`;
}

function getLocalLastReadAt(userId: string, conversationId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lastReadStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[conversationId] ?? null;
  } catch {
    return null;
  }
}

function setLocalLastReadAt(userId: string, conversationId: string, iso: string) {
  if (typeof window === "undefined") return;
  try {
    const key = lastReadStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    const parsed = (raw ? (JSON.parse(raw) as Record<string, string>) : {}) as Record<string, string>;
    parsed[conversationId] = iso;
    window.localStorage.setItem(key, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function getContactCountFromBody(body: string): number {
  try {
    const parsed = JSON.parse(body) as { contacts?: unknown };
    if (!parsed || typeof parsed !== "object") return 0;
    const contacts = (parsed as { contacts?: unknown }).contacts;
    if (!Array.isArray(contacts)) return 0;
    return contacts.length;
  } catch {
    return 0;
  }
}

function looksLikePollBody(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as {
      question?: unknown;
      options?: unknown;
      allowMultiple?: unknown;
    };
    if (!parsed || typeof parsed !== "object") return false;
    const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
    const options = Array.isArray(parsed.options) ? parsed.options : [];
    if (!question) return false;
    if (options.length < 2) return false;
    return true;
  } catch {
    return false;
  }
}

function formatLastMessage(input: {
  body: string | null | undefined;
  messageType?: string | null | undefined;
  mediaName?: string | null | undefined;
  senderId?: string | null | undefined;
  currentUserId?: string | null | undefined;
}): string {
  const body = (input.body ?? "").trim();
  const messageType = (input.messageType ?? "").trim().toLowerCase();

  if (messageType === "poll") {
    try {
      const parsed = JSON.parse(body);
      return parsed.question ? `Encuesta: ${parsed.question}` : "Encuesta";
    } catch {
      return "Encuesta";
    }
  }

  if (messageType === "contact") {
    const count = getContactCountFromBody(body);
    if (count >= 2) return `${count} contactos`;
    return "Contacto";
  }

  if (messageType === "document") {
    const name = (input.mediaName ?? "").trim();
    return name ? `Documento: ${name}` : "Documento";
  }

  if (messageType === "image") return "Foto";
  if (messageType === "video") return "Video";
  if (messageType === "audio") return "Audio";

  if (messageType === "status_reply") {
    try {
      const parsed = JSON.parse(body);
      const text = parsed.replyText || "";
      const isMe = input.senderId && input.currentUserId && input.senderId === input.currentUserId;
      const prefix = isMe ? "Respondiste a un estado" : "Respondió a un estado";
      return text ? `${prefix}: ${text}` : prefix;
    } catch {
      return "Respondió a un estado";
    }
  }

  // Fallbacks for initial load (RPC only returns body)
  if (looksLikePollBody(body)) {
    try {
      const parsed = JSON.parse(body);
      return parsed.question ? `Encuesta: ${parsed.question}` : "Encuesta";
    } catch {
      return "Encuesta";
    }
  }

  const contactCount = getContactCountFromBody(body);
  if (contactCount > 0) {
    if (contactCount >= 2) return `${contactCount} contactos`;
    return "Contacto";
  }

  return body;
}

export function WhatsAppHomeShell() {
  const [section, setSection] = useState<
    "chats" | "people" | "status" | "settings" | "profile"
  >("chats");
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [activeSummary, setActiveSummary] = useState<StatusSummary | null>(null);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperOption>({
    id: "default",
    name: "Predeterminado",
    type: "pattern",
    value: "default",
  });

  const { groups, reload: reloadStatuses, markAsViewed } = useStatuses(userId || null);

  const allSummaries = useMemo(() => {
    const map = new Map<string, StatusRecord[]>();
    const buckets = [...groups.own, ...groups.recent, ...groups.seen];
    for (const item of buckets) {
      if (!map.has(item.user_id)) {
        map.set(item.user_id, []);
      }
      map.get(item.user_id)?.push(item);
    }
    const summaries: StatusSummary[] = [];
    for (const [id, statuses] of map.entries()) {
      statuses.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const name = getProfileName(statuses[0]);
      summaries.push({
        userId: id,
        name,
        avatarUrl: (statuses[0] as any)?.profiles?.avatar_url ?? null,
        initials: getInitials(name),
        latestTime: statuses[statuses.length - 1]?.created_at ?? "",
        statuses,
        hasNew: groups.recent.some((s) => s.user_id === id),
      });
    }
    return summaries;
  }, [groups]);

  const findStatusSummary = useCallback((targetUserId: string | null | undefined, name: string | null | undefined) => {
    if (!allSummaries || allSummaries.length === 0) return undefined;

    // First try by ID (most precise)
    let found = allSummaries.find(s => targetUserId && String(s.userId) === String(targetUserId));

    // Fallback: try by name for individual chats (case insensitive)
    if (!found && name) {
      const searchName = name.trim().toLowerCase();
      found = allSummaries.find(s => s.name?.trim().toLowerCase() === searchName);
    }

    return found;
  }, [allSummaries]);

  const handleOpenStatus = useCallback((summary: StatusSummary) => {
    setActiveSummary(summary);
    if (summary.userId !== userId) {
      summary.statuses.forEach(s => markAsViewed(s.id));
    }
  }, [userId, markAsViewed]);

  const [profileFullName, setProfileFullName] = useState<string>("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileInitials, setProfileInitials] = useState<string>('');

  const profileInitialsMemo = useMemo(() => {
    const v = (profileFullName || "").trim();
    if (!v) return "?";
    const parts = v.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "?";
    const second = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
    return `${first}${second}`;
  }, [profileFullName]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;

      if (!active) return;
      setUserId(uid);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, settings")
        .eq("id", uid)
        .maybeSingle();

      if (!active) return;
      setProfileFullName(data?.full_name ?? "");
      setProfileAvatarUrl(data?.avatar_url ?? null);

      if (data?.settings?.wallpaper) {
        setWallpaper(data.settings.wallpaper);
      }

      const nextUsername = (data?.full_name ?? "").trim() || userData.user?.email || "Yo";
      setUsername(nextUsername);

      // Using the new RPC that returns all needed fields
      const { data: summaries } = await supabase.rpc("get_chat_summaries");
      if (!active) return;
      const summaryRows = (summaries ?? []) as ChatSummaryRow[];
      const conversationIds = summaryRows.map((r) => r.conversation_id);

      const conversationMetadataMap = new Map<string, { isGroup: boolean; createdBy: string | null; disappearing: "off" | "24h" | "7d" | "90d" }>();
      if (conversationIds.length > 0) {
        const { data: conversationRows } = await supabase
          .from("conversations")
          .select("id, group_settings, is_group, created_by")
          .in("id", conversationIds);

        if (conversationRows) {
          for (const row of conversationRows) {
            const disappearing = row?.group_settings?.disappearing || "off";
            conversationMetadataMap.set(row.id, {
              isGroup: !!row.is_group,
              createdBy: row.created_by ?? null,
              disappearing
            });
          }
        }
      }

      let favoriteSet = new Set<string>();
      try {
        const { data: favoriteRows } = await supabase
          .from("user_favorite_conversations")
          .select("conversation_id")
          .eq("user_id", uid);

        if (favoriteRows) {
          favoriteSet = new Set(
            (favoriteRows ?? [])
              .map((r: { conversation_id: string | null }) => r.conversation_id)
              .filter(Boolean) as string[],
          );
        }
      } catch {
        // ignore
      }

      // For direct chats, we need to get the OTHER participant's name
      // Filter only direct chats (is_group = false)
      const directConversationIds = summaryRows
        .filter(r => !r.is_group)
        .map(r => r.conversation_id);

      // Fetch all conversation members for direct chats ONLY
      const { data: allMembers } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, profiles(full_name, email, avatar_url)")
        .in("conversation_id", directConversationIds);

      if (!active) return;

      // Build a map: conversationId -> { name, avatar, userId }
      const directChatDetails: Record<string, { name: string; avatarUrl: string | null; userId: string }> = {};

      for (const member of (allMembers ?? [])) {
        if (member.user_id !== uid) {
          const profile = member.profiles as { full_name: string | null; email: string | null; avatar_url: string | null } | null;
          const name = (profile?.full_name ?? "").trim() || (profile?.email ?? "").trim() || "Usuario";
          const rawAvatar = profile?.avatar_url;
          directChatDetails[member.conversation_id] = {
            name,
            avatarUrl: rawAvatar && rawAvatar.trim() ? rawAvatar : null,
            userId: member.user_id
          };
        }
      }

      const nextChats: ChatPreview[] = summaryRows.map((r) => {
        const serverLastReadAt = (r.last_read_at as string | null | undefined) ?? null;
        const localLastReadAt = uid ? getLocalLastReadAt(uid, r.conversation_id) : null;
        const effectiveLastReadAt =
          serverLastReadAt && localLastReadAt
            ? (new Date(serverLastReadAt) > new Date(localLastReadAt) ? serverLastReadAt : localLastReadAt)
            : (serverLastReadAt ?? localLastReadAt);

        // Determine the display name and avatar based on chat type
        let name: string = "Chat";
        let avatarUrl: string | null = null;

        if (r.is_group) {
          name = (r.title ?? "Grupo").trim() || "Grupo";
          avatarUrl = r.photo_url;
        } else {
          // Direct chat
          const details = directChatDetails[r.conversation_id];
          if (details) {
            name = details.name;
            avatarUrl = details.avatarUrl;
          } else {
            // Check if it's a chat with myself
            const myMember = (allMembers ?? []).find((m: any) => m.conversation_id === r.conversation_id && m.user_id === uid);
            if (myMember) {
              name = "Yo (Tú)";
            } else {
              name = "Usuario";
            }
            avatarUrl = data?.avatar_url ?? null;
          }
        }

        const avatarText = name[0]?.toUpperCase() ?? "?";
        const lastMessage = formatLastMessage({
          body: r.last_message,
          messageType: r.message_type,
          mediaName: r.media_name,
          senderId: r.last_message_sender_id,
          currentUserId: uid
        });

        const lastTime = r.last_time
          ? new Date(r.last_time).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
          : "";

        const shouldOverrideUnread =
          Boolean(localLastReadAt) &&
          (!r.last_time || new Date(localLastReadAt as string) >= new Date(r.last_time as string));

        return {
          id: r.conversation_id,
          name,
          lastMessage,
          lastMessageId: r.last_message_id ?? null,
          lastTime,
          avatarText,
          unreadCount: shouldOverrideUnread ? 0 : (r.unread_count ?? 0),
          lastReadAt: effectiveLastReadAt,
          favorite: favoriteSet.has(r.conversation_id),
          lastReactionUser: r.last_reaction_user ?? null,
          lastReactionEmoji: r.last_reaction_emoji ?? null,
          avatarUrl,
          contactUserId: r.is_group ? null : directChatDetails[r.conversation_id]?.userId ?? null,
          isGroup: conversationMetadataMap.get(r.conversation_id)?.isGroup ?? !!r.is_group,
          isCreator: conversationMetadataMap.get(r.conversation_id)?.createdBy === uid,
          disappearingSetting: conversationMetadataMap.get(r.conversation_id)?.disappearing ?? "off",
        };
      });

      setChats(nextChats);
      // keep no chat selected on initial load
    }

    void loadProfile().finally(() => {
      if (active) setIsLoadingChats(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleToggleFavorite = useCallback(
    async (chatId: string, nextFavorite: boolean) => {
      if (!userId || !chatId) return;
      const supabase = createClient();

      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, favorite: nextFavorite } : c)));

      if (nextFavorite) {
        const { error } = await supabase
          .from("user_favorite_conversations")
          .insert({ user_id: userId, conversation_id: chatId });
        if (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[favorites] insert failed", error);
          }
        }
        return;
      }

      const { error } = await supabase
        .from("user_favorite_conversations")
        .delete()
        .eq("user_id", userId)
        .eq("conversation_id", chatId);
      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[favorites] delete failed", error);
        }
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId || !selectedChatId) return;
    const supabase = createClient();

    const now = new Date().toISOString();

    void (async () => {
      const { error } = await supabase
        .from("conversation_members")
        .update({ last_read_at: now })
        .eq("user_id", userId)
        .eq("conversation_id", selectedChatId);

      if (error) return;

      setLocalLastReadAt(userId, selectedChatId, now);

      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChatId ? { ...c, unreadCount: 0, lastReadAt: now } : c,
        ),
      );
    })();
  }, [selectedChatId, userId]);

  const handleProfileUpdated = useCallback(
    (next: { fullName?: string; avatarUrl?: string | null }) => {
      if (typeof next.fullName === "string") setProfileFullName(next.fullName);
      if ("avatarUrl" in next) setProfileAvatarUrl(next.avatarUrl ?? null);
    },
    [],
  );

  const selectedChat = useMemo(
    () => (selectedChatId ? chats.find((c) => c.id === selectedChatId) ?? null : null),
    [chats, selectedChatId],
  );

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase.channel("presence:global", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    const syncOnline = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      const ids = Object.keys(state);
      setOnlineUserIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, syncOnline)
      .on("presence", { event: "join" }, syncOnline)
      .on("presence", { event: "leave" }, syncOnline)
      .subscribe(async (status: string) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`conversation_members:user:${userId}:delete`);

    channel
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${userId}`,
        },
        async (payload: ConversationMembersDeletePayload) => {
          const row = payload.old;
          const conversationId = row.conversation_id;
          if (!conversationId) return;

          setChats((prev) => prev.filter((c) => c.id !== conversationId));
          setSelectedChatId((prev) => (prev === conversationId ? "" : prev));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`messages:sidebar:${userId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload: MessagesInsertPayload) => {
          const row = payload.new;

          if (!row.conversation_id) return;

          setChats((prev) => {
            const idx = prev.findIndex((c) => c.id === row.conversation_id);
            if (idx === -1) return prev;

            const next = [...prev];
            const current = next[idx];
            const lastTime = row.created_at
              ? new Date(row.created_at).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })
              : current.lastTime;

            const isActiveChat = selectedChatId === row.conversation_id;
            const nextUnread = isActiveChat
              ? 0
              : Math.max(0, (current.unreadCount ?? 0) + (row.sender_id === userId ? 0 : 1));

            next[idx] = {
              ...current,
              lastMessage: formatLastMessage({
                body: row.body,
                messageType: row.message_type,
                mediaName: row.media_name,
                senderId: row.sender_id,
                currentUserId: userId
              }),
              lastTime,
              unreadCount: nextUnread,
            };

            if (isActiveChat) {
              const now = new Date().toISOString();
              void supabase
                .from("conversation_members")
                .update({ last_read_at: now })
                .eq("user_id", userId)
                .eq("conversation_id", row.conversation_id);

              setLocalLastReadAt(userId, row.conversation_id, now);

              next[idx] = {
                ...next[idx],
                lastReadAt: now,
              };
            }

            // Move updated chat to top
            return [next[idx], ...next.filter((_, i) => i !== idx)];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId, userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`reactions:sidebar:${userId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        async (payload: any) => {
          const eventType = payload.eventType;
          const newRow = payload.new;
          const oldRow = payload.old;

          const messageId = newRow?.message_id || oldRow?.message_id;
          if (!messageId) return;

          if (eventType === 'INSERT') {
            const { data: userData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newRow.user_id)
              .single();

            const userName = (userData?.full_name ?? 'Alguien').trim() || 'Alguien';
            const emoji = newRow.emoji;

            setChats(prev => prev.map(c => {
              if (c.lastMessageId === messageId) {
                return {
                  ...c,
                  lastReactionUser: userName,
                  lastReactionEmoji: emoji
                }
              }
              return c;
            }));
          } else if (eventType === 'DELETE') {
            const { data: latest } = await supabase
              .from('message_reactions')
              .select('emoji, user_id, profiles(full_name)')
              .eq('message_id', messageId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            setChats(prev => prev.map(c => {
              if (c.lastMessageId === messageId) {
                if (latest) {
                  const uName = (latest.profiles?.full_name ?? 'Alguien').trim() || 'Alguien';
                  return { ...c, lastReactionUser: uName, lastReactionEmoji: latest.emoji };
                } else {
                  return { ...c, lastReactionUser: null, lastReactionEmoji: null };
                }
              }
              return c;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase.channel(`conversation_members:user:${userId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${userId}`,
        },
        async (payload: ConversationMembersInsertPayload) => {
          const row = payload.new;
          const conversationId = row.conversation_id;
          if (!conversationId) return;

          const { data } = await supabase
            .from("conversations")
            .select("id, title, is_group")
            .eq("id", conversationId)
            .maybeSingle();

          if (!data?.id) return;

          let name: string;
          let avatarUrl: string | null = null;
          if (data.is_group) {
            // For groups, use the stored title
            name = (data.title ?? "Grupo").trim() || "Grupo";
          } else {
            // For direct chats, fetch the OTHER participant's name
            // Add a small delay to ensure both members are inserted
            await new Promise(resolve => setTimeout(resolve, 100));

            const { data: members, error: membersError } = await supabase
              .from("conversation_members")
              .select("user_id, profiles(full_name, email, avatar_url)")
              .eq("conversation_id", conversationId)
              .neq("user_id", userId);

            if (members && members.length > 0) {
              const otherMember = members[0];
              const profile = otherMember.profiles as { full_name: string | null; email: string | null; avatar_url: string | null } | null;
              name = (profile?.full_name ?? "").trim() || (profile?.email ?? "").trim() || "Usuario";
              avatarUrl = profile?.avatar_url ?? null;
            } else {
              name = (data.title ?? "").trim() || "Usuario";
            }
          }

          const avatarText = name[0]?.toUpperCase() ?? "?";

          setChats((prev) => {
            if (prev.some((c) => c.id === data.id)) return prev;
            return [
              {
                id: data.id,
                name,
                lastMessage: "",
                lastTime: "",
                avatarText,
                avatarUrl,
              },
              ...prev,
            ];
          });

          setSelectedChatId((prev) => prev || data.id);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleStartChat = useCallback(
    (next: { conversationId: string; title: string; avatarUrl?: string | null }) => {
      // The title parameter already contains the correct name (other participant's name for direct chats)
      const name = (next.title ?? "Usuario").trim() || "Usuario";
      const avatarText = name[0]?.toUpperCase() ?? "?";

      setChats((prev) => {
        if (prev.some((c) => c.id === next.conversationId)) return prev;
        return [
          {
            id: next.conversationId,
            name,
            lastMessage: "",
            lastTime: "",
            avatarText,
            avatarUrl: next.avatarUrl ?? null,
          },
          ...prev,
        ];
      });

      setSelectedChatId(next.conversationId);
      setSection("chats");
    },
    [],
  );

  const handleOpenContactChat = useCallback(
    async (contact: { id: string; fullName: string }) => {
      if (!userId) return;
      const supabase = createClient();

      // For direct chats, we pass NULL as title so it's determined dynamically based on the other participant
      const { data, error } = await supabase.rpc("create_direct_conversation", {
        p_other_user_id: contact.id,
        p_title: null, // NULL for direct chats - names are determined dynamically
      });

      if (error) {
        console.error("handleOpenContactChat error", error);
        return;
      }

      const conversationId = data as string;
      if (!conversationId) return;

      // Use the contact's name for display (this is just for the local UI state)
      const title = (contact.fullName ?? "Usuario").trim() || "Usuario";
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", contact.id)
        .maybeSingle();
      const avatarUrl = profileData?.avatar_url ?? null;
      handleStartChat({ conversationId, title, avatarUrl });
    },
    [handleStartChat, userId],
  );

  const handleDeleteChat = useCallback(
    async (chatId: string, opts?: { isGroup: boolean; isCreator: boolean }) => {
      if (!userId || !chatId) return;
      const supabase = createClient();

      const chat = chats.find((c) => c.id === chatId);
      const isGroup = opts?.isGroup ?? chat?.isGroup ?? false;
      const isCreator = opts?.isCreator ?? chat?.isCreator ?? false;

      if (isGroup) {
        if (!isCreator) return;
        const { error } = await supabase.from("conversations").delete().eq("id", chatId);
        if (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[chat] delete conversation failed", error);
          }
          return;
        }
      } else {
        const { error } = await supabase
          .from("conversation_members")
          .delete()
          .eq("conversation_id", chatId)
          .eq("user_id", userId);
        if (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[chat] leave conversation failed", error);
          }
          return;
        }
      }

      setChats((prev) => prev.filter((c) => c.id !== chatId));
      setSelectedChatId((prev) => (prev === chatId ? "" : prev));
    },
    [userId, username],
  );

  const handleLeaveGroup = useCallback(
    async (chatId: string) => {
      if (!userId || !chatId) return;
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const email = (userData.user?.email ?? '').trim();
      const displayName = (username ?? '').trim() || email.split('@')[0] || 'Usuario';
      const who = email ? `${displayName} (${email})` : displayName;

      await supabase.from('messages').insert({
        conversation_id: chatId,
        sender_id: userId,
        body: `${who} se salió del grupo`,
        message_type: 'system',
      });

      const { error } = await supabase
        .from("conversation_members")
        .delete()
        .eq("conversation_id", chatId)
        .eq("user_id", userId);

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[chat] leave group failed", error);
        }
        return;
      }

      setChats((prev) => prev.filter((c) => c.id !== chatId));
      setSelectedChatId((prev) => (prev === chatId ? "" : prev));
    },
    [userId, username],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!userId) return;

    // Find chats that need updating
    const unreadIds = chats
      .filter((c) => (c.unreadCount ?? 0) > 0)
      .map((c) => c.id);

    if (unreadIds.length === 0) return;

    const supabase = createClient();
    const now = new Date().toISOString();

    // 1. Optimistic UI update
    setChats((prev) =>
      prev.map((c) => {
        if ((c.unreadCount ?? 0) > 0) {
          return { ...c, unreadCount: 0, lastReadAt: now };
        }
        return c;
      })
    );

    // 2. Update local storage (for persistence across reloads/offline)
    for (const id of unreadIds) {
      setLocalLastReadAt(userId, id, now);
    }

    // 3. Update Database
    const { error } = await supabase
      .from("conversation_members")
      .update({ last_read_at: now })
      .eq("user_id", userId)
      .in("conversation_id", unreadIds);

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[mark-all-read] failed", error);
      }
    }
  }, [chats, userId]);

  const handleBulkDelete = useCallback(
    async (chatIds: string[], opts: { forAll: boolean }) => {
      if (!userId || chatIds.length === 0) return;
      const supabase = createClient();

      if (opts.forAll) {
        // Delete conversations (destroy groups)
        const { error } = await supabase.from("conversations").delete().in("id", chatIds);
        if (error && process.env.NODE_ENV !== "production") {
          console.error("[bulk-delete] all failed", error);
        }
      } else {
        // Leave conversations (remove member)
        const { error } = await supabase
          .from("conversation_members")
          .delete()
          .eq("user_id", userId)
          .in("conversation_id", chatIds);
        if (error && process.env.NODE_ENV !== "production") {
          console.error("[bulk-delete] me failed", error);
        }
      }

      setChats((prev) => prev.filter((c) => !chatIds.includes(c.id)));
      if (chatIds.includes(selectedChatId)) setSelectedChatId("");
    },
    [selectedChatId, userId],
  );

  const handleBulkClear = useCallback(
    async (chatIds: string[], opts: { forAll: boolean }) => {
      if (!userId || chatIds.length === 0) return;
      const supabase = createClient();

      if (opts.forAll) {
        // Clear for everyone: update cleared_at timestamp on conversations
        const now = new Date().toISOString();
        await supabase.from("conversations").update({ cleared_at: now }).in("id", chatIds);
        const { error } = await supabase.from("messages").delete().in("conversation_id", chatIds);
        if (error && process.env.NODE_ENV !== "production") console.error("bulk clear all failed", error);
      } else {
        // Clear for me: Hide messages in LocalStorage mirroring 'existing logic'
        const { data: messages } = await supabase
          .from("messages")
          .select("id, conversation_id")
          .in("conversation_id", chatIds);

        if (!messages) return;

        const byChat: Record<string, string[]> = {};
        for (const m of messages) {
          if (!byChat[m.conversation_id]) byChat[m.conversation_id] = [];
          byChat[m.conversation_id].push(m.id);
        }

        for (const chatId of Object.keys(byChat)) {
          try {
            const key = `hidden:${userId}:${chatId}`;
            const raw = localStorage.getItem(key);
            const prev = raw ? (JSON.parse(raw) as string[]) : [];
            const next = Array.from(new Set([...prev, ...byChat[chatId]]));
            localStorage.setItem(key, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
      }
    },
    [userId]
  );

  const handleWallpaperConfirm = useCallback(async (selected: WallpaperOption) => {
    setWallpaper(selected);
    if (!userId) return;

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", userId)
      .single();

    const existingSettings = profile?.settings || {};
    await supabase
      .from("profiles")
      .update({
        settings: {
          ...existingSettings,
          wallpaper: selected,
        },
      })
      .eq("id", userId);
  }, [userId]);

  if (!isLoadingChats && !userId) {
    return <AuthenticationShell mode="login" />;
  }

  return (
    <main className="h-[100svh] w-full bg-background">
      <div className="mx-auto flex h-full w-full max-w-[1400px] overflow-hidden rounded-none bg-whatsapp-carbon">
        <div className="flex h-full w-full overflow-hidden rounded-none pb-16 md:pb-0">
          <IconSidebar
            active={section}
            onNavigate={setSection}
            profileInitials={profileInitials}
            profileAvatarUrl={profileAvatarUrl}
          />

          {section === "status" ? (
            <StatusPanel
              userId={userId}
              profileInitials={profileInitials}
              profileAvatarUrl={profileAvatarUrl}
              profileName={profileFullName}
            />
          ) : section === "settings" ? (
            <SettingsPanel onOpenWallpaper={() => setIsWallpaperModalOpen(true)} />
          ) : section === "people" ? (
            <PeoplePanel userId={userId} onStartChat={handleStartChat} />
          ) : section === "profile" ? (
            <ProfilePanel onProfileUpdated={handleProfileUpdated} />
          ) : (
            <>
              <ChatListPanel
                chats={chats}
                selectedChatId={selectedChatId}
                onSelectChat={setSelectedChatId}
                userId={userId}
                onGroupCreated={handleStartChat}
                onMarkAllRead={handleMarkAllRead}
                onBulkDelete={handleBulkDelete}
                onBulkClear={handleBulkClear}
                allSummaries={allSummaries}
                onOpenStatus={handleOpenStatus}
                findStatusSummary={findStatusSummary}
                isLoading={isLoadingChats}
                onNavigateToPeople={() => setSection("people")}
                className={selectedChatId ? "hidden md:flex" : "flex"}
              />
              {selectedChat ? (
                <ChatViewPanel
                  chat={selectedChat}
                  userId={userId}
                  username={username}
                  onlineUserIds={onlineUserIds}
                  onBack={() => setSelectedChatId("")}
                  onOpenContactChat={handleOpenContactChat}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteChat={handleDeleteChat}
                  onLeaveGroup={handleLeaveGroup}
                  allSummaries={allSummaries}
                  onOpenStatus={handleOpenStatus}
                  statusSummary={findStatusSummary(selectedChat?.contactUserId, selectedChat?.name)}
                  wallpaper={wallpaper}
                  className={selectedChatId ? "flex" : "hidden md:flex"}
                />
              ) : (
                <div className="hidden min-w-0 flex-1 items-center justify-center  md:flex">
                  <div className="mx-auto w-full max-w-5xl px-8">
                    <div className="flex flex-col items-center gap-6  p-10 text-center  items-center justify-center text-center md:gap-12">
                      <MessageHome className="h-auto w-full max-w-[280px] drop-shadow-lg md:max-w-[320px]" />

                      <div className="w-full space-y-4">
                        <div>
                          <h2 className="text-3xl font-semibold text-whatsapp-text-primary">Descarga WhatsApp para Windows</h2>
                          <p className="mt-2 text-base text-whatsapp-text-muted">
                            Descarga la aplicación para Windows y haz llamadas, comparte pantalla y disfruta de una experiencia más rápida.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="inline-flex rounded-full bg-whatsapp-forest px-8 py-3 text-sm font-semibold text-white transition hover:bg-whatsapp-forest/90"
                        >
                          Descargar
                        </button>

                        <div className="text-sm flex gap-2 justify-center items-center  text-whatsapp-text-muted">
                          <Lock className="w-5 h-5" />
                          Tus mensajes personales están cifrados de extremo a extremo.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {activeSummary && (
        <StatusViewer
          summary={activeSummary}
          isOwn={activeSummary.userId === userId}
          currentUserId={userId}
          onClose={() => setActiveSummary(null)}
          onRefresh={reloadStatuses}
        />
      )}

      <WallpaperModal
        open={isWallpaperModalOpen}
        onOpenChange={setIsWallpaperModalOpen}
        currentValue={wallpaper.id}
        onConfirm={handleWallpaperConfirm}
      />
    </main>
  );
}
