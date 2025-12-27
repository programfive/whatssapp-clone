import type { ChatMessage, ChatPreview } from "./types";

export const mockChats: ChatPreview[] = [
  {
    id: "c1",
    name: "Josue (Tú)",
    lastMessage: "Nime71019",
    lastTime: "08:22",
    avatarText: "J",
    pinned: true,
  },
  {
    id: "c2",
    name: "Hno Iver Iriarte",
    lastMessage: "Oki",
    lastTime: "06:48",
    avatarText: "H",
  },
  {
    id: "c3",
    name: "Cloutstore G's",
    lastMessage: "8$",
    lastTime: "Ayer",
    avatarText: "C",
    muted: true,
    pinned: true,
  },
  {
    id: "c4",
    name: "FILM TV ICE TV",
    lastMessage: "Recarga...",
    lastTime: "Ayer",
    avatarText: "F",
  },
  {
    id: "c5",
    name: "+591 73794431",
    lastMessage: "Ha bien",
    lastTime: "Ayer",
    avatarText: "+",
  },
  {
    id: "c6",
    name: "Miguel",
    lastMessage: "",
    lastTime: "",
    avatarText: "M",
  },
];

export const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    chatId: "c3",
    author: "them",
    text: "Alguien tiene paypal?",
    time: "22:22",
  },
  {
    id: "m2",
    chatId: "c3",
    author: "them",
    text: "Para que me ayude con un pago",
    time: "22:23",
  },
  {
    id: "m3",
    chatId: "c3",
    author: "me",
    text: "Cuanto",
    time: "22:34",
    status: "read",
  },
  {
    id: "m4",
    chatId: "c3",
    author: "them",
    text: "8$",
    time: "22:34",
  },
];
