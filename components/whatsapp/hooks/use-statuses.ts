import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type StatusRecord = {
  id: string;
  user_id: string;
  media_url: string | null;
  caption: string | null;
  created_at: string;
  expires_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  status_views: Array<{
    status_id: string | null;
    viewer_id: string | null;
    viewed_at: string;
    viewer: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }> | null;
};

type StatusGroups = {
  own: StatusRecord[];
  recent: StatusRecord[];
  seen: StatusRecord[];
};

export function useStatuses(userId: string | null) {
  const [groups, setGroups] = useState<StatusGroups>({
    own: [],
    recent: [],
    seen: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();

      const { data, error: selectError } = await supabase
        .from("statuses")
        .select(`
          *,
          author:profiles!user_id (
            id,
            full_name,
            avatar_url
          ),
          status_views!status_id (
            status_id,
            viewer_id,
            viewed_at,
            viewer:profiles!viewer_id (
              full_name,
              avatar_url
            )
          )
        `)
        .gte("expires_at", nowIso)
        .order("created_at", { ascending: false });

      if (selectError) throw selectError;

      const records = (data ?? []) as StatusRecord[];
      const nextGroups: StatusGroups = { own: [], recent: [], seen: [] };

      for (const row of records) {
        if (!row) continue;

        // Use String casting to avoid any potential comparison issues
        const isOwn = String(row.user_id) === String(userId);

        if (isOwn) {
          nextGroups.own.push(row);
          continue;
        }

        const viewerEntries = row.status_views ?? [];
        const alreadySeen = viewerEntries.some((view) => String(view?.viewer_id) === String(userId));

        if (alreadySeen) {
          nextGroups.seen.push(row);
          continue;
        }

        nextGroups.recent.push(row);
      }

      setGroups(nextGroups);
    } catch (e: any) {
      console.error("[useStatuses] load failed details:", e);
      setGroups({ own: [], recent: [], seen: [] });
      const msg = e.message || e.details || "No se pudieron cargar los estados";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) return;

    const statusesChannel = supabase.channel(`statuses_changes:${userId}`);

    statusesChannel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "statuses" },
        () => {
          void load();
        },
      )
      .subscribe();

    const viewsChannel = supabase.channel(`status_views_changes:${userId}`);

    viewsChannel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_views" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusesChannel);
      supabase.removeChannel(viewsChannel);
    };
  }, [load, supabase, userId]);

  const markAsViewed = useCallback(
    async (statusId: string) => {
      if (!userId || !statusId) return;
      try {
        await supabase.from("status_views").upsert(
          {
            status_id: statusId,
            viewer_id: userId,
          },
          {
            onConflict: "status_id,viewer_id",
          },
        );
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[status] mark view failed", e);
        }
      }
    },
    [supabase, userId],
  );

  return { groups, isLoading, error, reload: load, markAsViewed };
}
