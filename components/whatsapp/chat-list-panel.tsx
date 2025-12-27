"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Search,
  Pin,
  BellOff,
  X,
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronRight,
  Smile,
  Trash2,
  Eraser,
  Check,
  Clock,
  Loader2,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import type { ChatPreview } from "./types";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ChatListOptionsMenu } from "./chat-list-options-menu";
import { GroupAvatar } from "./group-avatar";
import { MessagePlus } from "../icons/message-plus";
import { ClearChatDialog } from "./clear-chat-dialog";
import { DeleteChatsDialog } from "./delete-chats-dialog";
import type { StatusSummary } from "./status-panel";

const ENCRYPTION_NOTICE_TEXT =
  'Los mensajes y las llamadas están cifrados de extremo a extremo. Solo las personas en este chat pueden leerlos, escucharlos o compartirlos. Haz clic para obtener más información.';

type Props = {
  chats: ChatPreview[];
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  userId: string;
  onGroupCreated: (next: { conversationId: string; title: string }) => void;
  onMarkAllRead?: () => void;
  onBulkDelete?: (chatIds: string[], opts: { forAll: boolean }) => void;
  onBulkClear?: (chatIds: string[], opts: { forAll: boolean }) => void;
  allSummaries?: StatusSummary[];
  onOpenStatus?: (summary: StatusSummary) => void;
  findStatusSummary?: (targetUserId: string | null | undefined, name: string | null | undefined) => StatusSummary | undefined;
  isLoading?: boolean;
  onNavigateToPeople?: () => void;
  className?: string;
};

type PersonRow = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

type ProfileSelectRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export function ChatListPanel({
  chats,
  selectedChatId,
  onSelectChat,
  userId,
  onGroupCreated,
  onMarkAllRead,
  onBulkDelete,
  onBulkClear,
  allSummaries = [],
  onOpenStatus,
  findStatusSummary,
  isLoading = false,
  onNavigateToPeople,
  className,
}: Props) {
  const [tab, setTab] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all')
  const [query, setQuery] = useState('')
  const [isGroupOpen, setIsGroupOpen] = useState(false);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isCreatorByChatId, setIsCreatorByChatId] = useState<Record<string, boolean>>({});
  const [photoUrlByChatId, setPhotoUrlByChatId] = useState<Record<string, string | null>>({});
  const [groupStep, setGroupStep] = useState<1 | 2>(1);
  const [groupStep2View, setGroupStep2View] = useState<"main" | "temporales">("main");
  const [groupQuery, setGroupQuery] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [isGroupEmojiOpen, setIsGroupEmojiOpen] = useState(false);
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [disappearing, setDisappearing] = useState<"off" | "24h" | "7d" | "90d">("off");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [isGroupByChatId, setIsGroupByChatId] = useState<Record<string, boolean>>({});
  const [typingLabelByChatId, setTypingLabelByChatId] = useState<Record<string, string>>({});
  const typingTimersRef = useRef<Record<string, Record<string, ReturnType<typeof setTimeout>>>>({});
  const typingNamesRef = useRef<Record<string, string>>({});
  const typingChannelsRef = useRef<Record<string, ReturnType<ReturnType<typeof createClient>["channel"]> | null>>({});

  const selectedMemberIds = useMemo(
    () => Object.entries(selectedIds).filter(([, v]) => v).map(([k]) => k),
    [selectedIds],
  );

  const filteredPeople = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => {
      return (
        p.fullName.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [groupQuery, people]);

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase()
    return chats.filter((c) => {
      if (tab === 'unread' && !(c.unreadCount && c.unreadCount > 0)) return false
      if (tab === 'favorites' && !c.favorite) return false
      if (tab === 'groups' && !isGroupByChatId[c.id]) return false

      if (!q) return true
      return (
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q)
      )
    })
  }, [chats, isGroupByChatId, query, tab]);

  const emptyState = useMemo(() => {
    const hasQuery = Boolean(query.trim());
    if (hasQuery) {
      return {
        title: "No se encontraron chats",
        subtitle: "Prueba con otro nombre o mensaje.",
      };
    }

    if (tab === "favorites") {
      return {
        title: "No tienes chats favoritos",
        subtitle: "Marca un chat como favorito para verlo aquí.",
      };
    }

    if (tab === "unread") {
      return {
        title: "No hay chats sin leer",
        subtitle: "Cuando tengas mensajes nuevos, aparecerán aquí.",
      };
    }

    if (tab === "groups") {
      return {
        title: "No tienes grupos",
        subtitle: "Crea un grupo para empezar a chatear.",
      };
    }

    return {
      title: "No hay chats para mostrar",
      subtitle: "Crea un chat o espera a recibir un mensaje.",
    };
  }, [query, tab]);

  useEffect(() => {
    if (!isGroupOpen) return;
    let active = true;

    async function loadPeople() {
      if (!userId) return;
      setIsLoadingPeople(true);
      setGroupError(null);

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .neq("id", userId)
          .order("full_name", { ascending: true });
        if (error) throw error;

        if (!active) return;

        const rows = (data ?? []) as ProfileSelectRow[];
        const next: PersonRow[] = rows.map((p) => ({
          id: p.id,
          fullName: (p.full_name ?? "").trim() || "Usuario",
          email: (p.email ?? "").trim(),
          avatarUrl: p.avatar_url ?? null,
        }));
        setPeople(next);
      } catch (e: unknown) {
        if (!active) return;
        setGroupError(e instanceof Error ? e.message : "No se pudieron cargar usuarios");
      } finally {
        if (!active) return;
        setIsLoadingPeople(false);
      }
    }

    void loadPeople();

    return () => {
      active = false;
    };
  }, [isGroupOpen, userId]);

  useEffect(() => {
    let active = true;
    if (!userId) return;
    const chatIds = chats.map((c) => c.id).filter(Boolean);
    if (chatIds.length === 0) return;

    async function loadGroupFlags() {
      const supabase = createClient();
      const { data } = await supabase
        .from("conversations")
        .select("id, is_group, created_by, photo_url")
        .in("id", chatIds);

      if (!active) return;
      const nextGroup: Record<string, boolean> = {};
      const nextCreator: Record<string, boolean> = {};
      const nextPhoto: Record<string, string | null> = {};

      for (const row of data ?? []) {
        nextGroup[row.id] = Boolean(row.is_group);
        nextCreator[row.id] = row.created_by === userId;
        nextPhoto[row.id] = row.photo_url ?? null;
      }
      setIsGroupByChatId(nextGroup);
      setIsCreatorByChatId(nextCreator);
      setPhotoUrlByChatId(nextPhoto);
    }

    void loadGroupFlags();

    return () => {
      active = false;
    };
  }, [chats, userId]);

  const ensureTypingNames = useCallback(async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    const missing = unique.filter((id) => !typingNamesRef.current[id]);
    if (missing.length === 0) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", missing);
    if (error) return;

    for (const row of data ?? []) {
      const name = (row.full_name ?? "").trim();
      const email = (row.email ?? "").trim();
      typingNamesRef.current[row.id] = name || email || "Usuario";
    }
  }, []);

  const formatGroupTypingLabel = useCallback((names: string[]) => {
    const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    if (unique.length === 0) return "Escribiendo…";
    if (unique.length === 1) return `${unique[0]} está escribiendo…`;
    if (unique.length === 2) return `${unique[0]} y ${unique[1]} están escribiendo…`;
    return `${unique[0]}, ${unique[1]} y ${unique.length - 2} más están escribiendo…`;
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channels: Array<ReturnType<typeof supabase.channel>> = [];

    function recomputeLabel(conversationId: string, ch: ReturnType<typeof supabase.channel>) {
      const state = ch.presenceState() as Record<
        string,
        Array<{ user_id?: string; name?: string; typing?: boolean; typing_at?: number }>
      >;

      const now = Date.now();
      const typingUserIds: string[] = [];

      for (const entries of Object.values(state)) {
        for (const p of entries ?? []) {
          const id = p.user_id;
          if (!id || id === userId) continue;
          if (!p.typing) continue;
          const ts = typeof p.typing_at === "number" ? p.typing_at : 0;
          if (ts && now - ts > 4500) continue;
          typingUserIds.push(id);

          const incomingName = (p.name ?? "").trim();
          if (incomingName && (!typingNamesRef.current[id] || typingNamesRef.current[id] === "Usuario")) {
            typingNamesRef.current[id] = incomingName;
          }
        }
      }

      const uniqueIds = Array.from(new Set(typingUserIds));
      if (uniqueIds.length === 0) {
        setTypingLabelByChatId((prev) => {
          if (!prev[conversationId]) return prev;
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
        return;
      }

      if (!typingTimersRef.current[conversationId]) typingTimersRef.current[conversationId] = {};
      const heartbeatKey = "__presence__";
      const existing = typingTimersRef.current[conversationId][heartbeatKey];
      if (existing) clearTimeout(existing);
      typingTimersRef.current[conversationId][heartbeatKey] = setTimeout(() => {
        recomputeLabel(conversationId, ch);
      }, 1200);

      const isGroup = Boolean(isGroupByChatId[conversationId]);
      if (!isGroup) {
        const firstId = uniqueIds[0];
        const firstName = (firstId ? typingNamesRef.current[firstId] : "") ?? "";
        setTypingLabelByChatId((prev) => ({
          ...prev,
          [conversationId]: firstName ? `${firstName} está escribiendo…` : "Escribiendo…",
        }));
        void ensureTypingNames([firstId]).then(() => recomputeLabel(conversationId, ch));
        return;
      }

      const names = uniqueIds.map((id) => typingNamesRef.current[id] ?? "Usuario");
      setTypingLabelByChatId((prev) => ({ ...prev, [conversationId]: formatGroupTypingLabel(names) }));
      void ensureTypingNames(uniqueIds).then(() => recomputeLabel(conversationId, ch));
    }

    for (const chat of chats) {
      const conversationId = chat.id;
      if (!conversationId) continue;

      const ch = supabase.channel(`typing:${conversationId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      typingChannelsRef.current[conversationId] = ch;

      ch.on("presence", { event: "sync" }, () => recomputeLabel(conversationId, ch))
        .on("presence", { event: "join" }, () => recomputeLabel(conversationId, ch))
        .on("presence", { event: "leave" }, () => recomputeLabel(conversationId, ch))
        .subscribe(async (status: string) => {
          if (status !== "SUBSCRIBED") return;
          await ch.track({ user_id: userId, name: "", typing: false, typing_at: 0 });
          recomputeLabel(conversationId, ch);
        });

      channels.push(ch);
    }

    return () => {
      setTypingLabelByChatId({});
      for (const ch of channels) supabase.removeChannel(ch);
      typingChannelsRef.current = {};
      for (const convoTimers of Object.values(typingTimersRef.current)) {
        for (const t of Object.values(convoTimers)) clearTimeout(t);
      }
      typingTimersRef.current = {};
    };
  }, [chats, ensureTypingNames, formatGroupTypingLabel, isGroupByChatId, userId]);

  const closeGroup = useCallback(() => {
    setIsGroupOpen(false);
    setGroupStep(1);
    setGroupStep2View("main");
    setSelectedIds({});
  }, []);

  const selectedPeople = useMemo(() => {
    const selectedSet = new Set(selectedMemberIds);
    return people.filter((p) => selectedSet.has(p.id));
  }, [people, selectedMemberIds]);

  const toggleMember = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const createGroup = useCallback(async () => {
    if (!userId) return;
    const title = groupTitle.trim() || "Nuevo grupo";
    if (selectedMemberIds.length < 1) return;

    setIsCreating(true);
    setGroupError(null);
    try {
      const supabase = createClient();

      let photoUrl: string | null = null;
      if (groupPhotoFile) {
        const ext = groupPhotoFile.name.includes(".")
          ? groupPhotoFile.name.split(".").pop() || "bin"
          : "bin";
        const path = `avatar/${userId}/group/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, groupPhotoFile, {
            upsert: true,
            contentType: groupPhotoFile.type || undefined,
          });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        photoUrl = data.publicUrl;
      }

      const { data, error } = await supabase.rpc("create_group_conversation", {
        p_title: title,
        p_member_ids: selectedMemberIds,
        p_photo_url: photoUrl,
        p_group_settings: { disappearing },
      });
      if (error) throw error;
      const conversationId = data as string;

      const now = new Date();
      const stamp = now.toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      await supabase.from("messages").insert([
        {
          conversation_id: conversationId,
          sender_id: userId,
          body: `Nuevo grupo creado\n${stamp}`,
          message_type: "system",
        },
        {
          conversation_id: conversationId,
          sender_id: userId,
          body: ENCRYPTION_NOTICE_TEXT,
          message_type: "system",
        },
      ]);

      onGroupCreated({ conversationId, title });
      closeGroup();
    } catch (e: unknown) {
      setGroupError(e instanceof Error ? e.message : "No se pudo crear el grupo");
    } finally {
      setIsCreating(false);
    }
  }, [closeGroup, disappearing, groupPhotoFile, groupTitle, onGroupCreated, selectedMemberIds, userId]);

  const insertEmojiInGroupName = useCallback(
    (emoji: string) => {
      setGroupTitle((prev) => `${prev}${emoji}`);
    },
    [],
  );

  const selectGroupPhoto = useCallback((file: File | null) => {
    setGroupPhotoFile(file);
    setGroupPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (groupPhotoPreview) URL.revokeObjectURL(groupPhotoPreview);
    };
  }, [groupPhotoPreview]);

  useEffect(() => {
    return () => {
      if (groupPhotoPreview) URL.revokeObjectURL(groupPhotoPreview);
    };
  }, [groupPhotoPreview]);

  // Handlers for Selection Mode
  const handleChatClick = useCallback((chatId: string) => {
    if (isSelectionMode) {
      setSelectedChatIds(prev =>
        prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
      );
    } else {
      onSelectChat(chatId);
    }
  }, [isSelectionMode, onSelectChat]);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedChatIds([]);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedChatIds([]);
  }, []);

  const canActionForAll = useMemo(() => {
    if (selectedChatIds.length === 0) return false;
    // Must be ALL groups and I must be creator of ALL of them
    return selectedChatIds.every(id => isGroupByChatId[id] && isCreatorByChatId[id]);
  }, [selectedChatIds, isGroupByChatId, isCreatorByChatId]);

  const handleConfirmDeleteForMe = useCallback(() => {
    onBulkDelete?.(selectedChatIds, { forAll: false });
    setDeleteConfirmOpen(false);
    exitSelectionMode();
  }, [onBulkDelete, selectedChatIds, exitSelectionMode]);

  const handleConfirmDeleteForAll = useCallback(() => {
    onBulkDelete?.(selectedChatIds, { forAll: true });
    setDeleteConfirmOpen(false);
    exitSelectionMode();
  }, [onBulkDelete, selectedChatIds, exitSelectionMode]);

  const handleConfirmClearForMe = useCallback(() => {
    onBulkClear?.(selectedChatIds, { forAll: false });
    setClearConfirmOpen(false);
    exitSelectionMode();
  }, [onBulkClear, selectedChatIds, exitSelectionMode]);

  const handleConfirmClearForAll = useCallback(() => {
    onBulkClear?.(selectedChatIds, { forAll: true });
    setClearConfirmOpen(false);
    exitSelectionMode();
  }, [onBulkClear, selectedChatIds, exitSelectionMode]);

  return (
    <section
      className={cn(
        "relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-white border-r border-border dark:bg-[#161717] md:w-[420px] md:shrink-0",
        className,
      )}
    >
      <header className="flex items-center justify-between px-4 py-3 min-h-[64px]">
        {isSelectionMode ? (
          <div className="flex w-full items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-4">
              <button onClick={exitSelectionMode} className="text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel rounded-full p-2">
                <X className="h-5 w-5" />
              </button>
              <span className="font-semibold text-lg">{selectedChatIds.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setClearConfirmOpen(true)}
                disabled={selectedChatIds.length === 0}
                className="p-2 text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel rounded-full disabled:opacity-50"
                title="Vaciar chats"
              >
                <Eraser className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={selectedChatIds.length === 0}
                className="p-2 text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel rounded-full disabled:opacity-50"
                title="Eliminar chats"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-whatsapp-text-primary">
              WhatsApp
            </h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigateToPeople?.()}
                className="grid h-10 w-10 place-items-center rounded-full  text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                aria-label="Nuevo chat"
              >
                <MessagePlus className="h-6 w-6" />
              </button>
              <ChatListOptionsMenu
                onNewGroup={() => setIsGroupOpen(true)}
                onMarkAllRead={onMarkAllRead}
                onEnterSelectionMode={enterSelectionMode}
              />
            </div>
          </>
        )}
      </header>

      <div className="px-4 pb-3">
        <div className="flex h-11 items-center gap-2 rounded-xl bg-whatsapp-panel px-3 text-whatsapp-text-muted">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full w-full bg-transparent text-sm text-whatsapp-text-primary outline-none placeholder:text-whatsapp-text-muted"
            placeholder={tab === 'favorites' ? 'Buscar chats favoritos' : 'Pregunta a Meta AI o busca'}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <Pill active={tab === 'all'} onClick={() => setTab('all')}>Todos</Pill>
          <Pill active={tab === 'unread'} onClick={() => setTab('unread')}>No leídos</Pill>
          <Pill active={tab === 'favorites'} onClick={() => setTab('favorites')}>Favoritos</Pill>
          <Pill active={tab === 'groups'} onClick={() => setTab('groups')}>Grupos</Pill>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-2 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel">
                  <div className="relative">
                    <Skeleton className="h-12 w-12 rounded-full bg-black/5 dark:bg-white/10" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24 bg-black/5 dark:bg-white/10" />
                      <Skeleton className="h-3 w-12 bg-black/5 dark:bg-white/10" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-48 bg-black/5 dark:bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-sm font-semibold text-whatsapp-text-primary">
                {emptyState.title}
              </div>
              <div className="mt-1 text-sm text-whatsapp-text-muted">{emptyState.subtitle}</div>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const resolvedPhotoUrl = photoUrlByChatId[chat.id] ?? chat.avatarUrl ?? null

              return (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  selected={chat.id === selectedChatId}
                  onClick={() => handleChatClick(chat.id)}
                  typingLabel={typingLabelByChatId[chat.id]}
                  isGroup={isGroupByChatId[chat.id]}
                  selectionMode={isSelectionMode}
                  isSelected={selectedChatIds.includes(chat.id)}
                  photoUrl={resolvedPhotoUrl}
                  statusSummary={findStatusSummary ? findStatusSummary(chat.contactUserId, chat.name) : allSummaries.find(s =>
                    (chat.contactUserId && s.userId === chat.contactUserId) ||
                    (s.userId === chat.id)
                  )}
                  onOpenStatus={onOpenStatus}
                  disabled={isSelectionMode && chat.contactUserId === userId}
                />
              )
            })
          )}
        </div>
      </ScrollArea>

      {isGroupOpen ? (
        <div className="absolute inset-0 z-50 flex flex-col dark:bg-[#161717] bg-white">
          <div className="flex items-center gap-2  px-4 py-3">
            {groupStep === 2 ? (
              <button
                type="button"
                onClick={() => {
                  if (groupStep2View !== "main") {
                    setGroupStep2View("main");
                    return;
                  }
                  setGroupStep(1);
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                aria-label="Atrás"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={closeGroup}
                className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-whatsapp-text-primary">
                {groupStep === 1
                  ? "Añade miembros al grupo"
                  : groupStep2View === "temporales"
                    ? "Mensajes temporales"
                    : "Nuevo grupo"}
              </div>
            </div>
          </div>

          {groupStep === 1 ? (
            <>
              <div className="px-4 pb-4">
                <div className="rounded-2xl  bg-transparent px-3 py-2">
                  {selectedPeople.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedPeople.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => removeSelected(p.id)}
                          className="inline-flex items-center gap-2 rounded-full  px-3 py-1 text-xs text-whatsapp-text-primary"
                        >
                          <span className="flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full  text-[0.85rem] font-semibold">
                              {p.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.avatarUrl}
                                  alt={p.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (p.fullName[0] ?? '?').toUpperCase()
                              )}
                            </span>
                            <span className="max-w-[140px] truncate">{p.fullName}</span>
                          </span>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <input
                      value={groupQuery}
                      onChange={(e) => setGroupQuery(e.target.value)}
                      className="h-9 w-full bg-transparent text-sm text-whatsapp-text-primary outline-none placeholder:text-whatsapp-text-muted border-b border-white/20 focus:border-whatsapp-forest/70 transition-colors"
                      placeholder="Buscar por nombre o email"
                    />
                  </div>
                </div>
              </div>

              {groupError ? (
                <div className="px-4 pt-2 text-sm text-red-500">{groupError}</div>
              ) : null}

              <ScrollArea className="min-h-0 flex-1">
                <div className="px-2 pb-2">
                  {isLoadingPeople ? (
                    <div className="px-3 py-4 text-sm text-whatsapp-text-muted">Cargando…</div>
                  ) : null}

                  {!isLoadingPeople && filteredPeople.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-whatsapp-text-muted">
                      No se encontraron usuarios.
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3">
                    {filteredPeople.map((p) => {
                      const checked = Boolean(selectedIds[p.id]);

                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleMember(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleMember(p.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl  px-4 py-3 text-left transition-colors hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                          )}
                        >
                          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-whatsapp-carbon text-whatsapp-text-primary">
                            {p.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.avatarUrl}
                                alt="Avatar"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold">
                                {(p.fullName[0] ?? "?").toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-whatsapp-text-primary">
                              {p.fullName}
                            </div>
                            {p.email ? (
                              <div className="mt-1 truncate text-sm text-whatsapp-text-muted">
                                {p.email}
                              </div>
                            ) : null}
                          </div>

                          <div className="shrink-0">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleMember(p.id)}
                              className={cn(
                                "h-5 w-5 rounded-full border-2 border-white/20 bg-transparent transition-colors",
                                "data-[state=checked]:border-whatsapp-forest data-[state=checked]:bg-whatsapp-forest data-[state=checked]:text-white"
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>

              <div className="pointer-events-none absolute bottom-4 right-4">
                <button
                  type="button"
                  disabled={selectedMemberIds.length < 1}
                  onClick={() => setGroupStep(2)}
                  className={cn(
                    "pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-whatsapp-forest text-white shadow-lg",
                    "disabled:opacity-60",
                  )}
                  aria-label="Siguiente"
                >
                  <ArrowRight className="h-6 w-6" />
                </button>
              </div>
            </>
          ) : groupStep2View === "temporales" ? (
            <>
              <div className="px-4 pt-4">
                <div className="text-sm font-semibold text-whatsapp-text-primary">
                  Mensajes temporales
                </div>
                <div className="mt-1 text-sm text-whatsapp-text-muted">
                  Los mensajes nuevos desaparecen después del tiempo seleccionado.
                </div>
              </div>

              <div className="px-2 pt-4">
                <RadioRow
                  title="Desactivados"
                  active={disappearing === "off"}
                  onClick={() => setDisappearing("off")}
                />
                <RadioRow
                  title="24 horas"
                  active={disappearing === "24h"}
                  onClick={() => setDisappearing("24h")}
                />
                <RadioRow
                  title="7 días"
                  active={disappearing === "7d"}
                  onClick={() => setDisappearing("7d")}
                />
                <RadioRow
                  title="90 días"
                  active={disappearing === "90d"}
                  onClick={() => setDisappearing("90d")}
                />
              </div>

              <div className="mt-auto border-t border-whatsapp-glass p-4">
                <button
                  type="button"
                  onClick={() => setGroupStep2View("main")}
                  className="h-11 w-full rounded-xl bg-whatsapp-forest px-4 text-sm font-semibold text-white"
                >
                  Listo
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-4 pt-6">
                <div className="flex justify-center">
                  <label className="group relative grid h-40 w-40 cursor-pointer place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        selectGroupPhoto(f);
                      }}
                    />

                    {groupPhotoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={groupPhotoPreview}
                        alt="Grupo"
                        className="h-full w-full object-cover"
                      />
                    ) : null}

                    <div
                      className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center text-center text-white",
                        groupPhotoPreview ? "bg-black/40 opacity-0 group-hover:opacity-100" : "bg-black/40 opacity-100",
                      )}
                    >
                      <Camera className="h-7 w-7" />
                      <div className="mt-2 text-sm font-medium leading-tight">
                        Añadir
                        <br />
                        imagen del
                        <br />
                        grupo
                      </div>
                    </div>
                  </label>
                </div>

                <div className="mt-6 flex items-end gap-3 border-b-2 border-whatsapp-forest pb-2">
                  <input
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    className="h-9 w-full bg-transparent text-sm text-whatsapp-text-primary outline-none placeholder:text-whatsapp-text-muted"
                    placeholder="Asunto del grupo (opcional)"
                  />

                  <EmojiPicker
                    open={isGroupEmojiOpen}
                    onOpenChange={setIsGroupEmojiOpen}
                    onSelect={insertEmojiInGroupName}
                  >
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-muted hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
                      aria-label="Emojis"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                  </EmojiPicker>
                </div>
              </div>

              <div className="px-2 pt-8">
                <MenuRow
                  title="Mensajes temporales"
                  subtitle={
                    disappearing === "off"
                      ? "Desactivados"
                      : disappearing === "24h"
                        ? "24 horas"
                        : disappearing === "7d"
                          ? "7 días"
                          : "90 días"
                  }
                  onClick={() => setGroupStep2View("temporales")}
                />
              </div>

              {groupError ? (
                <div className="px-4 pt-2 text-sm text-red-500">{groupError}</div>
              ) : null}

              <div className="mt-auto border-t border-whatsapp-glass px-4 py-6">
                <button
                  type="button"
                  disabled={isCreating || selectedMemberIds.length < 1}
                  onClick={() => void createGroup()}
                  className={cn(
                    "mx-auto grid h-14 w-14 place-items-center rounded-full bg-whatsapp-forest text-white shadow-lg transition hover:bg-whatsapp-forest/90",
                    "disabled:opacity-60 disabled:hover:bg-whatsapp-forest"
                  )}
                  aria-label="Crear grupo"
                >
                  {isCreating ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Check className="h-7 w-7" />
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      ) : null}

      <SelectionDialogs
        deleteOpen={deleteConfirmOpen}
        onDeleteOpenChange={setDeleteConfirmOpen}
        clearOpen={clearConfirmOpen}
        onClearOpenChange={setClearConfirmOpen}
        count={selectedChatIds.length}
        canActionForAll={canActionForAll}
        onConfirmDeleteForMe={handleConfirmDeleteForMe}
        onConfirmDeleteForAll={handleConfirmDeleteForAll}
        onConfirmClearForMe={handleConfirmClearForMe}
        onConfirmClearForAll={handleConfirmClearForAll}
      />
    </section>
  );
}

function Pill({
  children,
  active,
  onClick,
  disabled,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "h-8 rounded-full px-3 text-xs font-medium transition-colors",
        active
          ? "bg-whatsapp-forest text-[#d9fdd3]"
          : "hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel border-border border text-whatsapp-text-muted hover:text-whatsapp-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function MenuRow({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-4 text-left hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
    >
      <div className="min-w-0">
        <div className="font-medium text-whatsapp-text-primary">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-sm text-whatsapp-text-muted">{subtitle}</div>
        ) : null}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-whatsapp-text-muted" />
    </button>
  );
}

function RadioRow({
  title,
  active,
  onClick,
}: {
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
    >
      <div className="font-medium text-whatsapp-text-primary">{title}</div>
      <div
        className={cn(
          "grid h-6 w-6 place-items-center rounded-full border-2 transition-colors",
          active
            ? "border-whatsapp-forest bg-whatsapp-forest text-white"
            : "border-whatsapp-text-muted/40 text-whatsapp-text-muted",
        )}
      >
        {active ? <Check className="h-3 w-3" /> : null}
      </div>
    </button>
  );
}

// Dialogs Rendering Helper relative to render root or inside main
function SelectionDialogs({
  deleteOpen,
  onDeleteOpenChange,
  clearOpen,
  onClearOpenChange,
  count,
  canActionForAll,
  onConfirmDeleteForMe,
  onConfirmDeleteForAll,
  onConfirmClearForMe,
  onConfirmClearForAll
}: any) {
  return (
    <>
      <DeleteChatsDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        count={count}
        canDeleteForAll={canActionForAll}
        onConfirmForMe={onConfirmDeleteForMe}
        onConfirmForAll={onConfirmDeleteForAll}
      />
      <ClearChatDialog
        open={clearOpen}
        onOpenChange={onClearOpenChange}
        canClearForAll={canActionForAll}
        onConfirmForMe={onConfirmClearForMe}
        onConfirmForAll={onConfirmClearForAll}
      />
    </>
  )
}

function ChatRow({
  chat,
  selected,
  onClick,
  typingLabel,
  isGroup,
  selectionMode,
  isSelected,
  photoUrl,
  statusSummary,
  onOpenStatus,
  disabled,
}: {
  chat: ChatPreview;
  selected: boolean;
  onClick: () => void;
  typingLabel?: string;
  isGroup?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  photoUrl?: string | null;
  statusSummary?: StatusSummary;
  onOpenStatus?: (summary: StatusSummary) => void;
  disabled?: boolean;
}) {
  const unread = chat.unreadCount ?? 0;

  const groupAvatarItems = useMemo(() => {
    if (photoUrl) {
      return [{ label: chat.name, src: photoUrl }];
    }
    const words = (chat.name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const labels = words.length > 0 ? words : [chat.avatarText];
    return labels.slice(0, 3).map((label) => ({ label }));
  }, [chat.avatarText, chat.name, photoUrl]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!disabled) onClick();
        }
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-forest/80",
        selectionMode
          ? isSelected
            ? "bg-[#F7F5F3] dark:bg-whatsapp-panel ring-1 ring-black/5 dark:ring-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
            : "bg-transparent hover:bg-[#F7F5F3]/80 dark:hover:bg-whatsapp-panel/70"
          : selected
            ? "bg-[#F7F5F3] dark:bg-whatsapp-panel"
            : "hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel",
        disabled && "opacity-50 cursor-default hover:bg-transparent dark:hover:bg-transparent"
      )}
    >
      {selectionMode ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          {!disabled && (
            <span
              aria-hidden
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border-2 transition-colors",
                isSelected
                  ? " bg-whatsapp-forest text-white "
                  : "border-white/20 text-transparent",
              )}
            >
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
      ) : isGroup ? (
        <div className="relative">
          <GroupAvatar items={groupAvatarItems} size="md" />
          {chat.disappearingSetting && chat.disappearingSetting !== "off" ? (
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gray-100 text-gray-900 dark:bg-[#111b21] dark:text-white ring-2 ring-white dark:ring-[#0b141a]">
              <Clock className="h-3 w-3" />
            </span>
          ) : null}
        </div>
      ) : (
        <div
          className="relative h-12 w-12 shrink-0 flex items-center justify-center cursor-pointer group/avatar"
          onClick={(e) => {
            if (statusSummary && onOpenStatus) {
              e.stopPropagation();
              onOpenStatus(statusSummary);
            }
          }}
        >
          {statusSummary && (
            <svg className="absolute inset-0 h-full w-full -rotate-90 transform">
              {statusSummary.statuses.map((s, i) => {
                const total = statusSummary.statuses.length;
                const gap = total > 1 ? 4 : 0;
                const angle = 360 / total;
                const dashArray = (2 * Math.PI * 22);
                const segmentLength = (dashArray / total) - gap;

                return (
                  <circle
                    key={s.id}
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke={statusSummary.hasNew ? "#25D366" : "#8696a0"}
                    strokeWidth="2.5"
                    strokeDasharray={`${segmentLength} ${dashArray - segmentLength}`}
                    strokeDashoffset={-(angle * i * dashArray / 360)}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
          )}
          <div className={cn(
            "relative h-10 w-10 overflow-hidden rounded-full bg-whatsapp-carbon transition-transform group-hover/avatar:scale-95",
            statusSummary && "ring-2 ring-transparent"
          )}>
            {chat.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chat.avatarUrl} alt={chat.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-semibold text-whatsapp-text-primary">
                {chat.avatarText}
              </div>
            )}
          </div>
          {chat.disappearingSetting && chat.disappearingSetting !== "off" ? (
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gray-100 text-gray-900 dark:bg-[#111b21] dark:text-white ring-2 ring-white dark:ring-[#0b141a]">
              <Clock className="h-3 w-3" />
            </span>
          ) : null}
        </div>
      )}

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium text-whatsapp-text-primary">
              {chat.name}
            </div>
          </div>
          <div className="shrink-0 text-xs text-whatsapp-text-muted">
            {chat.lastTime}
          </div>
        </div>
        <div className="mt-1  flex items-center justify-between gap-3">
          <div
            className={cn(
              "w-0 min-w-0 flex-1 pr-1 text-sm truncate",
              typingLabel ? "text-whatsapp-forest" : "text-whatsapp-text-muted",
            )}
          >
            {typingLabel ?? (chat.lastReactionEmoji ? `${chat.lastReactionUser || 'Alguien'} reaccionó ${chat.lastReactionEmoji}` : chat.lastMessage)}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {unread > 0 ? (
              <div className="grid h-5 min-w-[20px] place-items-center rounded-full bg-whatsapp-forest px-1.5 text-[11px] font-semibold leading-none text-white">
                {unread > 99 ? "99+" : unread}
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-whatsapp-text-muted">
              {chat.pinned ? <Pin className="h-4 w-4" /> : null}
              {chat.muted ? <BellOff className="h-4 w-4" /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
