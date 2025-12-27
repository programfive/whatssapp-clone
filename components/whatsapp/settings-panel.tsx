"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";

import {
  FileText,
  Image,
  Keyboard,
  KeyRound,
  Lock,
  LogOut,
  MessageSquareText,
  Moon,
  Search,
  UserRound,
  UserX,
} from "lucide-react";
import { Message } from "../icons/message";
import { SettingsIcon } from "../icons/settings";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DeleteAccountModal } from "./delete-account-modal";
import { RequestInfoPanel } from "./request-info-panel";

type Props = {
  className?: string;
  onOpenWallpaper?: () => void;
};

type SettingsRowItem = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
};

const items: SettingsRowItem[] = [
  {
    id: "theme",
    title: "Tema",
    description: "Cambiar modo oscuro o claro",
    icon: <Moon className="h-5 w-5" />,
  },
  {
    id: "wallpaper",
    title: "Fondo de chat",
    description: "Cambiar imagen de fondo de tus chats",
    icon: <Image className="h-5 w-5" />,
  },
  {
    id: "request-info",
    title: "Solicitar info. de mi cuenta",
    description: "Obtén un informe de tu información",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "delete-account",
    title: "Eliminar cuenta",
    description: "Borrar tu cuenta y todos tus datos",
    icon: <UserX className="h-5 w-5 " />,
  },
  {
    id: "logout",
    title: "Cerrar sesión",
    description: "Salir de tu cuenta en este dispositivo",
    icon: <LogOut className="h-5 w-5" />,
  },
];

export function SettingsPanel({ className, onOpenWallpaper }: Props) {
  const { theme, setTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<{ id: string; name: string; email: string; avatarUrl: string | null; initials: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "request-info">("list");

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      const name = (profile?.full_name ?? "").trim() || authUser.email?.split("@")[0] || "Usuario";
      const email = authUser.email ?? "";

      const parts = name.split(/\s+/).filter(Boolean);
      const first = parts[0]?.[0] ?? "?";
      const second = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
      const initials = `${first}${second}`.toUpperCase();

      setUser({
        id: authUser.id,
        name,
        email,
        avatarUrl: profile?.avatar_url ?? null,
        initials
      });
    }
    loadUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleAction = (id: string) => {
    switch (id) {
      case "theme":
        setTheme(theme === "dark" ? "light" : "dark");
        break;
      case "logout":
        handleLogout();
        break;
      case "delete-account":
        setIsDeleteModalOpen(true);
        break;
      case "wallpaper":
        onOpenWallpaper?.();
        break;
      case "request-info":
        setActiveView("request-info");
        break;
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user) return;

    // Delete user profile and data via Supabase RPC
    const { error } = await supabase.rpc("delete_own_account");

    if (error) {
      console.error("Error in delete_own_account:", error);
      throw error;
    }

    // Sign out and redirect
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <section className={cn("relative flex h-full w-full min-w-0 flex-1 overflow-hidden", className)}>
      <aside className="flex h-full w-full min-w-0 flex-col bg-white dark:bg-[#161717] border-r border-border md:w-[420px] md:shrink-0">
        {activeView === "list" ? (
          <>
            <header className="px-4 py-3 shrink-0">
              <h2 className="text-lg font-semibold text-whatsapp-text-primary">Ajustes</h2>
            </header>

            <div className="px-4 pb-3">
              <div className="flex h-11 items-center gap-2 rounded-xl bg-whatsapp-panel px-3 text-whatsapp-text-muted">
                <Search className="h-4 w-4" />
                <input
                  className="h-full w-full bg-transparent text-sm text-whatsapp-text-primary outline-none placeholder:text-whatsapp-text-muted"
                  placeholder="Buscar en los ajustes"
                />
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-2 pb-6">
                <div className="px-2 py-3">
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center gap-4 rounded-xl px-4 py-4 text-left transition bg-[#F7F5F3] dark:bg-whatsapp-panel shadow-sm"
                  >
                    <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-whatsapp-carbon text-whatsapp-text-primary ring-1 ring-white/5 overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold text-whatsapp-text-primary">{user?.initials || "J"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="truncate font-semibold text-whatsapp-text-primary text-base">{user?.name || "Cargando..."}</div>
                      <div className="truncate text-sm text-whatsapp-text-muted">
                        {user?.email || "Email de la sesión"}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="my-2 h-px bg-border/50 mx-4" />

                <div className="px-2 pr-4 flex flex-col gap-1">
                  {items.map((it) => (
                    <SettingsRow
                      key={it.id}
                      item={it}
                      active={false}
                      onClick={() => handleAction(it.id)}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <RequestInfoPanel onBack={() => setActiveView("list")} />
        )}
      </aside>

      <div className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-white dark:bg-[#161717] px-10 md:flex border-l border-border">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto grid place-items-center text-muted-foreground">
            <SettingsIcon className="h-32 w-32" />
          </div>
          <div className="mt-6">
            <h2 className="text-3xl font-semibold text-whatsapp-text-primary">Ajustes</h2>
            <p className="mt-2 text-base text-whatsapp-text-muted">
              Configura tu cuenta, privacidad y chats para personalizar tu experiencia de WhatsApp de forma segura.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-whatsapp-text-muted">
            <Lock className="h-4 w-4" />
            <span>Tus mensajes personales están cifrados de extremo a extremo.</span>
          </div>
        </div>
      </div>
      <DeleteAccountModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        userName={user?.name || ""}
        onConfirm={handleConfirmDeleteAccount}
      />
    </section>
  );
}

function SettingsRow({
  item,
  active,
  onClick,
}: {
  item: SettingsRowItem;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-4 rounded-xl px-3 py-3 text-left transition",
        active ? "bg-[#F7F5F3] dark:bg-whatsapp-panel" : "hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel",
      )}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-whatsapp-text-muted">
        {item.icon}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate font-medium text-whatsapp-text-primary">{item.title}</div>
        <div className="truncate text-xs text-whatsapp-text-muted">
          {item.description}
        </div>
      </div>
    </button>
  );
}
