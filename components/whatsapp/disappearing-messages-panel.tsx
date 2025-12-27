"use client";

import { useState, useEffect } from "react";
import { Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageTemporary } from "../icons/message-temporary";

type DisappearingOption = "off" | "24h" | "7d" | "90d";

type Props = {
    currentSetting?: DisappearingOption;
    onConfirm: (setting: DisappearingOption) => void;
    onClose: () => void;
};

export function DisappearingMessagesPanel({
    currentSetting = "off",
    onConfirm,
    onClose,
}: Props) {
    const [selected, setSelected] = useState<DisappearingOption>(currentSetting);

    useEffect(() => {
        setSelected(currentSetting);
    }, [currentSetting]);

    const handleSelect = (option: DisappearingOption) => {
        setSelected(option);
        onConfirm(option);
    };

    return (
        <div className="absolute inset-0 flex flex-col  text-whatsapp-text-primary bg-white dark:bg-[#161717] animate-in slide-in-from-right duration-300">
            <ScrollArea className="h-full w-full">
                <div className="flex flex-col items-center px-6 py-6 pb-24  mx-auto">
                    {/* Illustration Area */}
                    <div className="relative mb-6 flex h-32 w-full items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-whatsapp-forest/10 opacity-30 blur-3xl" />
                        <MessageTemporary className="relative z-10 h-full w-auto w-64 h-64" />
                    </div>

                    <div className="text-left w-full px-2">
                        <h3 className="mb-3 text-[1rem] font-medium text-whatsapp-text-primary">
                            Activa los mensajes temporales en este chat
                        </h3>
                        <p className="text-[0.85rem] leading-relaxed text-whatsapp-text-muted">
                            A fin de brindarte más privacidad y almacenamiento, los mensajes nuevos desaparecerán para todos los participantes de este chat después de transcurrido el tiempo seleccionado, excepto los mensajes que se conserven. Cualquier participante del chat puede cambiar este ajuste.{" "}
                            <span className="cursor-pointer text-whatsapp-forest-light hover:underline font-medium">
                                Más información
                            </span>
                        </p>
                    </div>

                    <div className="mt-6 w-full space-y-0.5">
                        <RadioRow
                            title="24 horas"
                            active={selected === "24h"}
                            onClick={() => handleSelect("24h")}
                        />
                        <RadioRow
                            title="7 días"
                            active={selected === "7d"}
                            onClick={() => handleSelect("7d")}
                        />
                        <RadioRow
                            title="90 días"
                            active={selected === "90d"}
                            onClick={() => handleSelect("90d")}
                        />
                        <RadioRow
                            title="Desactivados"
                            active={selected === "off"}
                            onClick={() => handleSelect("off")}
                        />
                    </div>

                    <div className="mt-8 flex w-full items-start gap-4 rounded-xl bg-white dark:bg-[#161717] p-4  border border-border">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-whatsapp-text-muted" />
                        <p className="text-[0.8rem] leading-snug text-whatsapp-text-muted">
                            Los cambios se aplicarán a los mensajes enviados después de activar o cambiar el ajuste.
                        </p>
                    </div>
                </div>
            </ScrollArea>
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
            className="flex w-full rounded-xl items-center gap-6 px-4 py-3.5 text-left transition-colors hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-charcoal-deep"
        >
            <div
                className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    active
                        ? "border-whatsapp-forest bg-whatsapp-forest text-white"
                        : "border-whatsapp-text-muted/40 text-whatsapp-text-muted"
                )}
            >
                {active ? <Check className="h-3.5 w-3.5" /> : null}
            </div>
            <div className={cn(
                "text-[0.95rem] transition-colors",
                active ? "text-whatsapp-text-primary" : "text-whatsapp-text-primary/90"
            )}>
                {title}
            </div>
        </button>
    );
}
