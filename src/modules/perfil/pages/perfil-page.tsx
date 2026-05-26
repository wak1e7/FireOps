"use client";

import Image from "next/image";
import { Check, IdCard, KeyRound, Mail, Medal, Save, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/modules/dashboard/components/app-shell";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import {
  getPasswordRules,
  isStrongPassword,
  normalizePeruPhone,
  validateEmail,
  validatePeruPhoneDigits
} from "@/modules/auth/utils/validators";
import { useToast } from "@/modules/shared/components/toast-provider";
import { getCurrentProfile } from "@/modules/shared/utils/current-profile";
import type { Profile, RoleName } from "@/modules/shared/types/domain";

const roleLabels: Record<RoleName, string> = {
  admin: "Administrador",
  bombero: "Bombero",
  piloto: "Piloto",
  primer_jefe: "Primer Jefe",
  segundo_jefe: "Segundo Jefe"
};

function statusLabel(profile: Profile) {
  if (profile.isActive === false) return "Inactivo";
  if (profile.serviceStatus === "en_alerta") return "En alerta";
  return profile.serviceStatus === "en_servicio" ? "En servicio" : "Fuera de servicio";
}

function avatarFor(profile?: Profile) {
  return profile?.role === "piloto" ? "/nuevopiloto.png" : "/nuevobombero.png";
}

function PasswordChecklist({ password }: { password: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {getPasswordRules(password).map((rule) => (
          <div key={rule.label} className="flex items-center gap-2 text-sm">
            <Check className={`h-4 w-4 ${rule.valid ? "text-emerald-300" : "text-white/24"}`} />
            <span className={rule.valid ? "text-emerald-100" : "text-white/58"}>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PerfilPage() {
  const profiles = useOperationsStore((state) => state.profiles);
  const updateProfile = useOperationsStore((state) => state.updateProfile);
  const currentProfile = getCurrentProfile(profiles);
  const currentProfileId = currentProfile?.id;
  const currentProfileName = currentProfile?.fullName;
  const currentProfilePhone = currentProfile?.phone;
  const currentProfileEmail = currentProfile?.email;
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(currentProfile?.fullName ?? "");
  const [phone, setPhone] = useState(currentProfile?.phone ? normalizePeruPhone(currentProfile.phone) : "");
  const [email, setEmail] = useState(currentProfile?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const avatarSrc = avatarFor(currentProfile);

  useEffect(() => {
    if (!currentProfile) return;
    setFullName(currentProfile.fullName);
    setPhone(currentProfile.phone ? normalizePeruPhone(currentProfile.phone) : "");
    setEmail(currentProfile.email ?? "");
  }, [currentProfile, currentProfileId, currentProfileName, currentProfilePhone, currentProfileEmail]);

  const phoneValid = phone.length > 0 && validatePeruPhoneDigits(phone);
  const emailValid = email.length > 0 && validateEmail(email);
  const passwordMatches = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordValid = isStrongPassword(newPassword) && passwordMatches;
  const contactCanSave = useMemo(
    () => fullName.trim().length >= 4 && phoneValid && emailValid,
    [emailValid, fullName, phoneValid]
  );

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentProfile || !contactCanSave) return;

    updateProfile({
      ...currentProfile,
      fullName: fullName.trim().toUpperCase(),
      phone: `+51${phone}`,
      email: email.trim().toLowerCase()
    });
    showToast();
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentProfile || !passwordValid) return;

    updateProfile({
      ...currentProfile,
      temporaryPassword: newPassword,
      mustChangePassword: false
    });
    setNewPassword("");
    setConfirmPassword("");
    showToast();
  }

  if (!currentProfile) {
    return (
      <AppShell>
        <Card className="p-6 text-sm font-semibold text-white/60">No se encontró información del perfil.</Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="space-y-5">
        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-red-300/20 bg-white/8">
                <Image src={avatarSrc} alt="" width={80} height={80} className="h-full w-full object-cover" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">Perfil</p>
                <h1 className="truncate text-3xl font-black tracking-tight">{currentProfile.fullName}</h1>
                <p className="mt-2 text-sm font-semibold text-white/58">
                  {roleLabels[currentProfile.role]} · {currentProfile.rank}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
              <InfoPill icon={IdCard} label="Código" value={currentProfile.firefighterCode} />
              <InfoPill icon={ShieldCheck} label="Estado" value={statusLabel(currentProfile)} />
              <InfoPill icon={Medal} label="Cargo" value={currentProfile.specialPosition ?? "Sin cargo"} />
            </div>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-red-300/15 bg-red-500/10 text-red-100">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black">Datos personales</h2>
                <p className="text-xs font-semibold text-white/46">Actualiza tu información de contacto.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={saveProfile}>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Nombre completo</span>
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} className="font-semibold" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Teléfono</span>
                  <span className="relative flex overflow-hidden rounded-xl bg-white">
                    <span className="inline-flex min-h-12 items-center border-r border-slate-200 px-4 font-bold text-slate-700">+51</span>
                    <Input
                      value={phone}
                      onChange={(event) => setPhone(normalizePeruPhone(event.target.value))}
                      className="rounded-none border-0 font-semibold focus:ring-0"
                      inputMode="numeric"
                      maxLength={9}
                    />
                  </span>
                  {!phoneValid ? <p className="text-xs text-red-200">Debe tener 9 números e iniciar con 9.</p> : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold">Correo electrónico</span>
                  <span className="relative block">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <Input value={email} onChange={(event) => setEmail(event.target.value)} className="pl-12 font-semibold" type="email" />
                  </span>
                  {!emailValid ? <p className="text-xs text-red-200">Ingresa un correo válido.</p> : null}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Rol operativo" value={roleLabels[currentProfile.role]} />
                <ReadOnlyField label="Rango" value={currentProfile.rank} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!contactCanSave}>
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-red-300/15 bg-red-500/10 text-red-100">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black">Cambiar contraseña</h2>
                <p className="text-xs font-semibold text-white/46">Usa una contraseña segura para tu cuenta.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={savePassword}>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Nueva contraseña</span>
                <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="font-semibold" type="password" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">Confirmar contraseña</span>
                <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="font-semibold" type="password" />
              </label>

              <PasswordChecklist password={newPassword} />
              {confirmPassword.length > 0 && !passwordMatches ? (
                <p className="text-xs text-red-200">Las contraseñas no coinciden.</p>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={!passwordValid}>
                  <KeyRound className="h-4 w-4" />
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: typeof IdCard; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/38">
        <Icon className="h-4 w-4 text-red-100" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold text-white/84">{value}</p>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="min-h-12 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 font-semibold text-white/64">
        {value}
      </div>
    </label>
  );
}
