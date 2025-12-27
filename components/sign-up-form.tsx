"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Mail } from "lucide-react";

import { Google } from "./icons/google";
import { GitHub } from "./icons/github";

const signUpSchema = z.object({
  fullName: z
    .string()
    .min(3, "Ingresa tu nombre completo.")
    .max(80, "El nombre es demasiado largo."),
  email: z.string().email("Ingresa un correo válido."),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(64, "La contraseña es demasiado larga."),
});

type SignUpErrors = Partial<Record<keyof z.infer<typeof signUpSchema>, string>>;

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SignUpErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const validation = signUpSchema.safeParse({ fullName, email, password });
    if (!validation.success) {
      const formatted: SignUpErrors = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as keyof SignUpErrors;
        formatted[key] = issue.message;
      }
      setFieldErrors(formatted);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (signupError: unknown) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : "Ha ocurrido un error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div
      className={cn("bg-white text-[#1e2a32]", className)}
      {...props}
    >
      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-[#3b4a54]"
          >
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) {
                setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
              }
            }}
            placeholder="Tu nombre"
            className={`h-12 w-full rounded-full border px-4 text-[#1e2a32] placeholder:text-[#8696a0] focus:outline-none transition-colors ${fieldErrors.fullName
              ? "bg-[#fff5f5] border-[#d93025] focus:border-[#d93025] focus:ring-1 focus:ring-[#f38ea1]"
              : "bg-[#f0f2f5] border-[#d1d7db] focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366]"
              }`}
          />
          {fieldErrors.fullName && (
            <p className="text-xs text-[#d93025]">{fieldErrors.fullName}</p>
          )}
        </div>

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
            placeholder="m@example.com"
            className={`h-12 w-full rounded-full border px-4 text-[#1e2a32] placeholder:text-[#8696a0] focus:outline-none transition-colors ${fieldErrors.email
              ? "bg-[#fff5f5] border-[#d93025] focus:border-[#d93025] focus:ring-1 focus:ring-[#f38ea1]"
              : "bg-[#f0f2f5] border-[#d1d7db] focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366]"
              }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-[#d93025]">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#3b4a54]"
          >
            Contraseña
          </label>
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
            placeholder="Ingresa una contraseña segura"
            className={`h-12 w-full rounded-full border px-4 text-[#1e2a32] placeholder:text-[#8696a0] focus:outline-none transition-colors ${fieldErrors.password
              ? "bg-[#fff5f5] border-[#d93025] focus:border-[#d93025] focus:ring-1 focus:ring-[#f38ea1]"
              : "bg-[#f0f2f5] border-[#d1d7db] focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366]"
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
          type="submit"
          className="h-12 w-full flex items-center justify-center gap-2 rounded-full border border-border bg-[#25D366] text-[15px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#20b857] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          <Mail className="h-5 w-5" />
          {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#e5eaec]" />
        <span className="text-xs uppercase tracking-wide text-[#8696a0]">
          o continúa con
        </span>
        <span className="h-px flex-1 bg-[#e5eaec]" />
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleOAuthLogin("google")}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#d1d7db] bg-white text-[#3b4a54] font-medium transition-colors hover:bg-[#f0f2f5]"
        >
          <Google className="h-6 w-6" />
          Continuar con Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuthLogin("github")}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#d1d7db] bg-white text-[#3b4a54] font-medium transition-colors hover:bg-[#f0f2f5]"
        >
          <GitHub className="h-6 w-6 text-[#1b1f23]" />
          Continuar con GitHub
        </button>
      </div>

      <div className="mt-6 text-center text-sm text-[#5c6c76]">
        ¿Ya estás registrado?{" "}
        <Link href="/auth/login" className="font-semibold text-[#008069]">
          Inicia sesión aquí
        </Link>
      </div>
    </div>
  );
}
