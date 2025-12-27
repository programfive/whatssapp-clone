"use client";

import { useState } from "react";
import { z } from "zod";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const forgotPasswordSchema = z.object({
  email: z.string().email("Ingresa un correo válido."),
});

type ForgotPasswordErrors = Partial<Record<keyof z.infer<typeof forgotPasswordSchema>, string>>;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      const formatted: ForgotPasswordErrors = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as keyof ForgotPasswordErrors;
        formatted[key] = issue.message;
      }
      setFieldErrors(formatted);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white text-[#1e2a32] flex flex-col items-center text-center space-y-6">
        <div className="h-16 w-16 bg-[#d2f4c6] rounded-full flex items-center justify-center mb-2">
          <Mail className="h-8 w-8 text-[#00a884]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-medium text-[#111b21]">Revisa tu correo</h3>
          <p className="text-[#3b4a54] text-[15px] leading-6">
            Te hemos enviado las instrucciones para restablecer tu contraseña a <strong>{email}</strong>.
          </p>
        </div>
        <Link href="/auth/login" className="text-[#00a884] font-medium hover:underline mt-4 block">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white text-[#1e2a32]">
      <div className="space-y-5">
        <p className="text-[#3b4a54] text-[15px] mb-4">
          Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu cuenta.
        </p>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#3b4a54]"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            className={`h-12 w-full rounded-full bg-[#f0f2f5] border px-4 text-[#1e2a32] placeholder:text-[#8696a0] focus:outline-none transition-colors ${fieldErrors.email
                ? "border-[#d93025] focus:border-[#d93025] focus:ring-1 focus:ring-[#f38ea1]"
                : "border-[#d1d7db] focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366]"
              }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-[#d93025]">{fieldErrors.email}</p>
          )}
        </div>

        {error && (
          <p className="text-sm font-medium text-[#d93025]">{error}</p>
        )}

        <button
          onClick={handleForgotPassword}
          className="h-12 w-full flex justify-center items-center gap-2 rounded-full border border-border text-[15px] font-semibold bg-[#25D366] hover:bg-[#20b857] text-[#0a0a0a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? "Enviando..." : "Enviar enlace"}
        </button>

        <div className="text-center mt-4">
          <Link href="/auth/login" className="text-[#008069] text-sm font-medium hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
