"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, Phone, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeFirstLogin } from "@/modules/auth/services/auth-service";
import {
  formatPeruPhone,
  getPasswordRules,
  isStrongPassword,
  normalizePeruPhone,
  validateEmail,
  validatePeruPhoneDigits
} from "@/modules/auth/utils/validators";

export function FirstLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rules = useMemo(() => getPasswordRules(password), [password]);
  const phoneIsValid = validatePeruPhoneDigits(phone);
  const emailIsValid = email.length > 0 && validateEmail(email);
  const canSubmit = phoneIsValid && emailIsValid && password === confirmPassword && isStrongPassword(password);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await completeFirstLogin({
      phone: formatPeruPhone(phone),
      email: email.trim(),
      password,
      confirmPassword
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.message ?? "No se pudo completar el primer ingreso.");
      return;
    }

    router.push("/operaciones");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fire-tactical bg-radial-red p-4 text-white">
      <section className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-fire-red/18 text-red-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Primer inicio de sesión</h1>
            <p className="mt-1 text-sm leading-6 text-white/64">
              Actualiza tus datos y reemplaza la contraseña temporal para activar tu cuenta.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Teléfono</span>
            <span className="relative flex overflow-hidden rounded-xl bg-white">
              <span className="inline-flex min-h-12 items-center gap-2 border-r border-slate-200 px-4 font-bold text-slate-700">
                <Phone className="h-5 w-5 text-slate-500" />
                +51
              </span>
              <Input
                value={phone}
                onChange={(event) => setPhone(normalizePeruPhone(event.target.value))}
                className="rounded-none border-0 font-semibold focus:ring-0"
                inputMode="numeric"
                pattern="[0-9]{9}"
                maxLength={9}
                placeholder="972823309"
                aria-invalid={phone.length > 0 && !phoneIsValid}
              />
            </span>
            <p className={`text-xs ${phone.length > 0 && !phoneIsValid ? "text-red-200" : "text-white/45"}`}>
              Ingresa 9 números. Debe iniciar con 9.
            </p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">Correo electrónico</span>
            <span className="relative block">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-12 font-semibold"
                type="email"
                placeholder="correo@dominio.com"
                aria-invalid={email.length > 0 && !emailIsValid}
              />
            </span>
            {email.length > 0 && !emailIsValid ? (
              <p className="text-xs text-red-200">Ingresa un correo electrónico válido.</p>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Nueva contraseña</span>
              <Input value={password} onChange={(event) => setPassword(event.target.value)} className="font-semibold" type="password" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Confirmar contraseña</span>
              <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="font-semibold" type="password" />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {rules.map((rule) => (
                <div key={rule.label} className="flex items-center gap-2 text-sm">
                  {rule.valid ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <X className="h-4 w-4 text-red-300" />
                  )}
                  <span className={rule.valid ? "text-emerald-100" : "text-white/62"}>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          {error ? <p className="rounded-xl border border-red-400/25 bg-red-500/12 px-4 py-3 text-sm">{error}</p> : null}

          <Button type="submit" className="h-13 w-full" disabled={!canSubmit || loading}>
            {loading ? "Guardando..." : "Activar cuenta"}
          </Button>
        </form>
      </section>
    </main>
  );
}
