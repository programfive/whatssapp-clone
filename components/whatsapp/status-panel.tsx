"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, ChevronUp, Eye, Image as ImageIcon, Loader2, MoreVertical, Music, Pause, Play, PencilLine, Plus, Send, Smile, Trash2, Volume2, VolumeX, X, PlusCircle, Lock } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

import { useStatuses, type StatusRecord } from "./hooks/use-statuses";
import { State } from "../icons/state";

type Props = {
  className?: string;
  userId: string;
  profileInitials: string;
  profileAvatarUrl: string | null;
  profileName: string;
};

export type StatusSummary = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  latestTime: string;
  statuses: StatusRecord[];
  hasNew: boolean;
};

type ComposerMode = "text" | "media";

const ACCEPTED_MEDIA = "image/*,video/*,audio/*";

export function StatusPanel({
  className,
  userId,
  profileInitials,
  profileAvatarUrl,
  profileName,
}: Props) {
  const { groups, isLoading, error, reload, markAsViewed } = useStatuses(userId || null);
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [composerFile, setComposerFile] = useState<File | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerCaption, setComposerCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeSummary, setActiveSummary] = useState<StatusSummary | null>(null);

  const statusMap = useMemo(() => {
    const map = new Map<string, StatusRecord[]>();
    const buckets = [...groups.own, ...groups.recent, ...groups.seen];
    for (const item of buckets) {
      if (!map.has(item.user_id)) {
        map.set(item.user_id, []);
      }
      map.get(item.user_id)?.push(item);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return map;
  }, [groups]);

  const allSummaries = useMemo(() => {
    const summaries: StatusSummary[] = [];
    for (const [id, statuses] of statusMap.entries()) {
      const isMe = id === userId;
      const name = isMe ? profileName : getProfileName(statuses[0]);
      summaries.push({
        userId: id,
        name,
        avatarUrl: isMe ? profileAvatarUrl : (statuses[0]?.author?.avatar_url ?? null),
        initials: isMe ? profileInitials : getInitials(name),
        latestTime: statuses[statuses.length - 1]?.created_at ?? "",
        statuses,
        hasNew: groups.recent.some((s) => s.user_id === id),
      });
    }
    summaries.sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());
    return summaries;
  }, [groups.recent, statusMap]);

  useEffect(() => {
    if (!activeSummary) return;
    const next = allSummaries.find((summary) => summary.userId === activeSummary.userId);
    if (!next) {
      setActiveSummary(null);
    } else {
      setActiveSummary(next);
    }
  }, [activeSummary, allSummaries]);

  const recentSummaries = useMemo(() => {
    return allSummaries.filter((summary) => summary.hasNew && summary.userId !== userId);
  }, [allSummaries, userId]);

  const seenSummaries = useMemo(() => {
    return allSummaries.filter((summary) => !summary.hasNew && summary.userId !== userId);
  }, [allSummaries, userId]);

  const mySummary = useMemo(() => {
    return allSummaries.find((summary) => summary.userId === userId) ?? null;
  }, [allSummaries, userId]);

  const totalOwnViews = useMemo(() => {
    if (!mySummary) return 0;
    const uniqueViewers = new Set<string>();
    mySummary.statuses.forEach((s) => {
      s.status_views?.forEach((v) => {
        if (v.viewer_id) uniqueViewers.add(v.viewer_id);
      });
    });
    return uniqueViewers.size;
  }, [mySummary]);

  const handleRowSelect = (summary: StatusSummary) => {
    setActiveSummary(summary);
    if (summary.userId === userId) return;
    summary.statuses.forEach((status) => {
      void markAsViewed(status.id);
    });
  };

  const showPlaceholder = !activeSummary;

  const openTextComposer = () => {
    setComposerMode("text");
    setComposerText("");
    setComposerCaption("");
    setComposerOpen(true);
    setSubmitError(null);
  };

  const openMediaComposer = (file: File) => {
    setComposerMode("media");
    setComposerFile(file);
    setComposerCaption("");
    setComposerOpen(true);
    setSubmitError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    openMediaComposer(file);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setComposerMode(null);
    setComposerFile(null);
    setComposerCaption("");
    setComposerText("");
  };

  const handleComposerSubmit = async () => {
    if (!userId || !composerMode) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (composerMode === "text") {
        const text = composerText.trim();
        if (!text) throw new Error("Escribe algo para tu estado.");
        const { error: insertError } = await supabase.from("statuses").insert({
          user_id: userId,
          caption: text,
        });
        if (insertError) throw insertError;
      } else if (composerMode === "media") {
        if (!composerFile) throw new Error("Selecciona un archivo válido.");

        const safeName = sanitizeFileName(composerFile.name || "estado");
        const path = `media/${userId}/status/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage.from("media").upload(path, composerFile, {
          upsert: false,
          contentType: composerFile.type || undefined,
        });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("media").getPublicUrl(path);
        const publicUrl = data?.publicUrl;
        if (!publicUrl) throw new Error("No se pudo obtener la URL del archivo.");

        const caption = composerCaption.trim();

        const { error: insertError } = await supabase.from("statuses").insert({
          user_id: userId,
          media_url: publicUrl,
          caption: caption || null,
        });
        if (insertError) throw insertError;
      }

      closeComposer();
      await reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo publicar el estado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const lastOwnUpdate = mySummary?.statuses[0]?.created_at ?? null;

  return (
    <section className={cn("flex h-full  min-w-0 flex-1", className)}>
      <aside className="flex h-full w-full flex-col dark:bg-[#161717] border-r border-border bg-white text-card-foreground md:w-[420px]">
        <header className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold">Estados</h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Crear estado"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-all hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-foreground active:scale-95"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-42 rounded-2xl border-whatsapp-border-soft bg-whatsapp-carbon p-2 text-whatsapp-text-primary shadow-xl"
              >
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                  className="gap-3"
                >
                  <ImageIcon className="h-5 w-5 opacity-80" />
                  <span>Fotos y videos</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); openTextComposer(); }}
                  className="gap-3"
                >
                  <PencilLine className="h-5 w-5 opacity-80" />
                  <span>Texto</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="px-4 pb-3 ">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (mySummary) {
                handleRowSelect(mySummary);
              } else {
                fileInputRef.current?.click();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (mySummary) {
                  handleRowSelect(mySummary);
                } else {
                  fileInputRef.current?.click();
                }
              }
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full  text-foreground ring-1 ring-border">
                {profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileAvatarUrl} alt={profileName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold">{profileInitials || "?"}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-whatsapp-forest text-white">
                <Plus className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">Mi estado</div>
              <div className="text-xs text-muted-foreground">
                {lastOwnUpdate ? (
                  <span className="flex items-center gap-1">
                    {totalOwnViews > 0 && (
                      <span className="font-medium text-gray-900 dark:text-gray-300">Visto por {totalOwnViews} • </span>
                    )}
                    {formatStatusTime(lastOwnUpdate)}
                  </span>
                ) : (
                  "Haz clic para añadir una actualización de estado"
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openTextComposer();
                }}
                className="grid h-10 w-10 place-items-center rounded-full bg-whatsapp-forest text-white transition hover:bg-whatsapp-forest/80"
                title="Añadir estado de texto"
                aria-label="Crear estado de texto"
              >
                <PencilLine className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Actualizando…
            </div>
          ) : null}
          {error ? (
            <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-6">
            <SectionTitle>Reciente</SectionTitle>
            <div className="mt-2 flex flex-col">
              {recentSummaries.length === 0 ? (
                <EmptyStateRow label="No hay estados nuevos" />
              ) : (
                recentSummaries.map((summary) => (
                  <StatusRow
                    key={summary.userId}
                    summary={summary}
                    isActive={activeSummary?.userId === summary.userId}
                    variant="new"
                    onSelect={() => handleRowSelect(summary)}
                  />
                ))
              )}
            </div>

            <SectionTitle>Visto</SectionTitle>
            <div className="mt-2 flex flex-col">
              {seenSummaries.length === 0 ? (
                <EmptyStateRow label="Aún no has visto estados recientes" />
              ) : (
                seenSummaries.map((summary) => (
                  <StatusRow
                    key={summary.userId}
                    summary={summary}
                    isActive={activeSummary?.userId === summary.userId}
                    variant="seen"
                    onSelect={() => handleRowSelect(summary)}
                  />
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Status Viewer - Shows in fullscreen when a status is selected */}
      {activeSummary && (
        <StatusViewer
          summary={activeSummary}
          isOwn={activeSummary?.userId === userId}
          currentUserId={userId}
          onClose={() => setActiveSummary(null)}
          onRefresh={reload}
        />
      )}

      <div className="hidden min-w-0 flex-1 bg-white dark:bg-[#161717] px-10 py-6 md:flex">
        {showPlaceholder ? (
          <ViewerPlaceholder />
        ) : (
          <div className="flex w-full items-center justify-center text-muted-foreground">
            <p>Haz clic en un estado para verlo en pantalla completa</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MEDIA}
        multiple={false}
        className="sr-only"
        onChange={handleFileChange}
      />

      <StatusComposerDialog
        open={composerOpen}
        mode={composerMode}
        textValue={composerText}
        captionValue={composerCaption}
        file={composerFile}
        isSubmitting={isSubmitting}
        errorMessage={submitError}
        onTextChange={setComposerText}
        onCaptionChange={setComposerCaption}
        onClose={closeComposer}
        onSubmit={handleComposerSubmit}
      />
    </section>
  );
}

function HeaderIcon({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-foreground"
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyStateRow({ label }: { label: string }) {
  return (
    <div className="rounded-xl px-2 py-3 text-sm text-muted-foreground">{label}</div>
  );
}

function StatusRow({
  summary,
  onSelect,
  variant,
  isActive,
}: {
  summary: StatusSummary;
  onSelect: () => void;
  variant: "new" | "seen";
  isActive: boolean;
}) {
  const ringClass =
    variant === "new" ? "ring-2 ring-secondary" : "ring-1 ring-border";
  const latestStatus = summary.statuses[0] ?? null;
  const thumbnailUrl = latestStatus?.media_url ?? summary.avatarUrl ?? null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition",
        isActive ? "bg-[#F7F5F3] dark:bg-whatsapp-panel" : "hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel",
      )}
    >
      <div
        className={cn(
          "grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-muted text-foreground",
          ringClass,
        )}
      >
        {thumbnailUrl ? (
          isVideo(thumbnailUrl) ? (
            <video
              src={thumbnailUrl}
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
              aria-label={`Estado de ${summary.name}`}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt={`Estado de ${summary.name}`} className="h-full w-full object-cover" />
          )
        ) : (
          <span className="text-sm font-semibold">{summary.initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{summary.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {formatStatusTime(summary.latestTime)}
        </div>
      </div>
    </button>
  );
}

function ViewerPlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mx-auto grid place-items-center text-muted-foreground">
        <State className="w-32 h-32" />
      </div>
      <div className="mt-6">
        <h2 className="text-3xl font-semibold text-whatsapp-text-primary">Comparte actualizaciones de estado</h2>
        <p className="mt-2 text-base text-whatsapp-text-muted">
          Añade fotos, videos o texto que desaparecerán después de 24 horas.
        </p>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2 text-sm text-whatsapp-text-muted">
        <Lock className="h-4 w-4" />
        <span>Tus mensajes personales están cifrados de extremo a extremo.</span>
      </div>
    </div>
  );
}

export function StatusViewer({
  summary,
  isOwn,
  currentUserId,
  onClose,
  onRefresh,
}: {
  summary: StatusSummary | null;
  isOwn: boolean;
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isOwnStatus = isOwn || (!!summary && summary.userId === currentUserId);

  const isPaused = isManuallyPaused || isHolding;

  const supabase = useMemo(() => createClient(), []);
  const STATUS_DURATION = 5000;
  const QUICK_REACTIONS = ["😂", "😮", "😍", "😢", "🙏", "👏", "🎉", "💯"];

  if (!summary) return null;

  const currentStatus = summary.statuses[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < summary.statuses.length - 1;

  // Handle video pause/play
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        void videoRef.current.pause();
      } else {
        void videoRef.current.play().catch(() => { });
      }
    }
  }, [isPaused]);

  // Reset states when index changes
  useEffect(() => {
    setImageError(false);
    setProgress(0);
    setIsManuallyPaused(false);
    setIsHolding(false);
  }, [currentIndex]);

  // Auto-advance timer only for non-media statuses
  useEffect(() => {
    const isMedia = currentStatus?.media_url && (isVideo(currentStatus.media_url) || isAudio(currentStatus.media_url));
    if (!summary || isPaused || isMedia) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / (STATUS_DURATION / 50));
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [summary, isPaused, currentStatus, STATUS_DURATION]);

  // Handle progress completion
  useEffect(() => {
    if (progress >= 100) {
      if (summary && currentIndex < summary.statuses.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress, currentIndex, summary, onClose]);

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || isOwnStatus) return;

    let finalUserId = currentUserId;
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id || "";
    }

    if (!finalUserId) {
      alert("No se pudo identificar tu usuario. Por favor, intenta de nuevo.");
      return;
    }

    setIsSendingReply(true);
    try {
      const { data: existingConvo, error: findError } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { p_other_user_id: summary.userId }
      );
      if (findError) throw findError;
      if (!existingConvo) throw new Error("No se pudo crear o encontrar la conversación");

      const currentStatus = summary.statuses[currentIndex];
      const statusContext = {
        name: summary.name,
        caption: currentStatus.caption || (currentStatus.media_url ? (isVideo(currentStatus.media_url) ? "Video" : "Foto") : "Estado"),
        type: currentStatus.media_url ? (isVideo(currentStatus.media_url) ? "video" : "image") : "text",
        mediaUrl: currentStatus.media_url
      };

      const body = JSON.stringify({
        replyText: replyText.trim(),
        statusContext
      });

      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: existingConvo,
        sender_id: finalUserId,
        body: body,
        message_type: "status_reply",
      });
      if (insertError) throw insertError;

      setReplyText("");
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("No se pudo enviar la respuesta: " + (error instanceof Error ? error.message : JSON.stringify(error)));
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    if (isOwnStatus) return;

    let finalUserId = currentUserId;
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id || "";
    }

    if (!finalUserId) {
      alert("No se pudo identificar tu usuario. Por favor, intenta de nuevo.");
      return;
    }

    setIsSendingReply(true);
    try {
      const { data: existingConvo, error: findError } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { p_other_user_id: summary.userId }
      );
      if (findError) throw findError;
      if (!existingConvo) throw new Error("No se pudo crear o encontrar la conversación");

      const currentStatus = summary.statuses[currentIndex];
      const statusContext = {
        name: summary.name,
        caption: currentStatus.caption || (currentStatus.media_url ? (isVideo(currentStatus.media_url) ? "Video" : "Foto") : "Estado"),
        type: currentStatus.media_url ? (isVideo(currentStatus.media_url) ? "video" : "image") : "text",
        mediaUrl: currentStatus.media_url
      };

      const body = JSON.stringify({
        replyText: emoji,
        statusContext
      });

      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: existingConvo,
        sender_id: finalUserId,
        body: body,
        message_type: "status_reply",
      });
      if (insertError) throw insertError;
    } catch (error) {
      console.error("Error sending quick reaction:", error);
      alert("No se pudo enviar la reacción: " + (error instanceof Error ? error.message : JSON.stringify(error)));
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteStatus = async () => {
    if (!currentStatus || !isOwnStatus) return;

    try {
      const { error } = await supabase
        .from("statuses")
        .delete()
        .eq("id", currentStatus.id);

      if (error) throw error;

      await onRefresh();

      if (summary.statuses.length <= 1) {
        onClose();
      } else {
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        } else {
          setCurrentIndex(0);
        }
      }
    } catch (error) {
      console.error("Error deleting status:", error);
      alert("No se pudo eliminar el estado: " + (error instanceof Error ? error.message : "Error desconocido"));
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black transition-colors duration-300 md:bg-black/95 md:backdrop-blur-md"
      onMouseDown={() => setIsHolding(true)}
      onMouseUp={() => setIsHolding(false)}
      onTouchStart={() => setIsHolding(true)}
      onTouchEnd={() => setIsHolding(false)}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden md:max-w-3xl md:h-[90vh] md:rounded-3xl shadow-2xl">
        {/* Header - User Info & Progress Bar */}
        <div
          className="absolute inset-x-0 top-0 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Progress Indicators */}
          <div className="mb-4 flex gap-1">
            {summary.statuses.map((_, idx) => (
              <div
                key={idx}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
              >
                <div
                  className="h-full bg-white transition-all"
                  style={{
                    width: idx === currentIndex
                      ? `${progress}%`
                      : idx < currentIndex
                        ? "100%"
                        : "0%",
                    transition: idx === currentIndex ? 'none' : 'width 0.3s ease'
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="mr-1 grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-95 md:hidden"
              aria-label="Volver"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted ring-2 ring-white/30">
              {summary.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={summary.avatarUrl} alt={summary.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-white">{summary.initials}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsManuallyPaused(!isManuallyPaused); }}>
              <div className="truncate text-sm md:text-base font-semibold drop-shadow-md">{summary.name}</div>
              <div className="text-[10px] md:text-[11px] opacity-90 drop-shadow-md">
                {formatStatusTime(currentStatus?.created_at ?? "")}
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsManuallyPaused((prev) => !prev);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-90"
                aria-label={isPaused ? "Reanudar estado" : "Pausar estado"}
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </button>

              {currentStatus?.media_url && isVideo(currentStatus.media_url) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-90"
                  aria-label={isMuted ? "Activar audio" : "Silenciar estado"}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              )}

              {isOwnStatus && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="grid h-9 w-9 place-items-center rounded-full  transition text-white transition hover:bg-white/10  active:scale-90"
                  title="Eliminar estado"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                onMouseDown={(e) => e.stopPropagation()}
                className="hidden md:grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-90"
                aria-label="Cerrar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {canGoPrevious && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-4 top-1/2 z-40 hidden border-r border-border md:grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
            aria-label="Estado anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {canGoNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-4 top-1/2 z-40 hidden md:grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
            aria-label="Siguiente estado"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Status Content */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/20">
          {/* Internal Navigation Overlays - Hidden on desktop arrows */}
          <div className="pointer-events-none absolute inset-0 z-10 flex">
            <div className="pointer-events-auto h-full w-1/4" onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }} />
            <div className="pointer-events-auto h-full flex-1" onClick={(e) => {
              e.stopPropagation();
              setIsManuallyPaused(!isManuallyPaused);
            }} />
            <div className="pointer-events-auto h-full w-1/4" onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }} />
          </div>

          {currentStatus?.media_url && !imageError ? (
            isVideo(currentStatus.media_url) ? (
              <video
                ref={videoRef}
                src={currentStatus.media_url}
                muted={isMuted}
                playsInline
                className="max-h-full max-w-full rounded-sm object-contain shadow-2xl"
                autoPlay
                onError={handleImageError}
                onTimeUpdate={(e) => {
                  const media = e.currentTarget;
                  if (media.duration) {
                    setProgress((media.currentTime / media.duration) * 100);
                  }
                }}
                onEnded={() => {
                  if (canGoNext) handleNext();
                  else onClose();
                }}
              />
            ) : isAudio(currentStatus.media_url) ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 px-8 text-center text-white">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-white/10 blur-xl animate-pulse" />
                  <div className="grid h-32 w-32 place-items-center rounded-full bg-white/10 backdrop-blur-md ring-2 ring-white/20 shadow-2xl relative">
                    <Music className="h-14 w-14 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="space-y-2 max-w-md">
                  <p className="text-xl font-bold tracking-tight drop-shadow-md">Audio de estado</p>
                  <p className="text-sm opacity-60 line-clamp-1">{currentStatus?.caption ?? "Sin título"}</p>
                </div>
                <audio
                  autoPlay
                  src={currentStatus.media_url}
                  className="mt-4 w-full max-w-xs opacity-80"
                  controls
                  onError={handleImageError}
                  onTimeUpdate={(e) => {
                    const media = e.currentTarget;
                    if (media.duration) {
                      setProgress((media.currentTime / media.duration) * 100);
                    }
                  }}
                  onEnded={() => {
                    if (canGoNext) handleNext();
                    else onClose();
                  }}
                />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentStatus.media_url}
                alt={currentStatus.caption ?? "Estado"}
                className="max-h-full max-w-full rounded-sm object-contain shadow-2xl transition-all duration-500"
                style={{ filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.5))" }}
                onError={handleImageError}
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-whatsapp-forest/80 to-emerald-800 px-8 text-center text-2xl font-semibold text-white">
              <p className="max-w-md drop-shadow-lg">{currentStatus?.caption ?? "Actualización de estado"}</p>
            </div>
          )}

          {/* Caption Overlay */}
          {currentStatus?.caption && currentStatus.media_url && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-6 pb-24 text-center text-white">
              <p className="mx-auto max-w-lg text-lg drop-shadow-md">{currentStatus.caption}</p>
            </div>
          )}
        </div>

        {/* Reply Input - Solo para estados de otros */}
        {!isOwnStatus ? (
          <div
            className="relative z-40 flex flex-col items-center bg-black/40 p-4 pb-8 backdrop-blur-sm"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Quick Reactions */}
            {!replyText && !isSendingReply && (
              <div className="mb-4 md:mb-6 flex gap-2 md:gap-3 overflow-x-auto max-w-full px-2 no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReaction(emoji)}
                    className="flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl md:text-2xl transition hover:bg-white/20 hover:scale-125 active:scale-95 shadow-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex w-full max-w-lg items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20 transition-all focus-within:bg-white/20">
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center text-white/80 transition hover:text-white"
                aria-label="Emoji"
                title="Añadir emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendReply();
                  }
                }}
                placeholder="Escribe una respuesta..."
                className="flex-1 bg-transparent py-1 text-white placeholder:text-white/50 outline-none"
                disabled={isSendingReply}
              />
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSendingReply}
                className="grid h-9 w-9 shrink-0 place-items-center text-white transition disabled:opacity-40 hover:scale-110 active:scale-95"
                aria-label="Enviar respuesta"
              >
                {isSendingReply ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-40 flex flex-col items-center bg-black/40 p-4 pb-8 backdrop-blur-sm">
            <button
              onClick={() => setShowViewers(true)}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex flex-col items-center text-white transition hover:opacity-80"
              aria-label="Ver quién vio mi estado"
            >
              <ChevronUp className="h-5 w-5 animate-bounce opacity-50" />
              <div className="flex items-center gap-2 text-base font-medium">
                <Eye className="h-5 w-5" />
                <span>{currentStatus?.status_views?.length || 0}</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Vistas</span>
            </button>
          </div>
        )}

        {/* Viewers List Overlay */}
        {showViewers && isOwnStatus && (
          <div
            className="absolute inset-0 z-[100] flex flex-col bg-black animate-in slide-in-from-bottom duration-300"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 p-4 bg-black border-b border-white">
              <div className="flex items-center gap-3 text-white">
                <button
                  onClick={() => setShowViewers(false)}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">Visto por</span>
                  <span className="text-sm text-gray-400">{currentStatus?.status_views?.length || 0} personas</span>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {currentStatus?.status_views && currentStatus.status_views.length > 0 ? (
                  currentStatus.status_views.map((view, idx) => (
                    <div key={idx} className="flex items-center gap-4 rounded-xl p-3 text-white transition hover:bg-white/10 dark:hover:bg-whatsapp-panel">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-whatsapp-carbon ring-1 ring-white/10 overflow-hidden shrink-0">
                        {view.viewer?.avatar_url ? (
                          <img src={view.viewer.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-semibold text-gray-400">
                            {(view.viewer?.full_name || "U")[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-[15px]">{view.viewer?.full_name || "Usuario desconocido"}</div>
                        <div className="text-xs text-gray-400">{formatStatusTime(view.viewed_at)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-white opacity-50">
                    <Eye className="mb-4 h-12 w-12 opacity-20" />
                    <p>Aún nadie ha visto tu estado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteStatus}
      />
    </div>
  );
}

function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[450px] rounded-xl bg-white p-8 dark:bg-[#161717] text-center animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-whatsapp-text-primary">¿Eliminar actualización?</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-[#8696a0]">
          Esta actualización de estado también se eliminará para todos los que la vieron. Solo eliminarás el fragmento seleccionado.
        </p>
        <div className="mt-8 flex items-center justify-end px-2 gap-4">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-full hover:bg-[#F7F5F3] font-semibold dark:hover:bg-whatsapp-panel dark:hover:text-white transition-colors hover:opacity-80 active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-[#f15c6d] px-8 py-3 font-semibold text-white transition hover:opacity-90 active:scale-[0.98] shadow-md"
          >
            Eliminar para todos
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusComposerDialog({
  open,
  mode,
  file,
  textValue,
  captionValue,
  isSubmitting,
  errorMessage,
  onTextChange,
  onCaptionChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: ComposerMode | null;
  file: File | null;
  textValue: string;
  captionValue: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onTextChange: (val: string) => void;
  onCaptionChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open || !mode) return null;

  const title = mode === "text" ? "Nuevo estado de texto" : "Nuevo estado";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-[#222e35]">
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-whatsapp-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-whatsapp-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-8 py-2">
          {mode === "text" ? (
            <textarea
              value={textValue}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Escribe lo que quieras compartir…"
              className="h-40 w-full resize-none rounded-2xl border-2 border-border/30 bg-transparent p-4 text-base outline-none focus:border-whatsapp-forest transition-colors text-whatsapp-text-primary placeholder:text-whatsapp-text-muted/50"
            />
          ) : (
            <Fragment>
              <div className="relative mb-6">
                <input
                  value={captionValue}
                  onChange={(e) => onCaptionChange(e.target.value)}
                  placeholder="Añade una descripción (opcional)"
                  className="w-full border-b-2 border-border/30 bg-transparent px-0 pb-2 text-base outline-none transition-colors focus:border-whatsapp-forest text-whatsapp-text-primary placeholder:text-whatsapp-text-muted/50"
                />
              </div>
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-border/30">
                  {isVideo(file?.name ?? "") ? (
                    <video src={previewUrl} controls className="h-64 w-full object-cover" />
                  ) : isAudio(file?.name ?? "") ? (
                    <div className="flex h-64 w-full flex-col items-center justify-center gap-4 bg-whatsapp-forest/10 text-whatsapp-forest">
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-whatsapp-forest text-white shadow-lg">
                        <Music className="h-10 w-10" />
                      </div>
                      <p className="text-sm font-bold opacity-80">{file?.name}</p>
                      <audio src={previewUrl} controls className="w-full max-w-[240px]" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Previsualización" className="h-64 w-full object-cover" />
                  )}
                </div>
              ) : (
                <div className="grid h-48 place-items-center rounded-2xl border-2 border-dashed border-border/30 text-sm text-whatsapp-text-muted">
                  Selecciona un archivo para continuar
                </div>
              )}
            </Fragment>
          )}

          {errorMessage ? (
            <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-500 font-medium">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 p-8 pt-6 sm:flex-row sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="order-2 sm:order-1 px-6 py-2.5 text-sm font-bold text-whatsapp-forest hover:bg-whatsapp-forest/5 rounded-full transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
            className={cn(
              "order-1 sm:order-2 inline-flex items-center justify-center gap-2 rounded-full px-8 py-2.5 text-sm font-bold text-white transition-all shadow-md",
              isSubmitting
                ? "bg-whatsapp-forest opacity-70 cursor-not-allowed"
                : "bg-whatsapp-forest hover:bg-whatsapp-forest-dark active:scale-[0.98]"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatStatusTime(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();

  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeString = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) return `Hoy a la(s) ${timeString}`;
  if (isYesterday) return `Ayer a la(s) ${timeString}`;

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getProfileName(status: StatusRecord | undefined) {
  if (!status) return "Usuario";
  const name = (status.author?.full_name ?? "").trim();
  return name || "Usuario";
}

export function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase();
}

function sanitizeFileName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function isVideo(value: string | null | undefined) {
  if (!value) return false;
  return /\.(mp4|mov|webm|mkv|avi)$/i.test(value);
}

function isAudio(value: string | null | undefined) {
  if (!value) return false;
  return /\.(mp3|wav|ogg|m4a|aac)$/i.test(value);
}
