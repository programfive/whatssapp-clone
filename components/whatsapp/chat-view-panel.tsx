"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./chat-header";
import RealtimeChat from "@/components/realtime-chat";
import { ChatSearchPanel } from "./chat-search-panel";
import { ContactInfoPanel } from "./contact-info-panel";
import { useChatData } from "./hooks/use-chat-data";
import { useChatSearch } from "./hooks/use-chat-search";
import { useChatSelection } from "./hooks/use-chat-selection";
import { DeleteChatsDialog } from "./delete-chats-dialog";
import { ClearChatDialog } from "./clear-chat-dialog";
import { DeleteMessageDialog } from "./delete-message-dialog";
import { DisappearingMessagesModal } from "./disappearing-messages-modal";
import { createClient } from "@/lib/supabase/client";
import type { ChatPreview } from "./types";
import type { WallpaperOption } from "./wallpaper-modal";

type Props = {
    chat: ChatPreview;
    userId: string;
    username: string;
    onlineUserIds: string[];
    onBack: () => void;
    onOpenContactChat?: (contact: { id: string; fullName: string }) => void;
    onToggleFavorite?: (chatId: string, next: boolean) => void;
    onDeleteChat?: (chatId: string, opts: { isGroup: boolean; isCreator: boolean }) => void;
    onLeaveGroup?: (chatId: string) => void;
    allSummaries?: any[];
    onOpenStatus?: (summary: any) => void;
    statusSummary?: any;
    wallpaper?: WallpaperOption;
    className?: string;
};

export function ChatViewPanel({
    chat,
    userId,
    username,
    onlineUserIds,
    onBack,
    onOpenContactChat,
    onToggleFavorite,
    onDeleteChat,
    onLeaveGroup,
    allSummaries,
    onOpenStatus,
    statusSummary,
    wallpaper,
    className,
}: Props) {
    const { theme } = useTheme();
    const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
    const [isDisappearingMessagesOpen, setIsDisappearingMessagesOpen] = useState(false);
    const [addMemberTrigger, setAddMemberTrigger] = useState(0);

    const {
        isGroup,
        groupPhotoUrl,
        otherUserAvatarUrl,
        statusText,
        groupMembersLine,
        groupMemberCount,
        localUnreadMarker,
        otherUserId,
        groupAvatarItems,
        conversationCreatedByName,
        conversationCreatedAt,
        conversationCreatedBy,
    } = useChatData(chat, userId, onlineUserIds);

    const [messages, setMessages] = useState<any[]>([]);

    const {
        isSearchOpen,
        setIsSearchOpen,
        searchQuery,
        setSearchQuery,
        searchDate,
        setSearchDate,
        datePickerOpen,
        setDatePickerOpen,
        groupedResults,
    } = useChatSearch(messages);

    const [scrollToId, setScrollToId] = useState<string | null>(null);

    const {
        isSelectionMode,
        setIsSelectionMode,
        selectedMessageIds,
        deletedMessageIds,
        deleteConfirmOpen,
        setDeleteConfirmOpen,
        clearConfirmOpen,
        setClearConfirmOpen,
        deleteAlsoFromDevice,
        setDeleteAlsoFromDevice,
        toggleMessageSelection,
        exitSelectionMode,
        requestDeleteSelectedMessages,
        confirmDeleteForMe,
        canDeleteForAll,
        confirmDeleteForAll,
        clearChatForMe,
        clearChatForAll,
    } = useChatSelection(chat, userId, username, messages);

    const [deleteChatConfirmOpen, setDeleteChatConfirmOpen] = useState(false);

    const handleMessageClick = (messageId: string) => {
        setScrollToId(messageId);
        setIsSearchOpen(false);
    };

    const handleUpdateDisappearing = async (setting: "off" | "24h" | "7d" | "90d") => {
        const supabase = createClient();
        await supabase.rpc("update_conversation_settings", {
            p_conversation_id: chat.id,
            p_group_settings: { disappearing: setting },
        });
        setIsDisappearingMessagesOpen(false);
    };

    const wallpaperStyle = () => {
        const wp = wallpaper || { id: "default", type: "pattern", value: "default" };
        if (wp.id === "none") return {};

        if (wp.id === "default" || wp.id === "pattern") {
            const img = theme === "dark" ? "/img/background-dark.png" : "/img/background-light.png";
            return {
                backgroundImage: `url(${img})`,
                backgroundRepeat: "repeat",
                backgroundSize: "450px",
            };
        }

        if (wp.type === "color") return { backgroundColor: wp.value };
        if (wp.type === "image") {
            return {
                backgroundImage: `url(${wp.value})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            };
        }
        return {};
    };

    return (
        <div className={cn("flex min-w-0 flex-1 overflow-hidden", className)}>
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#efe7de] dark:bg-[#161717]">
                <ChatHeader
                    chat={chat}
                    isSearchOpen={isSearchOpen}
                    onOpenSearch={() => {
                        setIsContactInfoOpen(false);
                        setIsSearchOpen(true);
                    }}
                    onCloseSearch={() => setIsSearchOpen(false)}
                    isContactInfoOpen={isContactInfoOpen}
                    onCloseContactInfo={() => setIsContactInfoOpen(false)}
                    isSelectionMode={isSelectionMode}
                    onExitSelectionMode={exitSelectionMode}
                    selectedCount={selectedMessageIds.length}
                    isGroup={isGroup}
                    otherUserAvatarUrl={otherUserAvatarUrl}
                    onOpenContactInfo={() => {
                        setIsSearchOpen(false);
                        setIsContactInfoOpen(true);
                    }}
                    onEnterSelectionMode={() => setIsSelectionMode(true)}
                    canManageChat={!isGroup && chat.name !== "Yo (Tú)"}
                    onClearChat={() => setClearConfirmOpen(true)}
                    onDeleteChat={() => setDeleteChatConfirmOpen(true)}
                    onLeaveGroup={() => onLeaveGroup?.(chat.id)}
                    onToggleFavorite={() => onToggleFavorite?.(chat.id, !chat.favorite)}
                    onBack={onBack}
                    groupPhotoUrl={groupPhotoUrl}
                    statusText={statusText}
                    groupAvatarItems={groupAvatarItems}
                    onOpenDisappearingMessages={() => setIsDisappearingMessagesOpen(true)}
                    isDisappearingMessagesOpen={isDisappearingMessagesOpen}
                    onCloseDisappearingMessages={() => setIsDisappearingMessagesOpen(false)}
                    statusSummary={statusSummary}
                    onOpenStatus={onOpenStatus}
                    currentDisappearingSetting={chat.disappearingSetting}
                />

                <div className="relative flex-1 overflow-hidden">
                    {/* Wallpaper Layer - Only visible when NOT searching */}
                    {!isSearchOpen && (
                        <div
                            className={cn(
                                "absolute inset-0 pointer-events-none transition-opacity duration-500",
                                (!wallpaper || wallpaper.id === "default" || wallpaper.type === "pattern")
                                    ? (theme === "dark" ? "opacity-30" : "opacity-40")
                                    : "opacity-100"
                            )}
                            style={wallpaperStyle()}
                        />
                    )}

                    {isSearchOpen ? (
                        <div className="absolute inset-0 z-10 bg-white dark:bg-[#161717]">
                            <ChatSearchPanel
                                searchQuery={searchQuery}
                                onSearchQueryChange={setSearchQuery}
                                searchDate={searchDate}
                                onSearchDateChange={setSearchDate}
                                datePickerOpen={datePickerOpen}
                                onDatePickerOpenChange={setDatePickerOpen}
                                groupedResults={groupedResults}
                                onClose={() => setIsSearchOpen(false)}
                                onMessageClick={handleMessageClick}
                            />
                        </div>
                    ) : isContactInfoOpen ? (
                        <div className="absolute inset-0 z-10 bg-white dark:bg-[#161717]">
                            <ContactInfoPanel
                                open={isContactInfoOpen}
                                conversationId={chat.id}
                                isGroup={isGroup}
                                groupTitle={chat.name}
                                groupPhotoUrl={groupPhotoUrl}
                                groupMembersLine={groupMembersLine}
                                groupMemberCount={groupMemberCount}
                                userId={userId}
                                contactUserId={otherUserId}
                                onClose={() => setIsContactInfoOpen(false)}
                                showHeader={false}
                                addMemberTrigger={addMemberTrigger}
                                onOpenChatSearch={() => {
                                    setIsContactInfoOpen(false);
                                    setIsSearchOpen(true);
                                }}
                            />
                        </div>
                    ) : (
                        <RealtimeChat
                            conversationId={chat.id}
                            userId={userId}
                            username={username}
                            isGroup={isGroup}
                            onOpenContactChat={onOpenContactChat}
                            onOpenContactInfo={() => setIsContactInfoOpen(true)}
                            onMessage={setMessages}
                            unreadMarker={localUnreadMarker}
                            selectionMode={isSelectionMode}
                            selectedMessageIds={selectedMessageIds}
                            onToggleMessageSelect={toggleMessageSelection}
                            onExitSelectionMode={exitSelectionMode}
                            onDeleteSelectedMessages={requestDeleteSelectedMessages}
                            hiddenMessageIds={deletedMessageIds}
                            scrollToMessageId={scrollToId}
                            chatName={chat.name}
                            chatAvatarUrl={isGroup ? groupPhotoUrl : otherUserAvatarUrl}
                            groupIntroCardProps={isGroup ? {
                                title: chat.name,
                                photoUrl: groupPhotoUrl,
                                onOpenInfo: () => setIsContactInfoOpen(true),
                                onAddDescription: () => {
                                    setIsContactInfoOpen(true);
                                }
                            } : undefined}
                            creationNoticeText={
                                isGroup
                                    ? `Tú creaste este grupo el ${conversationCreatedAt ? new Date(conversationCreatedAt).toLocaleDateString("es-ES") : "un momento"}`
                                    : `Este chat fue creado el ${conversationCreatedAt ? new Date(conversationCreatedAt).toLocaleDateString("es-ES") : "un momento"}`
                            }
                        />
                    )}
                </div>

                <DeleteChatsDialog
                    open={deleteChatConfirmOpen}
                    onOpenChange={setDeleteChatConfirmOpen}
                    count={1}
                    chatName={chat.name}
                    canDeleteForAll={isGroup && (chat.isCreator ?? conversationCreatedBy === userId)}
                    onConfirmForMe={() => {
                        onDeleteChat?.(chat.id, { isGroup: !!isGroup, isCreator: false });
                        setDeleteChatConfirmOpen(false);
                    }}
                    onConfirmForAll={() => {
                        onDeleteChat?.(chat.id, { isGroup: true, isCreator: true });
                        setDeleteChatConfirmOpen(false);
                    }}
                />

                <ClearChatDialog
                    open={clearConfirmOpen}
                    onOpenChange={setClearConfirmOpen}
                    onConfirmForMe={() => {
                        clearChatForMe();
                        setClearConfirmOpen(false);
                    }}
                    onConfirmForAll={() => {
                        clearChatForAll();
                        setClearConfirmOpen(false);
                    }}
                    canClearForAll={isGroup}
                />

                <DeleteMessageDialog
                    open={deleteConfirmOpen}
                    onOpenChange={setDeleteConfirmOpen}
                    onConfirm={() => {
                        confirmDeleteForMe();
                        setDeleteConfirmOpen(false);
                    }}
                    onConfirmForAll={() => {
                        confirmDeleteForAll();
                        setDeleteConfirmOpen(false);
                    }}
                    canDeleteForAll={canDeleteForAll}
                />

                <DisappearingMessagesModal
                    open={isDisappearingMessagesOpen}
                    onOpenChange={setIsDisappearingMessagesOpen}
                    currentSetting={chat.disappearingSetting}
                    onConfirm={handleUpdateDisappearing}
                />
            </div>
        </div>
    );
}
