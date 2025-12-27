"use client";

import { useState } from "react";
import { z } from "zod";
import { Google } from "./icons/google";
import { GitHub } from "./icons/github";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido."),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(64, "La contraseña es demasiado larga."),
});

type LoginErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted: LoginErrors = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as keyof LoginErrors;
        formatted[key] = issue.message;
      }
      setFieldErrors(formatted);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setIsLoading(false);
      return;
    }

    router.refresh();
    router.push("/");
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="bg-white text-[#1e2a32]">
      <div className="space-y-5">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#3b4a54]"
            >
              Contraseña
            </label>
            <a
              href="/auth/forgot-password"
              className="text-xs font-medium text-[#00a884] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            className={`h-12 w-full rounded-full bg-[#f0f2f5] border px-4 text-[#1e2a32] placeholder:text-[#8696a0] focus:outline-none transition-colors ${fieldErrors.password
                ? "border-[#d93025] focus:border-[#d93025] focus:ring-1 focus:ring-[#f38ea1]"
                : "border-[#d1d7db] focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366]"
              }`}
          />
          {fieldErrors.password && (
            <p className="text-xs text-[#d93025]">{fieldErrors.password}</p>
          )}
        </div>

        {error && (
          <p className="text-sm font-medium text-[#d93025]">{error}</p>
        )}

        <button
          onClick={handleLogin}
          className="h-12 w-full flex justify-center items-center gap-2 rounded-full border border-border  text-[15px] font-semibold bg-[#25D366] hover:bg-[#20b857] text-[#0a0a0a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <Mail className="h-5 w-5" />
          {isLoading ? "Iniciando..." : "Iniciar sesión"}
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#e5eaec]" />
        <span className="text-xs uppercase tracking-wide text-[#8696a0]">o continúa con</span>
        <span className="h-px flex-1 bg-[#e5eaec]" />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => handleOAuthLogin("google")}
          className="h-12 w-full rounded-full border border-[#d1d7db] bg-white text-[#3b4a54] hover:bg-[#f0f2f5] transition-colors flex items-center justify-center gap-3 font-medium"
        >
          <Google className="w-6 h-6" />
          Continuar con Google
        </button>

        <button
          onClick={() => handleOAuthLogin("github")}
          className="h-12 w-full rounded-full border border-[#d1d7db] bg-white text-[#3b4a54] hover:bg-[#f0f2f5] transition-colors flex items-center justify-center gap-3 font-medium"
        >
          <GitHub className="fill-[1b1f23] w-6 h-6" />
          Continuar con GitHub
        </button>
      </div>
    </div>
  );
}