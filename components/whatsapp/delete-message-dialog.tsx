type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    canDeleteForAll?: boolean;
    onConfirmForAll?: () => void;
};

export function DeleteMessageDialog({
    open,
    onOpenChange,
    onConfirm,
    canDeleteForAll = false,
    onConfirmForAll,
}: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-[450px] rounded-xl bg-white p-8 shadow-2xl dark:bg-[#161717] text-center animate-in fade-in zoom-in-95 duration-200"
            >
                <h3 className="text-xl font-bold text-whatsapp-text-primary">
                    ¿Deseas eliminar estos mensajes?
                </h3>

                <p className="mt-4 text-[15px] leading-relaxed text-[#8696a0]">
                    Los mensajes eliminados no se pueden recuperar. Esta acción es permanente.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {canDeleteForAll && onConfirmForAll && (
                        <button
                            type="button"
                            onClick={() => {
                                onConfirmForAll();
                                onOpenChange(false);
                            }}
                            className="md:w-fit w-full rounded-full bg-[#f15c6d] hover:bg-[#e54b5d] px-6 py-3 font-semibold text-white transition-all active:scale-[0.98]"
                        >
                            Eliminar para todos
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                        className={
                            canDeleteForAll
                                ? "md:w-fit w-full rounded-full bg-[#F7F5F3] hover:bg-[#e9e7e5] text-whatsapp-text-primary dark:bg-whatsapp-panel dark:text-white dark:hover:bg-white/10 px-6 py-3 font-semibold transition-all active:scale-[0.98]"
                                : "md:w-fit w-full rounded-full bg-[#f15c6d] hover:bg-[#e54b5d] px-6 py-3 font-semibold text-white transition-all active:scale-[0.98]"
                        }
                    >
                        Eliminar para mí
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="md:w-fit w-full  px-6 py-3 rounded-full hover:bg-[#F7F5F3] font-semibold dark:hover:bg-whatsapp-panel dark:hover:text-white transition-colors active:scale-95"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
