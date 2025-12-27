"use client";

import { useState } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(64, "La contraseña es demasiado larga."),
});

type UpdatePasswordErrors = Partial<Record<keyof z.infer<typeof updatePasswordSchema>, string>>;

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UpdatePasswordErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const validation = updatePasswordSchema.safeParse({ password });
    if (!validation.success) {
      const formatted: UpdatePasswordErrors = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as keyof UpdatePasswordErrors;
        formatted[key] = issue.message;
      }
      setFieldErrors(formatted);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white text-[#1e2a32]">
      <div className="space-y-5">
        <p className="text-[#3b4a54] text-[15px] mb-4">
          Ingresa tu nueva contraseña para actualizar tu cuenta.
        </p>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#3b4a54]"
          >
            Nueva contraseña
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
          onClick={handleUpdatePassword}
          className="h-12 w-full flex justify-center items-center gap-2 rounded-full border border-border text-[15px] font-semibold bg-[#25D366] hover:bg-[#20b857] text-[#0a0a0a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <Lock className="w-5 h-5" />
          {isLoading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </div>
    </div>
  );
}
