"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, LogOut } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { getCurrentProfile } from "@/modules/shared/utils/current-profile";
import type { ServiceMode, ServiceStatus } from "@/modules/shared/types/domain";

function statusCopy(status?: ServiceStatus) {
  if (status === "en_servicio") {
    return {
      title: "En servicio",
      text: "Actualmente te encuentras disponible para atención de emergencias.",
      color: "text-emerald-100",
      border: "border-emerald-300/35"
    };
  }
  if (status === "en_alerta") {
    return {
      title: "En alerta",
      text: "Te encuentras en alerta y disponible para apoyo operativo.",
      color: "text-yellow-100",
      border: "border-yellow-300/35"
    };
  }
  return {
    title: "Fuera de servicio",
    text: "Actualmente no te encuentras disponible para atención de emergencias.",
    color: "text-red-100",
    border: "border-red-400/30"
  };
}

export function ServiceStatusCard() {
  const profiles = useOperationsStore((state) => state.profiles);
  const toggleService = useOperationsStore((state) => state.toggleService);
  const currentProfile = getCurrentProfile(profiles);
  const serviceOptions = useMemo<Array<{ value: ServiceMode; label: string }>>(() => {
    if (!currentProfile) return [];
    if (currentProfile.role === "piloto") {
      return [
        { value: "piloto_rentado", label: "Piloto rentado" },
        { value: "piloto_voluntario", label: "Piloto voluntario" }
      ];
    }
    if (currentProfile.canVolunteerAsPilot) {
      return [
        { value: "bombero", label: "Bombero" },
        { value: "piloto_voluntario", label: "Piloto voluntario" }
      ];
    }
    return [{ value: "bombero", label: "Bombero" }];
  }, [currentProfile]);
  const [selectedMode, setSelectedMode] = useState<ServiceMode>("bombero");
  const effectiveSelectedMode = serviceOptions.some((option) => option.value === selectedMode)
    ? selectedMode
    : serviceOptions[0]?.value ?? "bombero";
  const serviceStatus = currentProfile?.serviceStatus ?? "fuera_de_servicio";
  const inService = serviceStatus === "en_servicio";
  const inAlert = serviceStatus === "en_alerta";
  const status = statusCopy(serviceStatus);
  const registrationTime = currentProfile?.serviceStartedAt
    ? formatTime(currentProfile.serviceStartedAt)
    : "Pendiente de registro";

  return (
    <section className={`overflow-hidden rounded-[1.75rem] border bg-[#030716] p-5 shadow-glow sm:p-7 ${status.border}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-red-200/82">Estado personal</p>
          <h2 className={`mt-2 text-4xl font-black leading-tight tracking-tight sm:text-5xl ${status.color}`}>
            {status.title}
          </h2>
          <p className="mt-3 max-w-lg text-base leading-7 text-white/68">
            {status.text}
          </p>
          {!inService && !inAlert && serviceOptions.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {serviceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`min-h-10 rounded-xl border px-4 text-sm font-bold transition ${
                    effectiveSelectedMode === option.value
                      ? "border-red-300/30 bg-fire-red text-white shadow-glow"
                      : "border-white/10 bg-white/[0.055] text-white/62 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setSelectedMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-72">
          {inService || inAlert ? (
            <button
              type="button"
              className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 text-lg font-semibold text-white shadow-[0_18px_50px_rgba(185,28,28,0.24)] transition hover:bg-[#991B1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              onClick={() => {
                if (!currentProfile) return;
                toggleService(currentProfile.id, effectiveSelectedMode, serviceStatus);
              }}
            >
              <LogOut className="h-5 w-5" />
              {inService ? "Salir de servicio" : "Salir de alerta"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-[#10B981] px-4 text-lg font-semibold text-white shadow-[0_18px_50px_rgba(16,185,129,0.24)] transition hover:bg-[#0ea371] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                onClick={() => {
                  if (!currentProfile) return;
                  toggleService(currentProfile.id, effectiveSelectedMode, "en_servicio");
                }}
              >
                <CheckCircle2 className="h-5 w-5" />
                Entrar en servicio
              </button>
              <button
                type="button"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#F59E0B] px-4 text-base font-semibold text-[#111827] shadow-[0_18px_50px_rgba(245,158,11,0.2)] transition hover:bg-[#d98a06] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100"
                onClick={() => {
                  if (!currentProfile) return;
                  toggleService(currentProfile.id, effectiveSelectedMode, "en_alerta");
                }}
              >
                <AlertTriangle className="h-5 w-5" />
                Quedar en alerta
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm text-white/54">
        <Clock3 className={`h-4 w-4 ${inService ? "text-emerald-200" : inAlert ? "text-yellow-200" : "text-red-200"}`} />
        {inService
          ? `En servicio desde las ${registrationTime}`
          : inAlert
            ? `En alerta desde las ${registrationTime}`
            : "El sistema registrará automáticamente tu disponibilidad operativa."}
      </div>
    </section>
  );
}
