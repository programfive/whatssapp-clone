"use client";

import { ArrowLeft, FileText, Clock, Download, Info, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

type RequestStatus = {
    requested_at: string;
    status: "pending" | "ready";
    ready_at?: string;
};

type Props = {
    className?: string;
    onBack: () => void;
};

export function RequestInfoPanel({ className, onBack }: Props) {
    const [request, setRequest] = useState<RequestStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        async function loadStatus() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("profiles")
                .select("settings")
                .eq("id", user.id)
                .maybeSingle();

            if (data?.settings?.account_info_request) {
                setRequest(data.settings.account_info_request);
            }
            setIsLoading(false);
        }
        loadStatus();
    }, [supabase]);

    const handleRequest = async () => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const newRequest: RequestStatus = {
                requested_at: new Date().toISOString(),
                status: "pending"
            };

            // In a real app, this would be a server-side process.
            // For the clone, we'll just update the settings.
            const { data: profile } = await supabase
                .from("profiles")
                .select("settings")
                .eq("id", user.id)
                .maybeSingle();

            const currentSettings = profile?.settings || {};
            const nextSettings = {
                ...currentSettings,
                account_info_request: newRequest
            };

            const { error } = await supabase
                .from("profiles")
                .update({ settings: nextSettings })
                .eq("id", user.id);

            if (error) throw error;
            setRequest(newRequest);
        } catch (error) {
            console.error("Error requesting info:", error);
            alert("No se pudo procesar la solicitud.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = () => {
        // Simulate report download
        const reportData = {
            app: "WhatsApp Clone",
            generated_at: new Date().toISOString(),
            user_info: "Datos de perfil y configuración",
            disclaimer: "Este es un informe generado automáticamente."
        };
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "informe-de-cuenta.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    if (isLoading) {
        return (
            <div className={cn("flex h-full w-full flex-col bg-card", className)}>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-whatsapp-forest" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex h-full w-full flex-col bg-white dark:bg-[#161717] overflow-hidden", className)}>
            <header className="flex items-center gap-6 px-6 py-4 pt-12 shrink-0">
                <button onClick={onBack} className="hover:opacity-80 transition-opacity">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-lg font-medium text-whatsapp-text-primary">Solicitar info. de mi cuenta</h1>
            </header>

            <ScrollArea className="flex-1 min-h-0">
                <div className="px-6 py-4 space-y-6 pb-20">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full bg-whatsapp-forest/10 flex items-center justify-center">
                                <FileText className="h-12 w-12" />
                            </div>
                            {request?.status === "pending" && (
                                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-[#161717] border shadow-sm flex items-center justify-center">
                                    <Clock className="h-5 w-5" />
                                </div>
                            )}
                            {request?.status === "ready" && (
                                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-[#161717] border shadow-sm flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 max-w-sm">
                            <h2 className="text-xl font-semibold text-whatsapp-text-primary">
                                {request ? "Tu informe ha sido solicitado" : "Solicita un informe de tu cuenta"}
                            </h2>
                            <p className="text-sm text-whatsapp-text-muted leading-relaxed">
                                {request?.status === "pending"
                                    ? `Tu informe estará listo el ${formatDate(new Date(new Date(request.requested_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString())}. Si realizas cambios en tu cuenta, como cambiar de número o eliminarla, se cancelará tu solicitud.`
                                    : "Crea un informe de tus ajustes y tu información de tu cuenta de WhatsApp que podrás ver o exportar a otra aplicación. Este informe no incluye tus mensajes."}
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-border/50" />

                    <div className="space-y-6">
                        {!request ? (
                            <button
                                onClick={handleRequest}
                                disabled={isSubmitting}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-3 mb-1 transition hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center text-whatsapp-text-muted">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="truncate text-sm font-medium text-whatsapp-text-primary">Solicitar informe</div>
                                        <div className="truncate text-xs text-whatsapp-text-muted">Listo en aproximadamente 3 días.</div>
                                    </div>
                                </div>
                                {isSubmitting && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-whatsapp-text-muted" />}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-3 py-3">
                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center text-whatsapp-text-muted">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="truncate text-sm font-medium text-whatsapp-text-primary">Estado de la solicitud</div>
                                        <div className="truncate text-xs text-whatsapp-text-muted">
                                            {request.status === "pending" ? "Pendiente" : "Listo para descargar"}
                                        </div>
                                    </div>
                                </div>

                                {request.status === "ready" && (
                                    <button
                                        onClick={handleDownload}
                                        className="flex w-full items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-[#F7F5F3] dark:hover:bg-whatsapp-panel text-left"
                                    >
                                        <div className="h-10 w-10 shrink-0 flex items-center justify-center text-whatsapp-text-muted">
                                            <Download className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="truncate text-sm font-medium text-whatsapp-text-primary">Descargar informe</span>
                                        </div>
                                    </button>
                                )}

                                <div className="bg-whatsapp-panel rounded-xl p-4 flex gap-4 border border-border/50">
                                    <Info className="h-5 w-5 text-whatsapp-text-muted shrink-0 mt-0.5" />
                                    <p className="text-xs text-whatsapp-text-muted leading-relaxed">
                                        Tu informe de la cuenta estará disponible para descargar durante algunas semanas después de que esté listo.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
