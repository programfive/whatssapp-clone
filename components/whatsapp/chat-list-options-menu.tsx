"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  MoreVertical,
  UsersRound,
  CheckSquare,
  CheckCheck,
  LogOut,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

type Props = {
  onNewGroup: () => void;
  onMarkAllRead?: () => void;
  onEnterSelectionMode?: () => void;
};

export function ChatListOptionsMenu({ onNewGroup, onMarkAllRead, onEnterSelectionMode }: Props) {
  const router = useRouter();

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [router]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full text-whatsapp-text-primary hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
          aria-label="Opciones"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-2xl border-whatsapp-border-soft bg-whatsapp-carbon p-2 text-whatsapp-text-primary shadow-xl"
      >
        <DropdownMenuItem className="gap-3" onSelect={onNewGroup}>
          <UsersRound className="h-5 w-5" />
          <span className="text-sm font-medium">Nuevo grupo</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3" onSelect={() => onEnterSelectionMode?.()}>
          <CheckSquare className="h-5 w-5" />
          <span className="text-sm font-medium">Seleccionar chats</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3" onSelect={() => void onMarkAllRead?.()}>
          <CheckCheck className="h-5 w-5" />
          <span className="text-sm font-medium">Marcar todos como leídos</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-whatsapp-border-soft" />
        <DropdownMenuItem className="gap-3" onSelect={() => void logout()}>
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
