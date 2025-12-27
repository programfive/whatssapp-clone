"use client";

import { Info, ShieldBan } from "lucide-react";

type Props = {
    phoneNumber: string; // Or name
    avatarUrl?: string | null;
    fallbackInitial?: string;
    onBlock?: () => void;
    onOpenContactInfo?: () => void;
    onDelete?: () => void;
};

export function NewChatActions({
    phoneNumber,
    avatarUrl,
    fallbackInitial,
    onOpenContactInfo,
    onDelete,
}: Props) {
    return (
        <div className="bg-whatsapp-charcoal text-whatsapp-text-primary rounded-2xl border border-whatsapp-border-soft px-5 py-3 text-xs font-semibold w-full max-w-md mx-auto">
            <div className="mb-2 text-lg font-semibold tracking-tight text-center">
                Este remitente no está en tus contactos.
            </div>

            <div className="mb-2  flex items-center justify-center gap-3">
                {avatarUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-full">
                        <img
                            src={avatarUrl}
                            alt={phoneNumber}
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-whatsapp-charcoal text-whatsapp-text-primary">
                        <span className="text-2xl">{fallbackInitial ?? "?"}</span>
                    </div>
                )}
                <div className="text-left">
                    <div className="text-lg font-medium text-whatsapp-text-primary">{phoneNumber}</div>
                    <div className="text-sm text-whatsapp-text-muted dark:text-white/70">Desconocido</div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row w-full  mt-4 justify-center w-full items-center gap-4">
                <button
                    type="button"
                    onClick={onDelete}
                    className="h-10 cursor-pointer w-full md:w-fit inline-flex px-4 items-center justify-center gap-2 rounded-full border border-whatsapp-border-soft text-red-500 hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel dark:border-white/10"
                >
                    <ShieldBan className="h-4 w-4" />
                    <span className="text-sm font-medium">Bloquear</span>
                </button>
                <button
                    type="button"
                    onClick={onOpenContactInfo}
                    className="h-10 cursor-pointer w-full md:w-fit md:w-fit inline-flex gap-2 cursor-pointer items-center justify-center rounded-full bg-whatsapp-forest px-6 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-whatsapp-deep-forest"
                >
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">Info. del contacto</span>
                </button>
            </div>
        </div>
    );
}
