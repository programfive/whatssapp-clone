"use client";

import { useCallback, type ReactNode } from "react";
import EmojiPickerReact, { type EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  onSelect: (emoji: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function EmojiPicker({
  children,
  onSelect,
  open,
  onOpenChange,
  className,
}: Props) {
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "light" ? Theme.LIGHT : Theme.DARK;

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onSelect(emojiData.emoji);
      onOpenChange?.(false);
    },
    [onOpenChange, onSelect],
  );

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        sideOffset={8}
        align="end"
        avoidCollisions
        collisionPadding={8}
        className={cn(
          "w-[calc(100vw-24px)] max-w-[320px] overflow-hidden rounded-xl border bg-popover p-0 text-popover-foreground shadow-lg",
          className,
        )}
        style={{
          maxHeight: "calc(var(--radix-dropdown-menu-content-available-height) - 8px)",
        }}
      >
        <EmojiPickerReact
          onEmojiClick={handleEmojiClick}
          theme={pickerTheme}
          width="100%"
          height={360}
          lazyLoadEmojis
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
