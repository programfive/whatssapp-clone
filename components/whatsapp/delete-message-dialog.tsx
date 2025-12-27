import { cn } from "@/lib/utils";

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
                className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-[#161717] bg-white animate-in zoom-in-95 duration-200"
            >
                <h3 className="mb-6 text-xl font-medium text-[#161717] dark:text-[#e9edef]">
                    ¿Deseas eliminar estos mensajes?
                </h3>

                <div className="flex flex-col items-end gap-3">
                    {canDeleteForAll && onConfirmForAll && (
                        <button
                            type="button"
                            onClick={() => {
                                onConfirmForAll();
                                onOpenChange(false);
                            }}
                            className="w-full max-w-[200px] rounded-full  px-4 py-2.5 text-sm font-semibold t hover:shadow-sm dark:border-whatsapp-border-soft dark:text-whatsapp-green bg-red-500 "
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
                        className="w-full max-w-[200px] rounded-full  px-4 py-2.5 text-sm font-semibold t hover:shadow-sm dark:border-whatsapp-border-soft dark:text-whatsapp-green bg-red-500 "
                    >
                        Eliminar para mí
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="w-full max-w-[200px] rounded-full  hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel dark:bg-hidden px-4 py-2.5 text-sm font-semibol"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
