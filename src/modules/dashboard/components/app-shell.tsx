"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { History, Home, Menu, Siren, Truck, UsersRound, X } from "lucide-react";
import { NotificationBell } from "@/modules/notificaciones/components/notification-bell";
import { NotificationPermissionPrompt } from "@/modules/notificaciones/components/notification-permission-prompt";
import { ProfileMenu } from "@/modules/perfil/components/profile-menu";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";
import { SessionGuard } from "@/modules/auth/components/session-guard";

const navItems = [
  { label: "Inicio", href: "/operaciones", icon: Home, chiefsOnly: false },
  { label: "Emergencias", href: "/emergencias", icon: Siren, chiefsOnly: false },
  { label: "Personal", href: "/personal", icon: UsersRound, chiefsOnly: false },
  { label: "Unidades", href: "/vehiculos", icon: Truck, chiefsOnly: false },
  { label: "Historial", href: "/historial", icon: History, chiefsOnly: true }
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/operaciones" && pathname.startsWith(href));
}

function isServingAsPilot(mode?: string | null) {
  return mode === "piloto_voluntario" || mode === "piloto_rentado";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileNavClosing, setMobileNavClosing] = useState(false);
  const profiles = useOperationsStore((state) => state.profiles);
  const loaded = useOperationsStore((state) => state.loaded);
  const loadOperations = useOperationsStore((state) => state.loadOperations);
  const currentProfile = getCurrentProfile(profiles);
  const visibleNavItems = navItems.filter((item) => !item.chiefsOnly || isChiefProfile(currentProfile));
  const hasActiveFirefighter = profiles.some(
    (profile) => profile.isActive !== false && profile.serviceStatus === "en_servicio" && !isServingAsPilot(profile.serviceMode)
  );
  const hasActivePilot = profiles.some(
    (profile) => profile.isActive !== false && profile.serviceStatus === "en_servicio" && isServingAsPilot(profile.serviceMode)
  );
  const companyOperational = hasActiveFirefighter && hasActivePilot;
  const companyStateLabel = companyOperational ? "Compañía operativa" : "Compañía fuera de servicio";
  const companyStateClass = companyOperational ? "text-[#10B981]" : "text-fire-red";

  useEffect(() => {
    if (!loaded) loadOperations();
  }, [loadOperations, loaded]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") loadOperations();
    }

    const timer = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadOperations]);

  function openMobileNav() {
    setMobileNavClosing(false);
    setMobileNavOpen(true);
  }

  function closeMobileNav() {
    setMobileNavClosing(true);
    window.setTimeout(() => {
      setMobileNavOpen(false);
      setMobileNavClosing(false);
    }, 180);
  }

  const navigationList = (compact = false, onNavigate?: () => void) => (
    <nav className="space-y-2">
      {visibleNavItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            title={compact ? item.label : undefined}
            onClick={onNavigate}
            className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold transition ${
              compact ? "justify-center group-hover/sidebar:justify-start" : ""
            } ${
              active
                ? "bg-fire-red text-white shadow-glow"
                : "text-white/64 hover:bg-white/8 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span
              className={`truncate transition-opacity duration-200 ${
                compact ? "hidden opacity-0 group-hover/sidebar:inline group-hover/sidebar:opacity-100" : ""
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <SessionGuard>
    <main className="min-h-dvh bg-fire-tactical bg-radial-red text-white">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center border-b border-white/10 bg-[#090f1d]/92 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <button
          type="button"
          aria-label={mobileNavOpen ? "Cerrar navegación" : "Abrir navegación"}
          aria-expanded={mobileNavOpen}
          onClick={() => (mobileNavOpen ? closeMobileNav() : openMobileNav())}
          className="grid h-16 w-16 shrink-0 place-items-center border-r border-white/10 bg-[#071029] text-white transition hover:bg-white/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:w-20 lg:hidden"
        >
          {mobileNavOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>

        <div className="hidden h-16 w-20 shrink-0 items-center justify-center lg:flex">
          <Image src="/logo.png" alt="FireOps" width={112} height={58} className="h-auto w-[72px] object-contain" />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 px-3 sm:px-4 lg:justify-between lg:px-4">
          <div className="hidden min-w-0 flex-col justify-center lg:flex">
            <span className={`text-[0.62rem] font-black uppercase tracking-[0.22em] ${companyStateClass}`}>
              {companyStateLabel}
            </span>
            <span className="truncate text-base font-bold tracking-[0.12em] text-white">
              Salvadora Lambayeque Nº 88
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <NotificationBell />
            <span className="hidden h-9 w-px bg-white/30 md:block" />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-4rem)] w-full">
        <aside className="group/sidebar sticky top-16 hidden h-[calc(100dvh-4rem)] w-20 shrink-0 overflow-hidden border-r border-white/10 bg-[#071029]/88 p-4 backdrop-blur-xl transition-[width] duration-300 hover:w-64 lg:block 2xl:hover:w-72">
          {navigationList(true)}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 px-3 py-4 sm:px-5 lg:px-6 2xl:px-8">{children}</div>
        </section>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar navegación"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={closeMobileNav}
          />
          <aside className={`relative h-full w-[min(75vw,420px)] min-w-0 border-r border-white/10 bg-[#071029] p-4 shadow-panel ${
            mobileNavClosing ? "animate-[mobile-nav-out_180ms_ease-in_forwards]" : "animate-[mobile-nav-in_180ms_ease-out]"
          }`}>
            <div className="mb-7 grid grid-cols-[1fr_2.5rem] gap-3">
              <div className="min-w-0 pt-1">
                <Image src="/logo.png" alt="FireOps" width={148} height={76} className="h-auto w-24 object-contain" />
                <div className="mt-5 max-w-[11rem]">
                  <p className={`text-[0.62rem] font-black uppercase leading-4 tracking-[0.2em] ${companyStateClass}`}>
                    {companyStateLabel}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-5 tracking-[0.12em] text-white">
                    Salvadora Lambayeque Nº 88
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar navegación"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/70 transition hover:bg-white/8 hover:text-white"
                onClick={closeMobileNav}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigationList(false, closeMobileNav)}
          </aside>
        </div>
      ) : null}

      <NotificationPermissionPrompt />
    </main>
    </SessionGuard>
  );
}
