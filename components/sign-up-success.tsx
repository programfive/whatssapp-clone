"use client";

import { Mail } from "lucide-react";
import Link from "next/link";

export function SignUpSuccess() {
    return (
        <div className="bg-white text-[#1e2a32] flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 bg-[#d2f4c6] rounded-full flex items-center justify-center mb-2">
                <Mail className="h-8 w-8 text-[#00a884]" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-medium text-[#111b21]">Registro completado</h3>
                <p className="text-[#3b4a54] text-[15px] leading-6">
                    Te hemos enviado un mensaje de confirmación a tu correo electrónico. Por favor, verifica tu bandeja de entrada para activar tu cuenta.
                </p>
            </div>
            <Link
                href="/auth/login"
                className="text-[#00a884] font-medium hover:underline mt-4 block"
            >
                Volver a iniciar sesión
            </Link>
        </div>
    );
}
