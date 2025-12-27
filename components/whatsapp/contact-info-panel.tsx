"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, FileText, Search, UserPlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

type ProfileData = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  about: string | null;
};

type GroupMemberRow = {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  about: string | null;
};

type ConversationMemberSelectRow = {
  user_id: string;
  role: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    about: string | null;
  } | null;
};

type ContactRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  about: string | null;
};

type RawConversationMemberRow = {
  user_id: string | null;
  role: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  about: string | null;
};

type SupabaseClient = ReturnType<typeof createClient>;

async function fetchGroupMembersList(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<GroupMemberRow[]> {
  const { data: memberRows, error } = await supabase
    .from("conversation_members")
    .select("user_id, role, profiles(full_name, email, avatar_url, about)")
    .eq("conversation_id", conversationId);

  if (!error && memberRows) {
    return (memberRows as ConversationMemberSelectRow[]).map((r): GroupMemberRow => ({
      user_id: r.user_id as string,
      role: (r.role as string) ?? "member",
      full_name: r.profiles?.full_name ?? null,
      email: r.profiles?.email ?? null,
      avatar_url: r.profiles?.avatar_url ?? null,
      about: r.profiles?.about ?? null,
    }));
  }

  const { data: rawMembers } = await supabase
    .from("conversation_members")
    .select("user_id, role")
    .eq("conversation_id", conversationId);

  const rawMemberRows: RawConversationMemberRow[] = (rawMembers ?? []) as RawConversationMemberRow[];

  const memberIds = rawMemberRows.map((row) => row.user_id).filter((id): id is string => Boolean(id));

  let profiles: ProfileRow[] = [];
  if (memberIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, about")
      .in("id", memberIds);
    profiles = (profileRows ?? []) as ProfileRow[];
  }

  const profileMap = new Map<string, ProfileRow>();
  profiles.forEach((p) => {
    profileMap.set(p.id, {
      id: p.id,
      full_name: p.full_name ?? null,
      email: p.email ?? null,
      avatar_url: p.avatar_url ?? null,
      about: p.about ?? null,
    });
  });

  return rawMemberRows
    .map((row): GroupMemberRow | null => {
      if (!row.user_id) return null;
      const profile = profileMap.get(row.user_id);
      return {
        user_id: row.user_id,
        role: (row.role as string) ?? "member",
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        avatar_url: profile?.avatar_url ?? null,
        about: profile?.about ?? null,
      };
    })
    .filter((item): item is GroupMemberRow => Boolean(item));
}

type Props = {
  open: boolean;
  title?: string;
  showHeader?: boolean;
  conversationId: string;
  isGroup?: boolean;
  groupTitle?: string | null;
  groupPhotoUrl?: string | null;
  groupMembersLine?: string;
  groupMemberCount?: number;
  userId: string;
  contactUserId: string | null;
  addMemberTrigger?: number;
  className?: string;
  onClose: () => void;
  onOpenChatSearch?: () => void;
};

export function ContactInfoPanel({
  open,
  title = "Info. del contacto",
  showHeader = true,
  conversationId,
  isGroup = false,
  groupTitle = null,
  groupPhotoUrl = null,
  groupMembersLine = "",
  groupMemberCount = 0,
  userId,
  contactUserId,
  addMemberTrigger = 0,
  className,
  onClose,
  onOpenChatSearch,
}: Props) {
  const resolvedUserId = useMemo(() => {
    if (contactUserId) return contactUserId;
    return userId;
  }, [contactUserId, userId]);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [showGroupMemberSearch, setShowGroupMemberSearch] = useState(false);

  const [canAddMembers, setCanAddMembers] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [addMemberContacts, setAddMemberContacts] = useState<ContactRow[]>([]);
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<Record<string, boolean>>({});
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [addMemberTriggerSeen, setAddMemberTriggerSeen] = useState(0);

  useEffect(() => {
    if (!isGroup) return;
    if (!addMemberTrigger) return;
    if (addMemberTriggerSeen === addMemberTrigger) return;
    setAddMemberTriggerSeen(addMemberTrigger);
    setAddMemberOpen(true);
  }, [addMemberTrigger, addMemberTriggerSeen, isGroup]);

  const [mediaItems, setMediaItems] = useState<
    Array<{
      id: string;
      media_url: string;
      media_mime: string | null;
      media_name: string | null;
      media_size: number | null;
      created_at: string;
    }>
  >([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!open) return;
      if (!resolvedUserId) return;
      const supabase = createClient();

      if (!isGroup) {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url, phone, about")
          .eq("id", resolvedUserId)
          .maybeSingle();

        if (!active) return;
        if (error) {
          setProfile(null);
        } else {
          setProfile((data ?? null) as ProfileData | null);
        }
      } else {
        setProfile(null);

        const { data: convo } = await supabase
          .from("conversations")
          .select("created_by")
          .eq("id", conversationId)
          .maybeSingle();
        if (!active) return;
        setCanAddMembers((convo?.created_by ?? null) === userId);

        const members = await fetchGroupMembersList(supabase, conversationId);
        if (!active) return;
        members.sort((a, b) => {
          if (a.user_id === userId) return -1;
          if (b.user_id === userId) return 1;
          const an = (a.full_name ?? a.email ?? "").toLowerCase();
          const bn = (b.full_name ?? b.email ?? "").toLowerCase();
          return an.localeCompare(bn);
        });
        setGroupMembers(members);
      }

      if (!conversationId) return;
      const { data: mediaRows, error: mediaError } = await supabase
        .from("messages")
        .select("id, media_url, media_mime, media_name, media_size, created_at")
        .eq("conversation_id", conversationId)
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(60);

      if (!active) return;
      if (mediaError) {
        setMediaItems([]);
        return;
      }

      const next = (mediaRows ?? [])
        .map((r: any) => ({
          id: r.id as string,
          media_url: r.media_url as string,
          media_mime: (r.media_mime as string | null) ?? null,
          media_name: (r.media_name as string | null) ?? null,
          media_size: (r.media_size as number | null) ?? null,
          created_at: r.created_at as string,
        }))
        .filter((r: any) => Boolean(r.media_url));
      setMediaItems(next);
    }

    void load();

    return () => {
      active = false;
    };
  }, [conversationId, isGroup, open, resolvedUserId, userId]);

  useEffect(() => {
    if (!open) return;
    if (!isGroup) return;
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase.channel(`conversation_members:conversation:${conversationId}`);

    const refreshMembers = async () => {
      const members = await fetchGroupMembersList(supabase, conversationId);
      members.sort((a, b) => {
        if (a.user_id === userId) return -1;
        if (b.user_id === userId) return 1;
        const an = (a.full_name ?? a.email ?? "").toLowerCase();
        const bn = (b.full_name ?? b.email ?? "").toLowerCase();
        return an.localeCompare(bn);
      });
      setGroupMembers(members);
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void refreshMembers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void refreshMembers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isGroup, open, userId]);

  useEffect(() => {
    let active = true;

    async function loadAddMemberContacts() {
      if (!addMemberOpen) return;
      if (!isGroup) return;
      if (!conversationId) return;
      const supabase = createClient();

      const { data: memberRows } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (!active) return;

      const existing = new Set(
        (memberRows ?? [])
          .map((r: { user_id: string | null }) => r.user_id)
          .filter(Boolean) as string[],
      );

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, about")
        .order("full_name", { ascending: true })
        .limit(200);
      if (!active) return;
      const next = (data ?? [])
        .map((r: any) => ({
          id: r.id as string,
          full_name: (r.full_name as string | null) ?? null,
          email: (r.email as string | null) ?? null,
          avatar_url: (r.avatar_url as string | null) ?? null,
          about: (r.about as string | null) ?? null,
        }))
        .filter((r: any) => r.id !== userId && !existing.has(r.id));

      setAddMemberContacts(next);
    }

    void loadAddMemberContacts();

    return () => {
      active = false;
    };
  }, [addMemberOpen, conversationId, isGroup, userId]);

  const computedTitle = isGroup ? "Info. del grupo" : title;
  const name = isGroup
    ? ((groupTitle ?? "").trim() || "Grupo")
    : ((profile?.full_name ?? profile?.email ?? "").trim() || "Usuario");
  const phone = isGroup ? "" : (profile?.phone ?? "").trim();
  const about = isGroup ? "" : (profile?.about ?? "").trim();

  const filteredGroupMembers = useMemo(() => {
    const q = groupMemberQuery.trim().toLowerCase();
    if (!q) return groupMembers;
    return groupMembers.filter((m) => {
      const fullName = (m.full_name ?? "").toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });
  }, [groupMemberQuery, groupMembers]);

  const filteredAddContacts = useMemo(() => {
    const q = addMemberQuery.trim().toLowerCase();
    if (!q) return addMemberContacts;
    return addMemberContacts.filter((p) => {
      const n = (p.full_name ?? "").toLowerCase();
      const e = (p.email ?? "").toLowerCase();
      return n.includes(q) || e.includes(q);
    });
  }, [addMemberContacts, addMemberQuery]);

  const imageItems = useMemo(
    () => mediaItems.filter((m) => (m.media_mime ?? "").startsWith("image/")),
    [mediaItems]
  );
  const docItems = useMemo(
    () => mediaItems.filter((m) => !(m.media_mime ?? "").startsWith("image/")),
    [mediaItems]
  );

  const activeImage = useMemo(() => {
    if (imageItems.length === 0) return null
    const idx = Math.min(Math.max(viewerIndex, 0), imageItems.length - 1)
    return imageItems[idx] ?? null
  }, [imageItems, viewerIndex])

  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col border-l border-whatsapp-glass bg-white dark:bg-[#161717] text-whatsapp-text-primary",
        className,
      )}
    >
      {showHeader ? (
        <header className="flex items-center gap-3 border-b border-whatsapp-glass px-3 py-3 md:px-4">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-muted hover:bg-[#F7F5F3] dark:hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-sm  font-semibold">{computedTitle}</div>
        </header>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 pb-10">
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full bg-whatsapp-panel text-whatsapp-text-primary">
              {isGroup && groupPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={groupPhotoUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : !isGroup && profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-7xl font-bold opacity-30 uppercase select-none">
                  {name.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{name}</div>
              {phone ? (
                <div className="mt-1 text-sm text-whatsapp-text-muted">{phone}</div>
              ) : null}
              {isGroup && (groupMembersLine || groupMemberCount > 0) ? (
                <div className="mt-1 text-sm text-whatsapp-text-muted">
                  {groupMembersLine || `${groupMemberCount} miembros`}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            {isGroup ? (
              <section className="border-b border-border px-4 py-4">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAddMemberOpen(true)}
                    disabled={!canAddMembers}
                    className={cn(
                      "flex w-42 items-center flex-col justify-center gap-2 rounded-2xl border border-whatsapp-border-soft bg-whatsapp-carbon px-4 py-3 text-sm font-semibold text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel",
                      !canAddMembers ? "cursor-not-allowed opacity-50" : ""
                    )}
                  >
                    <UserPlus className="h-5 w-5 " />
                    <span>Añadir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenChatSearch) {
                        onOpenChatSearch();
                        return;
                      }
                      setShowGroupMemberSearch(true);
                      requestAnimationFrame(() => {
                        const el = document.getElementById("group-member-search");
                        if (el instanceof HTMLInputElement) el.focus();
                      });
                    }}
                    className="flex w-42 items-center flex-col justify-center gap-2 rounded-2xl border border-whatsapp-border-soft  px-4 py-3 text-sm font-semibold  hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                  >
                    <Search className="h-5 w-5 " />
                    <span>Buscar</span>
                  </button>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl bg-whatsapp-panel/40 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Archivos, enlaces y documentos</div>
                <div className="text-xs text-whatsapp-text-muted">{mediaItems.length}</div>
              </div>

              {mediaItems.length === 0 ? (
                <div className="mt-3 text-sm text-whatsapp-text-muted">No hay archivos en este chat.</div>
              ) : (
                <>
                  {imageItems.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {imageItems.slice(0, 6).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const idx = imageItems.findIndex((x) => x.id === m.id);
                            setViewerIndex(Math.max(0, idx));
                            setViewerOpen(true);
                          }}
                          className="cursor-pointer overflow-hidden rounded-xl"
                          aria-label="Abrir imagen"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.media_url}
                            alt={m.media_name ?? "Imagen"}
                            className="aspect-square w-full bg-whatsapp-panel object-cover transition-transform duration-200 hover:scale-[1.02]"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {docItems.length > 0 ? (
                    <div className={cn("mt-4 space-y-2", imageItems.length > 0 ? "" : "mt-4")}>
                      {docItems.slice(0, 5).map((m) => (
                        <a
                          key={m.id}
                          href={m.media_url}
                          download={m.media_name ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl bg-whatsapp-panel/60 px-3 py-2 hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                        >
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-black/10">
                            <FileText className="h-5 w-5 text-whatsapp-text-muted" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {m.media_name ?? "Documento"}
                            </div>
                            <div className="text-xs text-whatsapp-text-muted">{m.media_mime ?? "archivo"}</div>
                          </div>
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-black/10">
                            <Download className="h-5 w-5 text-whatsapp-text-muted" />
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {isGroup ? (
              <section className="rounded-2xl bg-whatsapp-panel/40 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Miembros</div>
                  <button
                    type="button"
                    onClick={() => setShowGroupMemberSearch((v) => !v)}
                    className="grid h-8 w-8 place-items-center rounded-full text-whatsapp-text-muted hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                    aria-label="Buscar miembros"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                {showGroupMemberSearch ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-whatsapp-forest bg-whatsapp-carbon px-3 py-2">
                      <Search className="h-4 w-4" />
                      <input
                        id="group-member-search"
                        value={groupMemberQuery}
                        onChange={(e) => setGroupMemberQuery(e.target.value)}
                        placeholder="Buscar un miembro"
                        className="w-full bg-transparent text-sm text-whatsapp-text-primary outline-none placeholder:text-whatsapp-text-muted"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  {filteredGroupMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-whatsapp-border-soft px-4 py-5 text-center text-sm text-whatsapp-text-muted">
                      No se encontraron miembros.
                    </div>
                  ) : (
                    filteredGroupMembers.map((m) => {
                      const memberName = ((m.full_name ?? m.email ?? "Usuario").trim() || "Usuario");
                      const subtitle = (m.user_id === userId ? "Tú" : (m.about ?? "").trim()) || (m.email ?? "");
                      const isAdmin = (m.role ?? "").toLowerCase() === "admin";
                      const initial = memberName.slice(0, 1).toUpperCase() || "U";

                      return (
                        <div
                          key={m.user_id}
                          className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel/60"
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-sm font-semibold">
                            {m.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.avatar_url} alt={memberName} className="h-full w-full object-cover" />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-whatsapp-text-primary">{memberName}</div>
                            {subtitle ? <div className="truncate text-xs text-whatsapp-text-muted">{subtitle}</div> : null}
                          </div>
                          {isAdmin ? (
                            <span className="rounded-full bg-whatsapp-forest/15 px-3 py-1 text-[11px] font-semibold text-whatsapp-text-green">
                              Admin. del grupo
                            </span>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            ) : null}

            {!isGroup ? (
              <section className="rounded-2xl bg-whatsapp-panel/40 px-4 py-4">
                <div className="text-xs font-medium text-whatsapp-text-muted">Info.</div>
                <div className="mt-2 text-sm text-whatsapp-text-primary">
                  {about || "¡Hola! Estoy usando WhatsApp."}
                </div>
              </section>
            ) : null}
          </div>
        </div>


      </ScrollArea>

      {addMemberOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-[680px] overflow-hidden rounded-3xl bg-background text-foreground shadow-2xl">
            <div className="flex items-center gap-3 border-b border-whatsapp-border-soft px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setAddMemberOpen(false);
                  setAddMemberQuery("");
                  setSelectedAddMemberIds({});
                }}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-lg font-semibold">Añadir miembro</div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 rounded-2xl border-2 border-whatsapp-forest px-4 py-3">
                <Search className="h-5 w-5" />
                <input
                  value={addMemberQuery}
                  onChange={(e) => setAddMemberQuery(e.target.value)}
                  placeholder="Buscar un nombre o número"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              <div className="mt-5 text-sm font-semibold text-muted-foreground">Contactos</div>

              <div className="mt-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredAddContacts.length === 0 ? (
                  <div className=" px-4 py-6 text-center text-sm text-muted-foreground">
                    No hay más contactos disponibles para agregar.
                  </div>
                ) : null}
                {filteredAddContacts.map((p) => {
                  const memberName = ((p.full_name ?? p.email ?? "Usuario").trim() || "Usuario");
                  const subtitle = (p.about ?? "").trim() || (p.email ?? "");
                  const initial = memberName.slice(0, 1).toUpperCase() || "U";
                  const checked = Boolean(selectedAddMemberIds[p.id]);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSelectedAddMemberIds((prev) => ({
                          ...prev,
                          [p.id]: !Boolean(prev[p.id]),
                        }))
                      }
                      className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-left hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-charcoal-deep"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded border",
                          checked ? "border-whatsapp-forest bg-whatsapp-forest text-white" : "border-border"
                        )}
                      >
                        {checked ? <Check className="h-4 w-4" /> : null}
                      </span>

                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatar_url} alt={memberName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold">{initial}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-foreground">{memberName}</div>
                        {subtitle ? <div className="truncate text-sm text-muted-foreground">{subtitle}</div> : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddMemberOpen(false);
                    setAddMemberQuery("");
                    setSelectedAddMemberIds({});
                  }}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-whatsapp-panel"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!canAddMembers || isAddingMembers}
                  onClick={async () => {
                    if (!canAddMembers) return;
                    const ids = Object.entries(selectedAddMemberIds)
                      .filter(([, v]) => v)
                      .map(([id]) => id);
                    if (ids.length === 0) {
                      setAddMemberOpen(false);
                      setAddMemberQuery("");
                      setSelectedAddMemberIds({});
                      return;
                    }

                    setIsAddingMembers(true);
                    try {
                      const supabase = createClient();

                      const { data: addedProfiles } = await supabase
                        .from("profiles")
                        .select("id, full_name, email")
                        .in("id", ids);

                      const { error } = await supabase
                        .from("conversation_members")
                        .insert(ids.map((id) => ({ conversation_id: conversationId, user_id: id, role: "member" })));
                      if (error) throw error;

                      const now = new Date();
                      const stamp = now.toLocaleString("es-ES", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const addedLines = (addedProfiles ?? [])
                        .map((p: any) => {
                          const name = (p.full_name ?? "").trim();
                          const email = (p.email ?? "").trim();
                          const displayName = name || email || "Usuario";
                          return email ? `${displayName} (${email})` : displayName;
                        })
                        .filter(Boolean);

                      const body =
                        addedLines.length === 1
                          ? `El usuario ${addedLines[0]} ha sido añadido al grupo\n${stamp}`
                          : `Usuarios añadidos al grupo:\n${addedLines.join("\n")}\n${stamp}`;

                      await supabase.from("messages").insert({
                        conversation_id: conversationId,
                        sender_id: userId,
                        body,
                        message_type: "system",
                      });

                      setAddMemberOpen(false);
                      setAddMemberQuery("");
                      setSelectedAddMemberIds({});

                      const { data: memberRows } = await supabase
                        .from("conversation_members")
                        .select("user_id, role, profiles(full_name, email, avatar_url, about)")
                        .eq("conversation_id", conversationId);

                      const mapped: GroupMemberRow[] = ((memberRows ?? []) as ConversationMemberSelectRow[]).map((r) => ({
                        user_id: r.user_id as string,
                        role: (r.role as string) ?? "member",
                        full_name: r.profiles?.full_name ?? null,
                        email: r.profiles?.email ?? null,
                        avatar_url: r.profiles?.avatar_url ?? null,
                        about: r.profiles?.about ?? null,
                      }));

                      mapped.sort((a, b) => {
                        if (a.user_id === userId) return -1;
                        if (b.user_id === userId) return 1;
                        const an = (a.full_name ?? a.email ?? "").toLowerCase();
                        const bn = (b.full_name ?? b.email ?? "").toLowerCase();
                        return an.localeCompare(bn);
                      });

                      setGroupMembers(mapped);
                    } catch (e) {
                      if (process.env.NODE_ENV !== "production") {
                        console.error("[group] add members failed", e);
                      }
                    } finally {
                      setIsAddingMembers(false);
                    }
                  }}
                  className={cn(
                    "rounded-full bg-whatsapp-forest px-6 py-2 text-sm font-semibold text-white hover:bg-whatsapp-forest/90",
                    !canAddMembers ? "opacity-50" : ""
                  )}
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {viewerOpen && activeImage ? (
        <div className="fixed inset-0 z-50 bg-black/80">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-end gap-2 p-3">
              <a
                href={activeImage.media_url}
                download={activeImage.media_name ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Descargar"
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
              <button
                type="button"
                onClick={() => setViewerIndex((i) => Math.max(0, i - 1))}
                disabled={viewerIndex <= 0}
                className="absolute left-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white enabled:hover:bg-white/20 disabled:opacity-30"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.media_url}
                alt={activeImage.media_name ?? "Imagen"}
                className="max-h-full max-w-full object-contain"
              />

              <button
                type="button"
                onClick={() => setViewerIndex((i) => Math.min(imageItems.length - 1, i + 1))}
                disabled={viewerIndex >= imageItems.length - 1}
                className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white enabled:hover:bg-white/20 disabled:opacity-30"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mx-auto flex max-w-[860px] gap-3 overflow-x-auto">
                {imageItems.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewerIndex(idx)}
                    className={cn(
                      "overflow-hidden rounded-lg ring-2 ring-transparent",
                      idx === viewerIndex ? "ring-white" : "hover:ring-white/40"
                    )}
                    aria-label="Seleccionar imagen"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.media_url}
                      alt={m.media_name ?? "Imagen"}
                      className="h-16 w-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
