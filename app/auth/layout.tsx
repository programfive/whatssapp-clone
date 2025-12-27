"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WhatsAppLogoAuth } from "@/components/icons/whatsapp-logo-auth";
import { WhatsAppWordmark } from "@/components/icons/whatsapp-wordmark";
import { LoginUpsellIllustration } from "@/components/icons/login-upsell-illustration";
import { LockSmall } from "@/components/icons/lock-small";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Determinar el modo basado en la ruta
    const getMode = () => {
        if (pathname.includes('/login')) return 'login';
        if (pathname.includes('/sign-up-success')) return 'signup-success';
        if (pathname.includes('/sign-up')) return 'signup';
        if (pathname.includes('/forgot-password')) return 'forgot-password';
        if (pathname.includes('/update-password')) return 'update-password';
        return 'login';
    };

    const mode = getMode();

    const getTitle = () => {
        switch (mode) {
            case 'login': return 'Pasos para iniciar sesión';
            case 'signup': return 'Pasos para crear cuenta';
            case 'forgot-password': return 'Recupera tu cuenta';
            case 'signup-success': return 'Verifica tu cuenta';
            case 'update-password': return 'Actualiza tu contraseña';
            default: return 'Pasos para iniciar sesión';
        }
    };

    const getSteps = () => {
        if (mode === 'forgot-password' || mode === 'update-password' || mode === 'signup-success') {
            return [
                mode === 'forgot-password'
                    ? 'Ingresa tu correo electrónico asociado a tu cuenta.'
                    : mode === 'signup-success'
                        ? 'Confirma que tu dirección de correo electrónico es correcta.'
                        : 'Ingresa tu nueva contraseña.',
                mode === 'forgot-password'
                    ? 'Recibirás un enlace para restablecer tu contraseña.'
                    : mode === 'signup-success'
                        ? 'Abre el enlace que te enviamos para activar tu cuenta.'
                        : 'Guarda los cambios y serás redirigido al inicio.',
                mode === 'forgot-password'
                    ? 'Sigue las instrucciones del correo para crear una nueva contraseña.'
                    : mode === 'signup-success'
                        ? 'Inicia sesión en WhatsApp Web y comienza a chatear.'
                        : 'Vuelve a iniciar sesión con tu nueva contraseña.'
            ];
        }
        return [
            <>Abre <span className="inline-flex items-center gap-1 rounded-full border border-[#d2f4c6] bg-[#d2f4c6]/70 px-2 py-0.5 text-[#128c7e] text-sm font-semibold"> WhatsApp Web</span> en tu navegador de escritorio.</>,
            <>Haz clic en <strong>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</strong> y selecciona la opción <strong>Correo y contraseña</strong> para ingresar tus datos.</>,
            'Verifica tu bandeja de correo y confirma el código que enviamos para activar la sesión en el navegador.',
            <>También puedes continuar con <strong>Google</strong> o <strong>GitHub</strong>; autorizaremos tu cuenta y te mantendremos conectado automáticamente.</>
        ];
    };

    return (
        <div className="min-h-[100svh] w-full bg-[#FCF5EB] text-[#3B4A54] font-sans selection:bg-[#25D366] selection:text-white pb-10">

            {/* Header Logo */}
            <div className="w-full max-w-[1000px] mx-auto pt-7 pb-8 px-5 lg:px-0 flex items-center gap-2.5">
                <div className="text-[#25D366] flex gap-2 items-center">
                    <WhatsAppLogoAuth />
                    <WhatsAppWordmark />
                </div>
            </div>

            <div className="w-full flex flex-col-reverse md:flex-col gap-8 max-w-[1000px] mx-auto px-4 lg:px-0">

                {/* Download Section */}
                <div className="bg-white border border-border rounded-[22px] p-6 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex gap-6 items-center lg:items-start text-center md:text-left">
                        <div className="hidden md:block">
                            <LoginUpsellIllustration />
                        </div>
                        <div>
                            <h2 className="text-[22px] leading-tight text-[#41525d] mb-2 font-medium">Descarga WhatsApp para Windows</h2>
                            <p className="text-[#3b4a54] text-[15px] leading-6 max-w-xl">
                                Descarga la aplicación para Windows y haz llamadas, comparte pantalla y disfruta de una experiencia más rápida.
                            </p>
                        </div>
                    </div>
                    <button className="bg-[#25D366] hover:bg-[#20b857] text-[#0a0a0a] px-7 py-2.5 rounded-full transition-colors text-[15px] whitespace-nowrap flex gap-2 border border-border">
                        <Download className="w-5 h-5 mr-2" />
                        Descargar
                    </button>
                </div>

                {/* Main Login Card */}
                <div className="bg-white border border-border rounded-[22px] p-4 lg:p-[52px]">
                    <div className="flex flex-col-reverse gap-12 lg:gap-16 md:flex-row">

                        {/* Left: Instructions */}
                        <div className="flex-1">
                            <h1 className="text-[30px] font-light text-[#1e2a32] mb-8">
                                {getTitle()}
                            </h1>

                            <ol className="space-y-6">
                                {getSteps().map((step, index) => (
                                    <li key={index} className="flex gap-4 items-start">
                                        <div className="flex flex-col items-center">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c6d9dc] bg-white text-base font-semibold text-[#1e2a32]">
                                                {index + 1}
                                            </span>
                                            {index < getSteps().length - 1 && (
                                                <span className="mt-1 h-[calc(100%-1.5rem)] w-px bg-[#dfe7e8]" aria-hidden />
                                            )}
                                        </div>
                                        <span className="text-[17px] leading-6 text-[#3b4a54]">
                                            {step}
                                        </span>
                                    </li>
                                ))}
                            </ol>

                            <div className="mt-8 flex flex-col gap-3 text-[15px] text-[#1e2a32]">
                                <div className="flex justify-end">
                                    {mode === 'login' ? (
                                        <Link href="/auth/sign-up" className="text-[#008069] text-[16px] font-medium hover:underline">
                                            ¿No tienes cuenta? Regístrate aquí &gt;
                                        </Link>
                                    ) : mode === 'signup' ? (
                                        <Link href="/auth/login" className="text-[#008069] text-[16px] font-medium hover:underline">
                                            ¿Ya estás registrado? Inicia sesión &gt;
                                        </Link>
                                    ) : (
                                        <Link href="/auth/login" className="text-[#008069] text-[16px] font-medium hover:underline">
                                            &lt; Regresar al inicio de sesión
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Form area - children will be inserted here */}
                        <div className="flex-shrink-0 md:w-[360px] lg:w-[400px]">
                            <div className="relative md:rounded-[28px] py-4 md:px-10 md:py-12 text-white md:border md:border-border">
                                <h1 className="text-[30px] font-light text-[#1e2a32] mb-4 md:hidden">
                                    {mode === 'signup' ? 'Crear Cuenta' : mode === 'forgot-password' ? 'Recuperar Contraseña' : 'Inicia Sesión'}
                                </h1>
                                {children}
                            </div>

                            {mode === 'login' && (
                                <div className="mt-6 text-center text-sm text-[#54656f] md:hidden">
                                    ¿No tienes una cuenta de WhatsApp?{" "}
                                    <Link href="/auth/sign-up" className="text-[#008069] font-semibold hover:underline">
                                        Regístrate
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="w-full text-center mt-12 pb-8 px-4">
                <p className="text-[#3b4a54] text-[15px] mb-2 font-medium">
                    ¿No tienes una cuenta de WhatsApp? <Link href="/auth/sign-up" className="text-[#008069] hover:underline">Primeros pasos</Link>
                </p>

                <div className="flex items-center justify-center gap-2 mt-8 opacity-60">
                    <LockSmall />
                    <span className="text-[#3b4a54] text-sm">Tus mensajes personales están cifrados de extremo a extremo.</span>
                </div>
            </div>
        </div>
    );
}
