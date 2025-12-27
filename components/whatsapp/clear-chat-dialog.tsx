import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canClearForAll?: boolean;
    onConfirmForMe: () => void;
    onConfirmForAll?: () => void;
};

export function ClearChatDialog({
    open,
    onOpenChange,
    canClearForAll = false,
    onConfirmForMe,
    onConfirmForAll,
}: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div
                className="w-full max-w-[450px] rounded-xl bg-white p-8 dark:bg-[#161717] text-center animate-in fade-in zoom-in-95 duration-200"
            >
                <h3 className="text-xl font-bold text-whatsapp-text-primary">¿Deseas vaciar este chat?</h3>

                <p className="mt-4 text-[15px] leading-relaxed text-[#8696a0]">
                    Esta acción eliminará el historial de mensajes de tu vista. No se puede deshacer.
                </p>

                <div className="mt-8 flex items-center justify-end px-2 gap-4">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="px-8 py-3 rounded-full hover:bg-[#F7F5F3] font-semibold dark:hover:bg-whatsapp-panel dark:hover:text-white transition-colors hover:opacity-80 active:scale-95"
                    >
                        Cancelar
                    </button>

                    <div className="flex gap-3">
                        {canClearForAll && onConfirmForAll && (
                            <button
                                type="button"
                                onClick={() => {
                                    onConfirmForAll();
                                    onOpenChange(false);
                                }}
                                className="rounded-full bg-whatsapp-forest px-8 py-3 font-semibold text-white transition hover:bg-whatsapp-forest-dark active:scale-[0.98] shadow-md"
                            >
                                Vaciar para todos
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                onConfirmForMe();
                                onOpenChange(false);
                            }}
                            className={cn(
                                "rounded-full px-8 py-3 font-semibold transition active:scale-[0.98] shadow-md",
                                canClearForAll
                                    ? "bg-[#F7F5F3] text-whatsapp-text-primary dark:bg-whatsapp-panel dark:text-white dark:hover:bg-white/5"
                                    : "bg-[#f15c6d] text-white hover:opacity-90"
                            )}
                        >
                            {canClearForAll ? "Vaciar para mí" : "Vaciar chat"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
