import { useState } from "react";
import {
    CheckSquare,
    Clock,
    Heart,
    Info,
    LogOut,
    MoreVertical,
    Search,
    ArrowLeft,
    Trash,
    X,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { GroupAvatar } from "./group-avatar";
import type { ChatPreview } from "./types";

type Props = {
    chat: ChatPreview;
    isSearchOpen: boolean;
    onOpenSearch: () => void;
    onCloseSearch: () => void;
    isContactInfoOpen: boolean;
    onCloseContactInfo: () => void;
    isSelectionMode: boolean;
    onExitSelectionMode: () => void;
    selectedCount: number;
    isGroup: boolean;
    otherUserAvatarUrl?: string | null;
    onOpenContactInfo: () => void;
    onEnterSelectionMode: () => void;
    canManageChat?: boolean;
    onClearChat?: () => void;
    onDeleteChat?: () => void;
    onLeaveGroup?: () => void;
    onToggleFavorite?: () => void;
    onBack?: () => void;
    groupPhotoUrl: string | null;
    statusText: string;
    groupAvatarItems: { label: string }[];
    onOpenDisappearingMessages?: () => void;
    isDisappearingMessagesOpen?: boolean;
    onCloseDisappearingMessages?: () => void;
    statusSummary?: any;
    onOpenStatus?: (summary: any) => void;
    currentDisappearingSetting?: "off" | "24h" | "7d" | "90d";
};

export function ChatHeader({
    chat,
    isSearchOpen,
    onOpenSearch,
    onCloseSearch,
    isContactInfoOpen,
    onCloseContactInfo,
    isSelectionMode,
    onExitSelectionMode,
    selectedCount,
    isGroup,
    otherUserAvatarUrl,
    onOpenContactInfo,
    onEnterSelectionMode,
    canManageChat,
    onClearChat,
    onDeleteChat,
    onLeaveGroup,
    onToggleFavorite,
    onBack,
    groupPhotoUrl,
    statusText,
    groupAvatarItems,
    onOpenDisappearingMessages,
    isDisappearingMessagesOpen,
    onCloseDisappearingMessages,
    statusSummary,
    onOpenStatus,
    currentDisappearingSetting = "off",
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    if (isSearchOpen) {
        return (
            <header className="relative z-10 flex h-[64px] items-center justify-between border-b border-border bg-white px-4 dark:bg-[#161717] animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onCloseSearch}
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="text-sm font-semibold text-whatsapp-text-primary">Buscar mensajes</div>
                </div>
            </header>
        );
    }

    if (isDisappearingMessagesOpen) {
        return (
            <header className="relative z-10 flex h-[64px] items-center justify-between border-b border-border bg-white px-4 dark:bg-[#161717] animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onCloseDisappearingMessages}
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                        aria-label="Cerrar"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="text-sm font-semibold text-whatsapp-text-primary">Mensajes temporales</div>
                </div>
            </header>
        );
    }

    if (isContactInfoOpen) {
        return (
            <header className="relative z-10 flex h-[64px] items-center justify-between border-b border-border bg-white px-3 dark:bg-[#161717] md:px-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onCloseContactInfo}
                        className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-muted hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
                        aria-label="Cerrar"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="text-sm font-semibold text-whatsapp-text-primary">
                        {isGroup ? "Info. del grupo" : "Info. del contacto"}
                    </div>
                </div>
            </header>
        );
    }

    if (isSelectionMode) {
        return (
            <header className="relative z-10 flex items-center justify-between border-b border-border bg-white px-3 py-3 dark:bg-[#161717] md:px-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onExitSelectionMode}
                        className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-muted hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="text-sm font-semibold text-whatsapp-text-primary">{selectedCount} seleccionados</div>
                </div>
            </header>
        );
    }

    return (
        <header className="relative z-10 flex h-[64px] items-center justify-between border-b border-border bg-white px-3 dark:bg-[#161717] md:px-4">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="grid h-9 w-9 place-items-center rounded-full text-whatsapp-text-muted hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary md:hidden"
                        aria-label="Volver"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                ) : null}
                {isGroup ? (
                    <div className="relative">
                        {groupPhotoUrl ? (
                            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-whatsapp-panel text-whatsapp-text-primary">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={groupPhotoUrl} alt="Grupo" className="h-full w-full object-cover" />
                            </div>
                        ) : (
                            <GroupAvatar items={groupAvatarItems} size="sm" />
                        )}
                        {currentDisappearingSetting !== "off" && (
                            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gray-100 text-gray-900 dark:bg-[#111b21] dark:text-white ring-2 ring-white dark:ring-[#0b141a]">
                                <Clock className="h-3 w-3" />
                            </span>
                        )}
                    </div>
                ) : (
                    <div
                        className="relative h-10 w-10 shrink-0 flex items-center justify-center cursor-pointer group/avatar"
                        onClick={(e) => {
                            if (statusSummary && onOpenStatus) {
                                e.stopPropagation();
                                onOpenStatus(statusSummary);
                            }
                        }}
                    >
                        {statusSummary && (
                            <svg className="absolute inset-0 h-full w-full -rotate-90 transform scale-[1.15] overflow-visible">
                                {statusSummary.statuses.map((s: any, i: number) => {
                                    const total = statusSummary.statuses.length;
                                    const gap = total > 1 ? 5 : 0;
                                    const angle = 360 / total;
                                    const dashArray = (2 * Math.PI * 18); // r=18
                                    const segmentLength = (dashArray / total) - gap;

                                    return (
                                        <circle
                                            key={s.id}
                                            cx="20"
                                            cy="20"
                                            r="18"
                                            fill="none"
                                            stroke={statusSummary.hasNew ? "#25D366" : "#8696a0"}
                                            strokeWidth="2.5"
                                            strokeDasharray={`${segmentLength} ${dashArray - segmentLength}`}
                                            strokeDashoffset={-(angle * i * dashArray / 360)}
                                            className="transition-all duration-500"
                                        />
                                    );
                                })}
                            </svg>
                        )}
                        <div
                            className={cn(
                                "relative h-10 w-10 overflow-hidden rounded-full bg-whatsapp-panel text-whatsapp-text-primary transition-transform group-hover/avatar:scale-95",
                                statusSummary && "ring-2 ring-transparent"
                            )}
                        >
                            {otherUserAvatarUrl || chat.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={otherUserAvatarUrl || chat.avatarUrl || ""}
                                    alt="Avatar"
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            ) : (
                                <div className="grid h-full w-full place-items-center">
                                    <span className="text-sm font-semibold">{chat.avatarText}</span>
                                </div>
                            )}
                        </div>
                        {currentDisappearingSetting !== "off" && (
                            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gray-100 text-gray-900 dark:bg-[#111b21] dark:text-white ring-2 ring-white dark:ring-[#0b141a]">
                                <Clock className="h-3 w-3" />
                            </span>
                        )}
                    </div>
                )}
                <div className="min-w-0">
                    <div className="truncate font-medium text-whatsapp-text-primary">{chat.name}</div>
                    {statusText ? <div className="text-xs text-whatsapp-text-muted">{statusText}</div> : null}
                </div>
            </div>

            <div className="flex items-center gap-1 text-whatsapp-text-muted">
                <HeaderIcon onClick={onOpenSearch} aria-label="Buscar mensajes">
                    <Search className="h-5 w-5" />
                </HeaderIcon>
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <HeaderIcon aria-label="Opciones">
                            <MoreVertical className="h-5 w-5" />
                        </HeaderIcon>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-72 rounded-2xl border-whatsapp-border-soft  p-2 text-whatsapp-text-primary "
                    >
                        <DropdownMenuItem
                            className="gap-3"
                            onSelect={(e) => {
                                e.preventDefault();
                                closeMenu();
                                onOpenContactInfo();
                            }}
                        >
                            <Info className="h-5 w-5" />
                            <span className="text-sm font-medium">{isGroup ? "Info. del grupo" : "Info. del contacto"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-3"
                            onSelect={(e) => {
                                e.preventDefault();
                                closeMenu();
                                onEnterSelectionMode();
                            }}
                        >
                            <CheckSquare className="h-5 w-5" />
                            <span className="text-sm font-medium">Seleccionar mensajes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-3"
                            onSelect={(e) => {
                                e.preventDefault();
                                closeMenu();
                                onOpenDisappearingMessages?.();
                            }}
                        >
                            <Clock className="h-5 w-5" />
                            <span className="text-sm font-medium">Mensajes temporales</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-3"
                            onSelect={(e) => {
                                e.preventDefault();
                                closeMenu();
                                onToggleFavorite?.();
                            }}
                        >
                            <Heart className="h-5 w-5" />
                            <span className="text-sm font-medium">
                                {chat.favorite ? "Eliminar de Favoritos" : "Añadir a Favoritos"}
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-3"
                            onSelect={(e) => {
                                e.preventDefault();
                                closeMenu();
                                if (!onBack) {
                                    return;
                                }
                                onBack();
                            }}
                        >
                            <X className="h-5 w-5" />
                            <span className="text-sm font-medium">Cerrar chat</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-2 bg-whatsapp-border-soft" />
                        <DropdownMenuItem
                            className="gap-3"
                            onSelect={(e) => {
                                e.preventDefault();
                                closeMenu();
                                onClearChat?.();
                            }}
                        >
                            <Trash className="h-5 w-5" />
                            <span className="text-sm font-medium">Vaciar chat</span>
                        </DropdownMenuItem>

                        {canManageChat ? (
                            <DropdownMenuItem
                                className="gap-3"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    closeMenu();
                                    onDeleteChat?.();
                                }}
                            >
                                <Trash2 className="h-5 w-5" />
                                <span className="text-sm font-medium">Eliminar chat</span>
                            </DropdownMenuItem>
                        ) : isGroup ? (
                            <DropdownMenuItem
                                className="gap-3"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    closeMenu();
                                    onLeaveGroup?.();
                                }}
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="text-sm font-medium">Salir del grupo</span>
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

function HeaderIcon({
    children,
    onClick,
    ...props
}: {
    children: React.ReactNode;
    onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel hover:text-whatsapp-text-primary"
            {...props}
        >
            {children}
        </button>
    );
}
