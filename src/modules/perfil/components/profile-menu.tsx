"use client";

import Image from "next/image";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { getCurrentProfile } from "@/modules/shared/utils/current-profile";
import { createClient } from "@/utils/supabase/client";
import { announceFloatingMenuOpen, useFloatingMenu } from "@/modules/shared/hooks/use-floating-menu";
import type { RoleName } from "@/modules/shared/types/domain";

const roleLabels: Record<RoleName, string> = {
  admin: "Administrador",
  bombero: "Bombero",
  piloto: "Piloto",
  primer_jefe: "Primer Jefe",
  segundo_jefe: "Segundo Jefe"
};

function compactDisplayName(fullName: string) {
  const [lastNames, names] = fullName.split(",").map((part) => part.trim());
  if (lastNames && names) {
    const firstLastName = lastNames.split(/\s+/)[0] ?? lastNames;
    const firstName = names.split(/\s+/)[0] ?? names;
    return `${firstName} ${firstLastName}`;
  }

  const parts = fullName.trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : fullName;
}

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const profiles = useOperationsStore((state) => state.profiles);
  const currentProfile = getCurrentProfile(profiles);
  const profileName = currentProfile ? compactDisplayName(currentProfile.fullName) : "Usuario";
  const profileRole = currentProfile?.specialPosition ?? (currentProfile ? roleLabels[currentProfile.role] : "FireOps");
  const avatarSrc = currentProfile?.role === "piloto" ? "/nuevopiloto.png" : "/nuevobombero.png";
  const close = useCallback(() => setOpen(false), []);
  useFloatingMenu("profile", containerRef, open, close);

  async function signOut() {
    setOpen(false);
    window.localStorage.removeItem("fireops-demo-session");
    window.localStorage.removeItem("fireops-first-login-complete");
    await fetch("/api/auth/session-policy", { method: "DELETE" }).catch(() => null);
    await createClient().auth.signOut();
    router.push("/login");
  }

  function goToProfile() {
    setOpen(false);
    router.push("/perfil");
  }

  function goToSettings() {
    setOpen(false);
    router.push("/configuracion");
  }

  function toggleOpen() {
    setOpen((value) => {
      const nextValue = !value;
      if (nextValue) announceFloatingMenuOpen("profile");
      return nextValue;
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Abrir menú de perfil"
        aria-expanded={open}
        onClick={toggleOpen}
        className="h-10 w-10 overflow-hidden p-0 lg:hidden"
      >
        <Image src={avatarSrc} alt="" width={44} height={44} className="h-full w-full rounded-xl object-cover" />
      </Button>

      <button
        type="button"
        aria-label="Abrir menú de perfil"
        aria-expanded={open}
        onClick={toggleOpen}
        className="hidden min-h-12 items-center gap-3 rounded-2xl px-2 text-left transition hover:bg-white/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/24 lg:flex"
      >
        <span className="hidden max-w-64 text-right xl:block">
          <span className="block truncate text-sm text-white/84">
            Hola, <strong className="font-extrabold text-white">{profileName}</strong>
          </span>
          <span className="block truncate text-xs font-semibold text-white/78">{profileRole}</span>
        </span>
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.25)]">
          <Image src={avatarSrc} alt="" width={48} height={48} className="h-full w-full object-cover" />
        </span>
        <ChevronDown className="h-5 w-5 text-white/84" />
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-30 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]/95 p-2 shadow-panel backdrop-blur-xl">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
            onClick={goToProfile}
          >
            <UserRound className="h-4 w-4 text-red-100" />
            Ver perfil
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
            onClick={goToSettings}
          >
            <Settings className="h-4 w-4 text-red-100" />
            Configuración
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/12"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
