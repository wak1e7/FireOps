"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Mail, Medal, Search, ShieldCheck, UserPlus, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { rankOrder } from "@/modules/bomberos/utils/rank-order";
import {
  getPasswordRules,
  isStrongPassword,
  normalizePeruPhone,
  validateEmail,
  validatePeruPhoneDigits
} from "@/modules/auth/utils/validators";
import type { Profile, RankName, RoleName } from "@/modules/shared/types/domain";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";
import { useToast } from "@/modules/shared/components/toast-provider";

const DEFAULT_TEMPORARY_PASSWORD = "Temporal123!";
const PAGE_SIZE = 20;
const firefighterRanks = (Object.keys(rankOrder) as RankName[]).filter((rank) => rank !== "Sin rango");
const pilotRanks = Object.keys(rankOrder) as RankName[];
const specialPositions = ["", "Primer Jefe", "Segundo Jefe", "Encargado de área"] as const;

function roleLabel(profile: Profile) {
  return profile.role === "piloto" ? "Piloto" : "Bombero";
}

function rankOptions(role: Extract<RoleName, "bombero" | "piloto">) {
  return role === "piloto" ? pilotRanks : firefighterRanks;
}

function serviceStatusClass(profile: Profile) {
  if (profile.isActive === false) return "border-white/10 bg-white/[0.045] text-white/52";
  if (profile.serviceStatus === "en_servicio") return "border-[#10B981]/45 bg-[#10B981]/15 text-emerald-100";
  if (profile.serviceStatus === "en_alerta") return "border-[#F59E0B]/50 bg-[#F59E0B]/15 text-yellow-100";
  return "border-red-300/25 bg-red-500/10 text-red-100";
}

function serviceStatusLabel(profile: Profile) {
  if (profile.isActive === false) return "Inactivo";
  if (profile.serviceStatus === "en_servicio") return "En servicio";
  if (profile.serviceStatus === "en_alerta") return "En alerta";
  return "Fuera";
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

function AddPersonnelModal({ onClose }: { onClose: () => void }) {
  const addProfile = useOperationsStore((state) => state.addProfile);
  const profiles = useOperationsStore((state) => state.profiles);
  const { showToast } = useToast();
  const [firefighterCode, setFirefighterCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Extract<RoleName, "bombero" | "piloto">>("bombero");
  const [rank, setRank] = useState<RankName>("Seccionario");
  const [specialPosition, setSpecialPosition] = useState<(typeof specialPositions)[number]>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [canVolunteerAsPilot, setCanVolunteerAsPilot] = useState(false);
  const normalizedCode = firefighterCode.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const duplicateCode = profiles.some((profile) => profile.firefighterCode === normalizedCode);
  const duplicateEmail = Boolean(normalizedEmail) && profiles.some((profile) => profile.email === normalizedEmail);
  const phoneIsValid = phone.length === 0 || validatePeruPhoneDigits(phone);
  const emailIsValid = email.length === 0 || validateEmail(email);
  const canSubmit =
    normalizedCode.length >= 4 &&
    fullName.trim().length >= 4 &&
    Boolean(role) &&
    Boolean(rank) &&
    !duplicateCode &&
    !duplicateEmail &&
    phoneIsValid &&
    emailIsValid;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    addProfile({
      id: `local-${crypto.randomUUID()}`,
      firefighterCode: normalizedCode,
      fullName: fullName.trim().toUpperCase(),
      phone: phone ? `+51${phone}` : null,
      email: normalizedEmail || null,
      rank,
      role,
      specialPosition: specialPosition || undefined,
      serviceStatus: "fuera_de_servicio",
      serviceMode: null,
      serviceStartedAt: null,
      canVolunteerAsPilot: role === "bombero" ? canVolunteerAsPilot : false,
      temporaryPassword: DEFAULT_TEMPORARY_PASSWORD,
      isActive: true,
      mustChangePassword: true
    });
    showToast("El personal ha sido agregado correctamente.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/72 p-4 backdrop-blur-sm">
      <form className="glass-panel mx-auto my-4 max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl p-5 sm:p-6" onSubmit={submit}>
        <ModalHeader title="Agregar personal" subtitle="Registra un integrante de Salvadora Lambayeque 88." onClose={onClose} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Código" value={firefighterCode} onChange={setFirefighterCode} placeholder="A00000" uppercase required />
          <TextField label="Nombre completo" value={fullName} onChange={setFullName} placeholder="APELLIDOS, Nombres" required />

          <RoleSelect
            role={role}
            onChange={(nextRole) => {
              setRole(nextRole);
              setRank(nextRole === "piloto" ? "Sin rango" : "Seccionario");
              setCanVolunteerAsPilot(false);
            }}
          />
          <RankSelect rank={rank} role={role} onChange={setRank} />
          <SpecialPositionSelect value={specialPosition} onChange={setSpecialPosition} />
          <EmailField email={email} onChange={setEmail} invalid={!emailIsValid} duplicate={duplicateEmail} />
          <PhoneField phone={phone} onChange={setPhone} invalid={!phoneIsValid} />

          {role === "bombero" ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold">Capacidad adicional</span>
              <span className="flex min-h-12 items-center gap-3 rounded-xl border border-white/18 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={canVolunteerAsPilot}
                  onChange={(event) => setCanVolunteerAsPilot(event.target.checked)}
                  className="h-5 w-5 accent-fire-red"
                />
                <span className="font-semibold text-slate-950">Piloto Voluntario</span>
              </span>
            </label>
          ) : null}
        </div>

        {duplicateCode ? <p className="mt-3 text-xs text-red-200">Este código ya existe.</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!canSubmit}>
            <UserPlus className="h-4 w-4" />
            Guardar personal
          </Button>
        </div>
      </form>
    </div>
  );
}

function PersonnelInfoModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const updateProfile = useOperationsStore((state) => state.updateProfile);
  const profiles = useOperationsStore((state) => state.profiles);
  const { showToast } = useToast();
  const [draft, setDraft] = useState(profile);
  const [phone, setPhone] = useState(profile.phone ? normalizePeruPhone(profile.phone) : "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const role = draft.role === "piloto" ? "piloto" : "bombero";
  const emailIsValid = email.length === 0 || validateEmail(email);
  const phoneIsValid = phone.length === 0 || validatePeruPhoneDigits(phone);
  const duplicateEmail =
    Boolean(email.trim()) &&
    profiles.some((item) => item.id !== profile.id && item.email === email.trim().toLowerCase());
  const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0;
  const passwordOk = !wantsPasswordChange || (newPassword === confirmPassword && isStrongPassword(newPassword));
  const canSave = draft.fullName.trim().length >= 4 && emailIsValid && phoneIsValid && !duplicateEmail && passwordOk;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    updateProfile({
      ...draft,
      fullName: draft.fullName.trim().toUpperCase(),
      phone: phone ? `+51${phone}` : null,
      email: email.trim() ? email.trim().toLowerCase() : null,
      temporaryPassword: wantsPasswordChange ? newPassword : draft.temporaryPassword,
      mustChangePassword: wantsPasswordChange ? false : draft.mustChangePassword
    });
    showToast();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-4 backdrop-blur-sm">
      <form className="glass-panel max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-3xl p-5 sm:p-6" onSubmit={submit}>
        <ModalHeader title="Información del personal" subtitle={profile.firefighterCode} onClose={onClose} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Código" value={draft.firefighterCode} onChange={(value) => setDraft({ ...draft, firefighterCode: value.toUpperCase() })} uppercase required />
          <TextField label="Nombre completo" value={draft.fullName} onChange={(value) => setDraft({ ...draft, fullName: value })} required />
          <RoleSelect
            role={role}
            onChange={(nextRole) =>
              setDraft({
                ...draft,
                role: nextRole,
                rank: nextRole === "piloto" ? "Sin rango" : "Seccionario",
                canVolunteerAsPilot: false
              })
            }
          />
          <RankSelect rank={draft.rank} role={role} onChange={(rank) => setDraft({ ...draft, rank })} />
          <SpecialPositionSelect
            value={draft.specialPosition ?? ""}
            onChange={(position) => setDraft({ ...draft, specialPosition: position || undefined })}
          />
          <EmailField email={email} onChange={setEmail} invalid={!emailIsValid} duplicate={duplicateEmail} />
          <PhoneField phone={phone} onChange={setPhone} invalid={!phoneIsValid} />
          {role === "bombero" ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold">Capacidad adicional</span>
              <span className="flex min-h-12 items-center gap-3 rounded-xl border border-white/18 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(draft.canVolunteerAsPilot)}
                  onChange={(event) => setDraft({ ...draft, canVolunteerAsPilot: event.target.checked })}
                  className="h-5 w-5 accent-fire-red"
                />
                <span className="font-semibold text-slate-950">Piloto Voluntario</span>
              </span>
            </label>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-bold">Cambiar contraseña</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Nueva contraseña</span>
              <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="font-semibold" type="password" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Confirmar contraseña</span>
              <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="font-semibold" type="password" />
            </label>
          </div>
          <PasswordChecklist password={newPassword} />
          {wantsPasswordChange && newPassword !== confirmPassword ? (
            <p className="text-xs text-red-200">Las contraseñas no coinciden.</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!canSave}>Guardar cambios</Button>
        </div>
      </form>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-white/58">{subtitle}</p>
      </div>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-white/72 hover:bg-white/12 hover:text-white" aria-label="Cerrar" onClick={onClose}>
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, uppercase, required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; uppercase?: boolean; required?: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <Input value={value} onChange={(event) => onChange(uppercase ? event.target.value.toUpperCase() : event.target.value)} className={uppercase ? "font-semibold uppercase" : "font-semibold"} placeholder={placeholder} required={required} />
    </label>
  );
}

function RoleSelect({ role, onChange }: { role: Extract<RoleName, "bombero" | "piloto">; onChange: (role: Extract<RoleName, "bombero" | "piloto">) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">Rol operativo</span>
      <select value={role} onChange={(event) => onChange(event.target.value as Extract<RoleName, "bombero" | "piloto">)} className="min-h-12 w-full rounded-xl border border-white/18 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-fire-red focus:ring-2 focus:ring-fire-red/25" required>
        <option value="bombero">Bombero</option>
        <option value="piloto">Piloto</option>
      </select>
    </label>
  );
}

function RankSelect({ rank, role, onChange }: { rank: RankName; role: Extract<RoleName, "bombero" | "piloto">; onChange: (rank: RankName) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">Rango</span>
      <select value={rank} onChange={(event) => onChange(event.target.value as RankName)} className="min-h-12 w-full rounded-xl border border-white/18 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-fire-red focus:ring-2 focus:ring-fire-red/25" required>
        {rankOptions(role).map((rankName) => (
          <option key={rankName} value={rankName}>{rankName}</option>
        ))}
      </select>
    </label>
  );
}

function SpecialPositionSelect({ value, onChange }: { value: (typeof specialPositions)[number]; onChange: (value: (typeof specialPositions)[number]) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">Cargo adicional</span>
      <select value={value} onChange={(event) => onChange(event.target.value as (typeof specialPositions)[number])} className="min-h-12 w-full rounded-xl border border-white/18 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-fire-red focus:ring-2 focus:ring-fire-red/25">
        {specialPositions.map((position) => (
          <option key={position || "none"} value={position}>{position || "Sin cargo adicional"}</option>
        ))}
      </select>
    </label>
  );
}

function EmailField({ email, onChange, invalid, duplicate }: { email: string; onChange: (value: string) => void; invalid: boolean; duplicate: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">Correo electrónico</span>
      <span className="relative block">
        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <Input value={email} onChange={(event) => onChange(event.target.value)} className="pl-12 font-semibold" type="email" placeholder="correo@dominio.com" />
      </span>
      {invalid ? <p className="text-xs text-red-200">Ingresa un correo válido.</p> : null}
      {duplicate ? <p className="text-xs text-red-200">Este correo ya está registrado.</p> : null}
    </label>
  );
}

function PhoneField({ phone, onChange, invalid }: { phone: string; onChange: (value: string) => void; invalid: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">Teléfono</span>
      <span className="relative flex overflow-hidden rounded-xl bg-white">
        <span className="inline-flex min-h-12 items-center border-r border-slate-200 px-4 font-bold text-slate-700">+51</span>
        <Input value={phone} onChange={(event) => onChange(normalizePeruPhone(event.target.value))} className="rounded-none border-0 font-semibold focus:ring-0" inputMode="numeric" maxLength={9} placeholder="972823309" />
      </span>
      {invalid ? <p className="text-xs text-red-200">Debe tener 9 números e iniciar con 9.</p> : null}
    </label>
  );
}

export function PersonnelList() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileToToggle, setProfileToToggle] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const profiles = useOperationsStore((state) => state.profiles);
  const toggleProfileActive = useOperationsStore((state) => state.toggleProfileActive);
  const { showToast } = useToast();
  const canManagePersonnel = isChiefProfile(getCurrentProfile(profiles));
  const orderedProfiles = useMemo(
    () => {
      const normalizedQuery = query.trim().toLowerCase();
      return [...profiles]
        .filter((profile) => {
          if (!normalizedQuery) return true;
          return [
            profile.firefighterCode,
            profile.fullName,
            profile.rank,
            roleLabel(profile),
            profile.specialPosition,
            profile.canVolunteerAsPilot ? "Piloto Voluntario" : ""
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((a, b) => {
        const rankDiff = rankOrder[b.rank] - rankOrder[a.rank];
        if (rankDiff !== 0) return rankDiff;
        return a.fullName.localeCompare(b.fullName, "es");
      });
    },
    [profiles, query]
  );
  const totalPages = Math.max(1, Math.ceil(orderedProfiles.length / PAGE_SIZE));
  const paginatedProfiles = orderedProfiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">Personal</p>
          <h1 className="text-3xl font-black tracking-tight">Nómina de compañía</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="relative block min-w-64">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 min-h-11 py-2 pl-11 font-semibold"
              placeholder="Buscar personal"
            />
          </span>
          <span className="text-sm font-semibold text-white/56">{orderedProfiles.length} integrantes</span>
          {canManagePersonnel ? (
            <Button type="button" className="h-11" onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Agregar personal
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className={`hidden gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/42 lg:grid ${canManagePersonnel ? "grid-cols-[88px_1.3fr_170px_210px_130px_170px]" : "grid-cols-[88px_1.3fr_170px_210px_130px]"}`}>
          <span>Código</span>
          <span>Nombres</span>
          <span>Rango</span>
          <span>Cargo/Rol</span>
          <span>Servicio</span>
          {canManagePersonnel ? <span>Acciones</span> : null}
        </div>

        <div className="divide-y divide-white/10">
          {paginatedProfiles.map((profile) => (
            <article key={profile.id} className={`grid gap-3 px-4 py-4 lg:items-center ${canManagePersonnel ? "lg:grid-cols-[88px_1.3fr_170px_210px_130px_170px]" : "lg:grid-cols-[88px_1.3fr_170px_210px_130px]"} ${profile.isActive === false ? "opacity-55" : ""}`}>
              <div className="flex items-center gap-3 lg:block">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 text-red-100 lg:hidden">
                  <UserRound className="h-5 w-5" />
                </div>
                <span className="font-mono text-sm font-bold text-red-100">{profile.firefighterCode}</span>
              </div>

              <div>
                <h2 className="font-bold leading-tight">{profile.fullName}</h2>
              </div>

              <div className="flex items-center gap-2 text-sm text-white/72">
                <Medal className="h-4 w-4 text-red-100" />
                {profile.rank}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-semibold text-white/72">{roleLabel(profile)}</span>
                {profile.specialPosition ? <span className="rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100">{profile.specialPosition}</span> : null}
                {profile.canVolunteerAsPilot ? <span className="rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-100">Piloto Voluntario</span> : null}
              </div>

              <div>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${serviceStatusClass(profile)}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {serviceStatusLabel(profile)}
                </span>
              </div>

              {canManagePersonnel ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="border border-sky-400/25 bg-sky-500/14 text-sky-100 hover:bg-sky-500/22" onClick={() => setSelectedProfile(profile)}>
                    Detalles
                  </Button>
                  <Button
                    type="button"
                    variant={profile.isActive === false ? "default" : "danger"}
                    size="sm"
                    onClick={() => setProfileToToggle(profile)}
                  >
                    {profile.isActive === false ? "Activar" : "Deshabilitar"}
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
          {!orderedProfiles.length ? (
            <div className="p-6 text-sm font-semibold text-white/50">No hay personal para mostrar.</div>
          ) : null}
        </div>
      </Card>

      {orderedProfiles.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-white/50">
            Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, orderedProfiles.length)} de {orderedProfiles.length}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Anterior
            </Button>
            <Button type="button" variant="secondary" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

      {modalOpen ? <AddPersonnelModal onClose={() => setModalOpen(false)} /> : null}
      {selectedProfile ? <PersonnelInfoModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} /> : null}
      {profileToToggle ? (
        <ConfirmToggleModal
          title={profileToToggle.isActive === false ? "Activar personal" : "Deshabilitar personal"}
          message={
            profileToToggle.isActive === false
              ? `¿Deseas activar a ${profileToToggle.fullName}? Podrá iniciar sesión nuevamente.`
              : `¿Deseas desactivar a ${profileToToggle.fullName}? No podrá iniciar sesión y será retirado del servicio activo.`
          }
          confirmLabel={profileToToggle.isActive === false ? "Activar" : "Deshabilitar"}
          danger={profileToToggle.isActive !== false}
          onCancel={() => setProfileToToggle(null)}
          onConfirm={() => {
            toggleProfileActive(profileToToggle.id);
            showToast();
            setProfileToToggle(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ConfirmToggleModal({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/72 p-4 backdrop-blur-sm">
      <section className="glass-panel w-full max-w-md rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/8 text-white/72 transition hover:bg-white/12 hover:text-white"
            aria-label="Cerrar"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/64">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant={danger ? "danger" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
