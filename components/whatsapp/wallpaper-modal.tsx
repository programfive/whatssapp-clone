import React, { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Image as ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export type WallpaperOption = {
    id: string;
    name: string;
    type: "color" | "pattern" | "image";
    value: string;
};

const WALLPAPERS: WallpaperOption[] = [
    { id: "default", name: "Predeterminado", type: "pattern", value: "default" },
    { id: "teal", name: "Teal", type: "color", value: "#008080" },
    { id: "emerald", name: "Emerald", type: "color", value: "#10b981" },
    { id: "blue", name: "Blue", type: "color", value: "#3498db" },
    { id: "indigo", name: "Indigo", type: "color", value: "#6366f1" },
    { id: "purple", name: "Purple", type: "color", value: "#9b59b6" },
    { id: "violet", name: "Violet", type: "color", value: "#8b5cf6" },
    { id: "rose", name: "Rose", type: "color", value: "#e91e63" },
    { id: "pink", name: "Pink", type: "color", value: "#f43f5e" },
    { id: "orange", name: "Orange", type: "color", value: "#e67e22" },
    { id: "amber", name: "Amber", type: "color", value: "#f59e0b" },
    { id: "yellow", name: "Yellow", type: "color", value: "#eab308" },
    { id: "gray", name: "Gray", type: "color", value: "#95a5a6" },
    { id: "slate", name: "Slate", type: "color", value: "#64748b" },
    { id: "dark", name: "Dark", type: "color", value: "#2c3e50" },
    { id: "night", name: "Night", type: "color", value: "#111b21" },
    { id: "deep-black", name: "Pure Black", type: "color", value: "#000000" },
    { id: "forest", name: "Forest", type: "color", value: "#064e3b" },
    { id: "ocean", name: "Ocean", type: "color", value: "#1e3a8a" },
    { id: "wine", name: "Wine", type: "color", value: "#7f1d1d" },
];

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentValue?: string;
    onConfirm: (wallpaper: WallpaperOption) => void;
};

export function WallpaperModal({
    open,
    onOpenChange,
    currentValue = "default",
    onConfirm,
}: Props) {
    const { theme } = useTheme();
    const [selected, setSelected] = useState<string>(currentValue);
    const [customImage, setCustomImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!open) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setCustomImage(result);
                setSelected("custom");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = () => {
        if (selected === "custom" && customImage) {
            onConfirm({
                id: "custom",
                name: "Personalizado",
                type: "image",
                value: customImage,
            });
        } else {
            const found = WALLPAPERS.find((w) => w.id === selected) || WALLPAPERS[0];
            onConfirm(found);
        }
        onOpenChange(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/40 transition-opacity"
                onClick={() => onOpenChange(false)}
            />

            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <header className="flex shrink-0 items-center justify-between border-b border-border p-4 px-6 bg-background">
                    <h3 className="text-lg font-semibold text-whatsapp-text-primary">Fondo del chat</h3>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="grid h-10 w-10 place-items-center rounded-full transition-colors text-muted-foreground hover:text-foreground hover:dark:bg-whatsapp-panel hover:bg-[#F7F5F3] "
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0 bg-background/50 custom-scrollbar">
                    <div className="p-6">
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6  p-4 rounded-2xl border border-border">
                            <div className="flex items-center gap-4">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl ">
                                    <ImageIcon className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-semibold">Personaliza tu chat</h4>
                                    <p className="text-sm text-muted-foreground leading-snug">
                                        Selecciona un color, patrón o sube tu propia foto.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className=" flex justify-center  gap-2 py-3 px-2 rounded-full px-3 text-xs font-medium transition-colors hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel border-border border dark:text-white hover:text-whatsapp-text-primary"
                            >
                                <Upload className="h-4 w-4" />
                                <span>Subir foto</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {customImage && (
                                <div className="relative group aspect-square">
                                    <button
                                        onClick={() => setSelected("custom")}
                                        className={cn(
                                            "h-full w-full overflow-hidden rounded-xl border-2 transition-all duration-300",
                                            selected === "custom"
                                                ? "border-whatsapp-forest ring-4 ring-whatsapp-forest/20"
                                                : "border-transparent hover:border-whatsapp-forest/30"
                                        )}
                                    >
                                        <img src={customImage} alt="Custom" className="h-full w-full object-cover" />
                                    </button>
                                    {selected === "custom" && (
                                        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-whatsapp-forest p-1 shadow-lg">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {WALLPAPERS.map((wp) => (
                                <div key={wp.id} className="relative group aspect-square">
                                    <button
                                        onClick={() => setSelected(wp.id)}
                                        className={cn(
                                            "h-full w-full overflow-hidden rounded-xl border-2 transition-all duration-300",
                                            selected === wp.id
                                                ? "border-whatsapp-forest ring-4 ring-whatsapp-forest/20"
                                                : "border-transparent hover:border-whatsapp-forest/30"
                                        )}
                                        title={wp.name}
                                    >
                                        {wp.type === "pattern" ? (
                                            <div className={cn(
                                                "h-full w-full bg-repeat transition-opacity duration-300",
                                                theme === "dark"
                                                    ? "bg-[#0b141a] bg-[url('/img/background-dark.png')] opacity-40 group-hover:opacity-60"
                                                    : "bg-[#efeae2] bg-[url('/img/background-light.png')] opacity-60 group-hover:opacity-80"
                                            )} style={{ backgroundSize: '450px' }} />
                                        ) : (
                                            <div
                                                className="h-full w-full transition-transform duration-500 group-hover:scale-110"
                                                style={{ backgroundColor: wp.value }}
                                            />
                                        )}
                                    </button>
                                    {selected === wp.id && (
                                        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-whatsapp-forest p-1 shadow-lg">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-border p-4 px-6 flex justify-end gap-3 bg-background relative z-10">
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
                        Guardar
                    </button>
                </div>

                <style jsx>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(0, 0, 0, 0.1);
                        border-radius: 10px;
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 0, 0, 0.2);
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }
                `}</style>
            </div>
        </div>
    );
}
