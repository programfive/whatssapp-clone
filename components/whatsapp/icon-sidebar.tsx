"use client";

import type { ReactNode } from "react";

import { Message } from "../icons/message";
import { Groups } from "../icons/groups";
import { State } from "../icons/state";
import { SettingsIcon } from "../icons/settings";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavSection = "chats" | "people" | "status" | "settings" | "profile";

type Props = {
  className?: string;
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  profileInitials?: string;
  profileAvatarUrl?: string | null;
};

type AvatarButtonProps = {
  active: boolean;
  onClick: () => void;
  profileInitials?: string;
  profileAvatarUrl?: string | null;
  className?: string;
};

function AvatarButton({
  active,
  onClick,
  profileInitials,
  profileAvatarUrl,
  className,
}: AvatarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label="Perfil"
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full bg-whatsapp-panel text-whatsapp-text-primary transition-colors",
            active ? "ring-2 ring-primary" : "hover:bg-muted",
            className,
          )}
        >
          {profileAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileAvatarUrl}
              alt="Avatar"
              className="h-full w-full rounded-full overflow-hidden object-cover"
            />
          ) : (
            <span className="text-sm font-semibold">
              {(profileInitials || "?").slice(0, 2).toUpperCase()
              }
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="font-medium">
        <p>Perfil</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function IconSidebar({
  className,
  active,
  onNavigate,
  profileInitials,
  profileAvatarUrl,
}: Props) {
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-10 flex h-16 w-full flex-row items-center justify-between border border-whatsapp-glass bg-[#F7F5F3] dark:bg-whatsapp-charcoal-deep text-whatsapp-text-muted md:static md:h-full md:w-16 md:flex-col md:border-t-0",
          className,
        )}
      >
        <div className="flex w-full flex-1 flex-row items-center justify-around gap-2 px-2 md:flex-none md:flex-col md:justify-start md:py-3">
          <div className="flex w-full flex-row items-center justify-around gap-1 md:flex-col md:items-center">
            <AvatarButton
              className="md:hidden"
              active={active === "profile"}
              onClick={() => onNavigate("profile")}
              profileAvatarUrl={profileAvatarUrl}
              profileInitials={profileInitials}
            />
            <IconButton
              label="Chats"
              active={active === "chats"}
              onClick={() => onNavigate("chats")}
            >
              <Message className="h-6 w-6" />
            </IconButton>
            <IconButton
              label="Personas"
              active={active === "people"}
              onClick={() => onNavigate("people")}
            >
              <Groups className="h-6 w-6" />
            </IconButton>
            <IconButton
              label="Estados"
              active={active === "status"}
              onClick={() => onNavigate("status")}
            >
              <State className="h-6 w-6" />
            </IconButton>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-2 md:w-full md:flex-col md:items-center md:gap-2 md:pb-3 md:pr-0">
          <IconButton
            label="Ajustes"
            active={active === "settings"}
            onClick={() => onNavigate("settings")}
          >
            <SettingsIcon className="h-6 w-6" />
          </IconButton>
          <AvatarButton
            className="hidden md:grid"
            active={active === "profile"}
            onClick={() => onNavigate("profile")}
            profileAvatarUrl={profileAvatarUrl}
            profileInitials={profileInitials}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}

function IconButton({
  children,
  label,
  active,
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full transition-colors",
            active
              ? "bg-whatsapp-glass text-whatsapp-text-primary"
              : "text-whatsapp-text-muted hover:bg-whatsapp-glass hover:text-whatsapp-text-primary",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="font-medium">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
