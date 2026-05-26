"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginWithFirefighterCode } from "@/modules/auth/services/auth-service";

export function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("A06692");
  const [password, setPassword] = useState("Temporal123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await loginWithFirefighterCode(code, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message ?? "No se pudo iniciar sesión.");
      return;
    }

    router.push(result.mustChangePassword ? "/primer-ingreso" : "/operaciones");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-fire-tactical p-4 text-white sm:p-8">
      <Image src="/fondologin.png" alt="" fill priority className="object-cover opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(220,38,38,.18),transparent_30%),linear-gradient(90deg,rgba(0,0,0,.88),rgba(0,0,0,.34),rgba(0,0,0,.72))]" />
      <div className="fire-grid absolute inset-6 hidden rounded-[2rem] border border-red-400/35 opacity-70 md:block" />

      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="glass-panel relative z-10 w-full max-w-md rounded-[1.75rem] px-6 py-8 sm:px-10 sm:py-10"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="FireOps" width={190} height={92} priority className="h-16 w-auto object-contain" />
          <h1 className="mt-3 text-2xl font-bold">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-white/62">Ingresa tus credenciales para continuar</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white/90">Código de bombero</span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className="pl-12 uppercase font-semibold"
                autoComplete="username"
                required
              />
            </span>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white/90">Contraseña</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-12 pr-12 font-semibold"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-900"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </span>
          </label>

          <div className="flex justify-end">
            <button type="button" className="text-sm font-medium text-red-300 hover:text-red-200">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/12 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-14 w-full text-base" disabled={loading}>
            <ShieldCheck className="h-5 w-5" />
            {loading ? "Validando..." : "Iniciar sesión"}
          </Button>
        </form>
      </motion.section>
    </main>
  );
}
