"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Search, Lock } from "lucide-react";
import { Groups } from "../icons/groups";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Person = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
};

type Props = {
  className?: string
  userId: string
  onStartChat: (next: { conversationId: string; title: string; avatarUrl?: string | null }) => void
}

function formatSupabaseError(e: unknown, fallback: string) {
  if (!e) return fallback;
  if (e instanceof Error && e.message) return e.message;

  if (typeof e === "object") {
    const message = (e as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    const details = (e as { details?: unknown }).details;
    if (typeof details === "string" && details.trim()) return details;
    const hint = (e as { hint?: unknown }).hint;
    if (typeof hint === "string" && hint.trim()) return hint;
  }

  return fallback;
}



export function PeoplePanel({ className, userId, onStartChat }: Props) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.fullName.toLowerCase().includes(q));
  }, [people, query]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!userId) return;
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // 1. Find users with whom I already have a direct conversation
        // Get all my conversation memberships
        const { data: myMemberships } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", userId);

        const myConversationIds = (myMemberships ?? []).map((m: { conversation_id: string | null }) => m.conversation_id).filter(Boolean) as string[];
        const existingContactIds = new Set<string>();

        if (myConversationIds.length > 0) {
          // Identify which of these are direct chats (is_group = false)
          const { data: directChats } = await supabase
            .from("conversations")
            .select("id")
            .in("id", myConversationIds)
            .eq("is_group", false);

          const directChatIds = (directChats ?? []).map((c: { id: string }) => c.id);

          if (directChatIds.length > 0) {
            // Find the *other* user in these direct chats
            const { data: otherMembers } = await supabase
              .from("conversation_members")
              .select("user_id")
              .in("conversation_id", directChatIds)
              .neq("user_id", userId);

            otherMembers?.forEach((m: { user_id: string | null }) => {
              if (m.user_id) existingContactIds.add(m.user_id);
            });
          }
        }

        // 2. Fetch profiles, excluding myself AND existing contacts
        let profilesQuery = supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .neq("id", userId);

        if (existingContactIds.size > 0) {
          profilesQuery = profilesQuery.not("id", "in", `(${Array.from(existingContactIds).join(",")})`);
        }

        const { data: profiles, error: profilesErr } = await profilesQuery
          .order("full_name", { ascending: true });
        if (profilesErr) throw profilesErr;

        if (!active) return;

        const next: Person[] = (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }) => ({
          id: p.id,
          fullName: (p.full_name ?? "").trim() || (p.email ?? "").trim() || "Usuario",
          avatarUrl: p.avatar_url ?? null,
        }));

        setPeople(next);
      } catch (e: unknown) {
        if (!active) return;
        console.error("PeoplePanel.load error", e);
        setError(formatSupabaseError(e, "No se pudieron cargar las personas"));
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [userId]);

  const startChat = useCallback(
    async (person: Person) => {
      if (!userId) return;
      setError(null);
      setIsLoading(true);

      try {
        const supabase = createClient();

        const { data, error: rpcErr } = await supabase.rpc(
          "create_direct_conversation",
          {
            p_other_user_id: person.id,
            p_title: null,
          },
        );
        if (rpcErr) throw rpcErr;
        const conversationId = data as string;

        onStartChat({ conversationId, title: person.fullName, avatarUrl: person.avatarUrl })


      } catch (e: unknown) {
        console.error("PeoplePanel.startChat error", e);
        setError(formatSupabaseError(e, "No se pudo crear el chat"));
      } finally {
        setIsLoading(false);
      }
    },
    [onStartChat, userId],
  );

  return (
    <section className={cn("flex h-full min-w-0 flex-1", className)}>
      <aside className="flex h-full w-full flex-col dark:bg-[#161717]  bg-white border-r border-border md:w-[420px]">
        <header className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold text-whatsapp-text-primary">Personas</h2>
        </header>

        <div className="px-4 pb-3">
          <div className="flex h-11 items-center gap-2 rounded-xl bg-whatsapp-panel px-3 text-whatsapp-text-muted">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full w-full bg-transparent text-sm text-whatsapp-text-primary outline-none placeholder:text-whatsapp-text-muted"
              placeholder="Buscar personas"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 pb-2">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3">
                    <Skeleton className="h-11 w-11 rounded-full bg-black/5 dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 bg-black/5 dark:bg-white/10" />
                      <Skeleton className="h-3 w-48 bg-black/5 dark:bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="px-3 py-4 text-sm text-red-500">{error}</div>
            ) : null}

            {!isLoading && !error && filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-whatsapp-text-muted">
                No hay personas nuevas para agregar.
              </div>
            ) : null}

            {!isLoading && filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isLoading}
                onClick={() => void startChat(p)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  "hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel disabled:opacity-60",
                )}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-whatsapp-carbon text-whatsapp-text-primary">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatarUrl}
                      alt="Avatar"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <span className="text-sm font-semibold">
                        {(p.fullName[0] ?? "?").toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-whatsapp-text-primary">
                    {p.fullName}
                  </div>
                  <div className="mt-1 truncate text-sm text-whatsapp-text-muted">
                    Toca para iniciar un chat
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <div className="hidden min-w-0 flex-1 items-center justify-center bg-white dark:bg-[#161717] px-10 md:flex">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mx-auto grid place-items-center text-muted-foreground">
            <Groups className="w-32 h-32" />
          </div>
          <div className="mt-6">
            <h2 className="text-3xl font-semibold text-whatsapp-text-primary">Busca a personas para chatear</h2>
            <p className="mt-2 text-base text-whatsapp-text-muted max-w-md">
              Encuentra a tus amigos y conocidos para empezar una conversación. Solo busca por su nombre o correo electrónico.
            </p>
          </div>
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-whatsapp-text-muted">
            <Lock className="h-4 w-4" />
            <span>Tus mensajes personales están cifrados de extremo a extremo.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
