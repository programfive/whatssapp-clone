"use client";

import type { ReactNode } from "react";

import { Plus, MoreVertical, Users } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CommunityItem = {
  id: string;
  name: string;
  preview?: string;
  time?: string;
  avatarText: string;
  muted?: boolean;
  variant?: "community" | "announcement" | "chat";
};

type Props = {
  className?: string;
};

const mockCommunities: CommunityItem[] = [
  { id: "new", name: "Nueva comunidad", avatarText: "+", variant: "community" },
  { id: "c1", name: "Referencias CLOUT", avatarText: "R", variant: "community" },
  {
    id: "a1",
    name: "Avisos",
    preview: "Cloutstore: Luego de eso pilas Disculpen",
    time: "Ayer",
    avatarText: "A",
    variant: "announcement",
  },
  {
    id: "c2",
    name: "Cloutstore G's",
    preview: "~ iSebbbas: 8$",
    time: "Ayer",
    avatarText: "C",
    muted: true,
    variant: "chat",
  },
  {
    id: "c3",
    name: "Clout Licencias",
    preview: "+591 67147002 se unió a través de un enlace de invitación",
    time: "Ayer",
    avatarText: "L",
    muted: true,
    variant: "chat",
  },
];

export function CommunitiesPanel({ className }: Props) {
  return (
    <section className={cn("flex h-full min-w-0 flex-1", className)}>
      <aside className="flex h-full w-full flex-col bg-card text-card-foreground md:w-[420px]">
        <header className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold">Comunidades</h2>
          <div className="flex items-center gap-2">
            <HeaderIcon>
              <Plus className="h-5 w-5" />
            </HeaderIcon>
            <HeaderIcon>
              <MoreVertical className="h-5 w-5" />
            </HeaderIcon>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 pb-6">
            {mockCommunities.map((item) => (
              <CommunityRow key={item.id} item={item} />
            ))}

            <button
              type="button"
              className="mt-2 w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-primary hover:bg-accent"
            >
              Ver todos
            </button>
          </div>
        </ScrollArea>
      </aside>

      <div className="hidden min-w-0 flex-1 items-center justify-center bg-background px-10 md:flex">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="mt-6 text-2xl font-semibold">Crea comunidades</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea grupos para reunir a los miembros en función de temas y envíales
            fácilmente avisos del administrador.
          </p>
          <p className="mt-10 text-xs text-muted-foreground">
            Tus mensajes personales en las comunidades están cifrados de extremo a extremo
          </p>
        </div>
      </div>
    </section>
  );
}

function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function CommunityRow({ item }: { item: CommunityItem }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent"
    >
      <div
        className={cn(
          "grid h-12 w-12 place-items-center rounded-xl bg-muted text-foreground ring-1 ring-border",
          item.variant === "community" ? "rounded-xl" : "rounded-full",
        )}
      >
        <span className="text-sm font-semibold">{item.avatarText}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate font-medium">{item.name}</div>
          <div className="shrink-0 text-xs text-muted-foreground">{item.time}</div>
        </div>
        {item.preview ? (
          <div className="mt-1 truncate text-sm text-muted-foreground">
            {item.preview}
          </div>
        ) : null}
      </div>

      {item.muted ? (
        <div className="text-xs text-muted-foreground">\uD83D\uDD07</div>
      ) : null}
    </button>
  );
}
