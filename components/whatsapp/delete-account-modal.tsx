"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userName: string;
    onConfirm: () => Promise<void>;
};

export function DeleteAccountModal({
    open,
    onOpenChange,
    userName,
    onConfirm,
}: Props) {
    const [inputValue, setInputValue] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const lowerUserName = userName.toLowerCase();
    const isMatched = inputValue.toLowerCase() === lowerUserName;

    const handleConfirm = async () => {
        if (!isMatched || isDeleting) return;

        setIsDeleting(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err: any) {
            setError(err.message || "No se pudo eliminar la cuenta. Inténtalo de nuevo.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
            <div
                className="w-full max-w-[450px] rounded-xl bg-white p-8 shadow-2xl dark:bg-[#161717] animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-500">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-whatsapp-text-primary">Eliminar cuenta</h3>
                        <p className="text-sm text-[#8696a0]">Esta acción es irreversible</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl bg-red-500/5 p-5 border border-red-500/10">
                        <p className="text-[15px] font-medium text-red-600 dark:text-red-400">
                            Se eliminará permanentemente:
                        </p>
                        <ul className="mt-2 text-sm text-red-600/80 dark:text-red-400/80 list-disc list-inside space-y-1">
                            <li>Tu perfil y foto de avatar</li>
                            <li>Tus mensajes y multimedia</li>
                            <li>Tu participación en grupos</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[15px] text-[#8696a0] leading-relaxed">
                            Para confirmar, escribe tu nombre: <span className="font-semibold text-whatsapp-text-primary">"{userName}"</span>
                        </p>

                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isDeleting}
                            autoFocus
                            placeholder="Escribe tu nombre aquí"
                            className="w-full h-12 px-5 rounded-2xl border-2 border-border/20 bg-transparent focus:border-red-500 outline-none transition-all placeholder:text-[#8696a0]/50 text-whatsapp-text-primary"
                        />

                        {error && (
                            <p className="text-sm text-red-500 font-medium px-2">{error}</p>
                        )}
                    </div>
                </div>

                <div className="mt-10 flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => !isDeleting && onOpenChange(false)}
                        disabled={isDeleting}
                        className="px-8 py-3 rounded-full hover:bg-[#F7F5F3] font-semibold dark:hover:bg-whatsapp-panel dark:hover:text-white transition-colors hover:opacity-80 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!isMatched || isDeleting}
                        className={cn(
                            "h-12 px-8 rounded-full font-semibold transition active:scale-95 flex items-center justify-center gap-2 shadow-lg",
                            isMatched && !isDeleting
                                ? "bg-[#f15c6d] text-white hover:opacity-90 shadow-red-500/20"
                                : "bg-[#f15c6d]/30 text-white/40 cursor-not-allowed"
                        )}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Eliminando...</span>
                            </>
                        ) : (
                            <span>Eliminar cuenta</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
