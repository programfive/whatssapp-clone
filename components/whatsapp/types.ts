export type ChatPreview = {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageId?: string | null;
  lastTime: string;
  avatarText: string;
  unreadCount?: number;
  lastReadAt?: string | null;
  pinned?: boolean;
  muted?: boolean;
  favorite?: boolean;
  isGroup?: boolean;
  isCreator?: boolean;
  lastReactionUser?: string | null;
  lastReactionEmoji?: string | null;
  avatarUrl?: string | null;
  contactUserId?: string | null;
  disappearingSetting?: "off" | "24h" | "7d" | "90d";
};

export type ChatMessage = {
  id: string;
  chatId: string;
  author: "me" | "them";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
};
