"use client";

import {
  Camera,
  Copy,
  Mail,
  Pencil,
  Check,
  X,
  Smile,
  Lock
} from "lucide-react";
import UserIcon from "@/components/icons/user";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";

import { ScrollArea } from "@/components/ui/scroll-area";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onProfileUpdated?: (next: { fullName?: string; avatarUrl?: string | null }) => void;
};

export function ProfilePanel({ className, onProfileUpdated }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState<string>("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!active) return;
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);

      if (!data.user?.id) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!active) return;

      const nextName = profileData?.full_name ?? "";
      setFullName(nextName);
      setDraftName(nextName);
      setAvatarUrl(profileData?.avatar_url ?? null);

      onProfileUpdated?.({
        fullName: nextName,
        avatarUrl: profileData?.avatar_url ?? null,
      });
    }

    void load();

    return () => {
      active = false;
    };
  }, [onProfileUpdated]);

  const displayName = useMemo(() => {
    if (isEditingName) return draftName || "";
    return fullName || "";
  }, [draftName, fullName, isEditingName]);

  const nameCount = useMemo(() => draftName.length, [draftName]);

  const copyEmail = useCallback(async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // ignore
    }
  }, [email]);

  const saveName = useCallback(async () => {
    if (!userId) return;
    const next = draftName.trim();

    setNameError(null);
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: next,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      setFullName(next);
      setIsEditingName(false);
      onProfileUpdated?.({ fullName: next });
    } catch (e: unknown) {
      setNameError(e instanceof Error ? e.message : "No se pudo guardar el nombre");
    } finally {
      setIsSaving(false);
    }
  }, [draftName, onProfileUpdated, userId]);

  const cancelEditName = useCallback(() => {
    setDraftName(fullName);
    setIsEditingName(false);
  }, [fullName]);

  const insertEmojiInName = useCallback((emoji: string) => {
    const input = nameInputRef.current;
    if (!input) {
      setDraftName((prev) => `${prev}${emoji}`);
      return;
    }

    const start = input.selectionStart ?? draftName.length;
    const end = input.selectionEnd ?? draftName.length;
    const next = `${draftName.slice(0, start)}${emoji}${draftName.slice(end)}`;
    setDraftName(next);

    requestAnimationFrame(() => {
      input.focus();
      const nextPos = start + emoji.length;
      input.setSelectionRange(nextPos, nextPos);
    });
  }, [draftName]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!userId) return;
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadError(null);
      setIsSaving(true);

      try {
        const supabase = createClient();
        const ext = file.name.includes(".")
          ? file.name.split(".").pop() || "bin"
          : "bin";
        const path = `avatar/${userId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, {
            upsert: true,
            contentType: file.type || undefined,
          });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const publicUrl = data.publicUrl;

        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: userId,
            avatar_url: publicUrl,
          },
          { onConflict: "id" },
        );
        if (upsertError) throw upsertError;

        setAvatarUrl(publicUrl);
        onProfileUpdated?.({ avatarUrl: publicUrl });
      } catch (e: unknown) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setIsSaving(false);
      }
    },
    [onProfileUpdated, userId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/*": [],
    },
  });

  return (
    <section className={cn("flex h-full min-w-0 flex-1", className)}>
      <aside className="flex h-full w-full flex-col border-r border-border dark:bg-[#161717] bg-white text-card-foreground md:w-[420px]">
        <header className="px-4 py-3">
          <h2 className="text-lg font-semibold">Perfil</h2>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-8">
            <div className="flex justify-center py-6">
              <div
                {...getRootProps()}
                className={cn(
                  "group relative grid h-44 w-44 cursor-pointer place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground ring-1 ring-border transition-colors",
                  isDragActive ? "bg-accent" : "",
                )}
              >
                <input {...getInputProps()} />

                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[#6a6a6a] text-white">
                    <UserIcon className="h-16 w-16 opacity-70" />
                  </div>
                )}

                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white transition-opacity",
                    avatarUrl ? "bg-black/60 opacity-0 group-hover:opacity-100" : "bg-black/60 opacity-100",
                  )}
                >
                  <div className="grid h-10 w-10 place-items-center rounded ">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium leading-tight">
                    Añadir una
                    <br />
                    foto del
                    <br />
                    perfil
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <ProfileField
                title="Nombre"
                value={
                  isEditingName ? (
                    <div className="flex items-end gap-3 border-b-2 border-whatsapp-forest pb-2">
                      <input
                        ref={nameInputRef}
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveName();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEditName();
                          }
                        }}
                        autoFocus
                        maxLength={20}
                        className="h-9 w-full bg-transparent text-sm text-foreground outline-none"
                        placeholder="Tu nombre"
                      />
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs tabular-nums">{nameCount}</span>
                        <EmojiPicker
                          open={isEmojiPickerOpen}
                          onOpenChange={setIsEmojiPickerOpen}
                          onSelect={insertEmojiInName}
                        >
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                            aria-label="Emojis"
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                        </EmojiPicker>
                      </div>
                    </div>
                  ) : (
                    <span className="truncate text-sm text-foreground">
                      {displayName || ""}
                    </span>
                  )
                }
                right={
                  isEditingName ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void saveName()}
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-foreground disabled:opacity-60"
                        aria-label="Guardar nombre"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={cancelEditName}
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-foreground disabled:opacity-60"
                        aria-label="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(fullName);
                        setNameError(null);
                        setIsEditingName(true);
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-foreground"
                      aria-label="Editar nombre"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )
                }
              />

              {nameError ? (
                <p className="text-sm text-red-500">{nameError}</p>
              ) : null}

              <ProfileField
                title="Info."
                value="¡Hola! Estoy usando WhatsApp."
              />

              <ProfileField
                title="Email"
                value={email ?? "—"}
                leftIcon={<Mail className="h-4 w-4" />}
                right={
                  <button
                    type="button"
                    onClick={() => void copyEmail()}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-foreground"
                    aria-label="Copiar email"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                }
              />

              {uploadError ? (
                <p className="text-sm text-red-500">{uploadError}</p>
              ) : null}
            </div>
          </div>
        </ScrollArea>
      </aside>

      <div className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-white dark:bg-[#161717] px-10 md:flex border-l border-border">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto grid place-items-center text-muted-foreground">
            <UserIcon className="h-32 w-32 opacity-80" />
          </div>
          <div className="mt-6">
            <h2 className="text-3xl font-semibold text-whatsapp-text-primary">Perfil</h2>
            <p className="mt-2 text-base text-whatsapp-text-muted">
              Cambia tu nombre, info y foto de perfil para que tus contactos te reconozcan en WhatsApp.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-whatsapp-text-muted">
            <Lock className="h-4 w-4" />
            <span>Tu nombre y foto de perfil son visibles para tus contactos.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileField({
  title,
  value,
  leftIcon,
  right,
}: {
  title: string;
  value: ReactNode;
  leftIcon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-2 flex items-center gap-3">
        {leftIcon ? (
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#F7F5F3] dark:bg-whatsapp-panel text-muted-foreground">
            {leftIcon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">{value}</div>
        {right}
      </div>
      <div className="mt-5 h-px bg-border" />
    </div>
  );
}
