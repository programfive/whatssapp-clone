"use client";

import type { ReactNode } from "react";

import { Plus, Search, MoreVertical, MessageSquareText } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChannelItem = {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatarText: string;
  unavailable?: boolean;
};

type ChannelSuggestion = {
  id: string;
  name: string;
  followers: string;
  avatarText: string;
};

type Props = {
  className?: string;
};

const mockChannels: ChannelItem[] = [
  {
    id: "ch1",
    name: "The Dodo",
    preview: "Who wakes up first in your house - you or your pet?",
    time: "Ayer",
    avatarText: "D",
  },
  {
    id: "ch2",
    name: "HUMOR & MEMES",
    preview: "Y me quemo y me la pela",
    time: "Tuesday",
    avatarText: "H",
  },
  {
    id: "ch3",
    name: "UNITEL",
    preview: "Este canal ya no está disponible.",
    time: "",
    avatarText: "U",
    unavailable: true,
  },
  {
    id: "ch4",
    name: "Fondos Kbrones",
    preview: "Se creó el canal 'Fondos Kbrones'",
    time: "5/23/2025",
    avatarText: "F",
  },
];

const mockSuggestions: ChannelSuggestion[] = [
  { id: "s1", name: "STICKERS", followers: "47 mil seguidores", avatarText: "S" },
  { id: "s2", name: "ESTIKER DEL TODO", followers: "15 mil seguidores", avatarText: "E" },
];

export function ChannelsPanel({ className }: Props) {
  return (
    <section className={cn("flex h-full min-w-0 flex-1", className)}>
      <aside className="flex h-full w-full flex-col bg-card text-card-foreground md:w-[420px]">
        <header className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold">Canales</h2>
          <div className="flex items-center gap-2">
            <HeaderIcon>
              <Plus className="h-5 w-5" />
            </HeaderIcon>
            <HeaderIcon>
              <MoreVertical className="h-5 w-5" />
            </HeaderIcon>
          </div>
        </header>

        <div className="px-4 pb-3">
          <div className="flex h-11 items-center gap-2 rounded-xl bg-muted px-3 text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Buscar"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-6">
            <div className="flex flex-col">
              {mockChannels.map((c) => (
                <ChannelRow key={c.id} item={c} />
              ))}
            </div>

            <div className="mt-4 text-xs font-semibold text-muted-foreground">
              Busca canales para seguir
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {mockSuggestions.map((s) => (
                <SuggestionRow key={s.id} item={s} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </aside>

      <div className="hidden min-w-0 flex-1 items-center justify-center bg-background px-10 md:flex">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <MessageSquareText className="h-7 w-7" />
          </div>
          <h3 className="mt-6 text-2xl font-semibold">Descubre canales</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Entretenimiento, deportes, noticias, estilo de vida, personas y mucho
            más.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sigue los canales que te interesan.
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

function ChannelRow({ item }: { item: ChannelItem }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-accent"
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-foreground ring-1 ring-border">
        <span className="text-sm font-semibold">{item.avatarText}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate font-medium">{item.name}</div>
          <div className="shrink-0 text-xs text-muted-foreground">
            {item.time}
          </div>
        </div>
        <div
          className={cn(
            "mt-1 truncate text-sm",
            item.unavailable ? "text-muted-foreground" : "text-muted-foreground",
          )}
        >
          {item.preview}
        </div>
      </div>
    </button>
  );
}

function SuggestionRow({ item }: { item: ChannelSuggestion }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-accent px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-background text-foreground ring-1 ring-border">
          <span className="text-sm font-semibold">{item.avatarText}</span>
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.followers}</div>
        </div>
      </div>
      <Button
        variant="secondary"
        className="h-8 rounded-full px-4 text-xs"
        type="button"
      >
        Seguir
      </Button>
    </div>
  );
}
