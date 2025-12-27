"use client";

import { useState, useEffect } from "react";
import { X, Check, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type DisappearingOption = "off" | "24h" | "7d" | "90d";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentSetting?: DisappearingOption;
    onConfirm: (setting: DisappearingOption) => void;
};

export function DisappearingMessagesModal({
    open,
    onOpenChange,
    currentSetting = "off",
    onConfirm,
}: Props) {
    const [selected, setSelected] = useState<DisappearingOption>(currentSetting);

    useEffect(() => {
        setSelected(currentSetting);
    }, [currentSetting, open]);

    const handleConfirm = () => {
        onConfirm(selected);
        onOpenChange(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4 overflow-y-auto">
            <div
                className="fixed inset-0 bg-black/40 transition-opacity"
                onClick={() => onOpenChange(false)}
            />

            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-border p-4 px-6">
                    <h3 className="text-lg font-semibold text-whatsapp-text-primary">Mensajes temporales</h3>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="grid h-10 w-10 place-items-center rounded-full  transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="p-6">


                    <div className="space-y-1 mb-6">
                        <RadioRow
                            title="Desactivados"
                            active={selected === "off"}
                            onClick={() => setSelected("off")}
                        />
                        <RadioRow
                            title="24 horas"
                            active={selected === "24h"}
                            onClick={() => setSelected("24h")}
                        />
                        <RadioRow
                            title="7 días"
                            active={selected === "7d"}
                            onClick={() => setSelected("7d")}
                        />
                        <RadioRow
                            title="90 días"
                            active={selected === "90d"}
                            onClick={() => setSelected("90d")}
                        />
                    </div>


                </div>

                <div className="border-t border-border p-4 px-6  flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-11 px-6 rounded-full font-medium dark:text-white hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="h-11 px-8 rounded-full bg-whatsapp-forest font-semibold text-white transition hover:bg-whatsapp-forest/90 shadow-lg shadow-whatsapp-forest/20 active:scale-95"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
}

function RadioRow({
    title,
    active,
    onClick,
}: {
    title: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-all",
                active ? "dark:bg-whatsapp-panel bg-[#F7F5F3]" : "hover:bg-whatsapp-panel hover:bg-[#F7F5F3]"
            )}
        >
            <div className={cn("font-medium", active ? "text-whatsapp-text-primary" : "text-muted-foreground")}>
                {title}
            </div>
            <div
                className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border-2 transition-all duration-300",
                    active
                        ? "border-whatsapp-forest bg-whatsapp-forest text-white scale-110 shadow-sm"
                        : "border-muted-foreground/30"
                )}
            >
                {active ? <Check className="h-3.5 w-3.5" /> : null}
            </div>
        </button>
    );
}
