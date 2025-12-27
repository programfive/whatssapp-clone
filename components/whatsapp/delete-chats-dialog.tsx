import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    count: number;
    canDeleteForAll?: boolean;
    onConfirmForMe: () => void;
    onConfirmForAll?: () => void;
    chatName?: string;
};

export function DeleteChatsDialog({
    open,
    onOpenChange,
    count,
    canDeleteForAll = false,
    onConfirmForMe,
    onConfirmForAll,
    chatName,
}: Props) {
    if (!open) return null;

    const title = chatName
        ? `¿Deseas eliminar el chat con ${chatName}?`
        : `¿Eliminar ${count} ${count === 1 ? "chat" : "chats"}?`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div
                className="w-full max-w-[450px] rounded-xl bg-white p-8 dark:bg-[#161717] text-center animate-in fade-in zoom-in-95 duration-200"
            >
                <h3 className="text-xl font-bold text-whatsapp-text-primary">
                    {title}
                </h3>

                <p className="mt-4 text-[15px] leading-relaxed text-[#8696a0]">
                    {canDeleteForAll
                        ? "Esta acción no se puede deshacer. Los chats seleccionados son grupos que creaste, puedes eliminarlos para todos."
                        : "Se eliminarán los mensajes de todos los dispositivos."}
                </p>

                <div className="mt-8 flex items-center justify-end px-2 gap-4">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="px-8 py-3 rounded-full hover:bg-[#F7F5F3] font-semibold  dark:hover:bg-whatsapp-panel dark:hover:text-white  transition-colors hover:opacity-80 active:scale-95"
                    >
                        Cancelar
                    </button>

                    <div className="flex gap-3">
                        {canDeleteForAll && onConfirmForAll && (
                            <button
                                type="button"
                                onClick={() => {
                                    onConfirmForAll();
                                    onOpenChange(false);
                                }}
                                className="rounded-full bg-[#f15c6d] px-8 py-3  font-semibold text-white transition hover:opacity-90 active:scale-[0.98] shadow-md"
                            >
                                Eliminar para todos
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                onConfirmForMe();
                                onOpenChange(false);
                            }}
                            className={cn(
                                "rounded-full px-8 py-3  font-semibold transition active:scale-[0.98] shadow-md",
                                canDeleteForAll
                                    ? "bg-[#F7F5F3] text-whatsapp-text-primary dark:bg-whatsapp-panel dark:text-white dark:hover:bg-white/5"
                                    : "bg-[#f15c6d] text-white hover:opacity-90"
                            )}
                        >
                            {canDeleteForAll ? "Eliminar para mí" : "Eliminar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
