"use client";

import Link from "next/link";
import { Ambulance, ShieldCheck, Siren, Truck } from "lucide-react";
import { ActivePersonnelList } from "@/modules/bomberos/components/active-personnel-list";
import { AppShell } from "@/modules/dashboard/components/app-shell";
import { MetricCard } from "@/modules/dashboard/components/metric-card";
import { ServiceStatusCard } from "@/modules/dashboard/components/service-status-card";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";
import { VehicleList } from "@/modules/vehiculos/components/vehicle-list";

export function DashboardPage() {
  const profiles = useOperationsStore((state) => state.profiles);
  const vehicles = useOperationsStore((state) => state.vehicles);
  const isServingAsPilot = (mode?: string | null) => mode === "piloto_voluntario" || mode === "piloto_rentado";
  const activeFirefighters = profiles.filter(
    (profile) => profile.isActive !== false && profile.serviceStatus === "en_servicio" && !isServingAsPilot(profile.serviceMode)
  );
  const activePilots = profiles.filter(
    (profile) => profile.isActive !== false && profile.serviceStatus === "en_servicio" && isServingAsPilot(profile.serviceMode)
  );
  const operationalVehicles = vehicles.filter((vehicle) => vehicle.isActive !== false && vehicle.status === "operativo");
  const currentProfile = getCurrentProfile(profiles);
  const canEmitEmergencyAlert = isChiefProfile(currentProfile);

  return (
    <AppShell>
      <div className="space-y-5">
        <ServiceStatusCard />

        {canEmitEmergencyAlert ? (
          <section className="overflow-hidden rounded-[1.75rem] border border-red-400/30 bg-[#030716] p-5 shadow-glow sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-red-200/82">Emergencias</p>
              <h2 className="mt-2 text-4xl font-black leading-tight tracking-tight text-red-100 sm:text-5xl">
                Emitir alerta operativa
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/68">
                Notifica rápidamente al personal disponible de la compañía.
              </p>
            </div>
            <Link
              href="/emergencias?emit=1"
              className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-fire-red px-4 text-lg font-semibold text-white shadow-[0_18px_50px_rgba(220,38,38,0.24)] transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 lg:w-72"
            >
              <Siren className="h-5 w-5" />
              Emitir alerta operativa
            </Link>
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard title="Bomberos en servicio" value={activeFirefighters.length} icon={ShieldCheck} tone="green" />
          <MetricCard title="Pilotos en servicio" value={activePilots.length} icon={Ambulance} tone="blue" />
          <MetricCard title="Unidades operativas" value={operationalVehicles.length} icon={Truck} tone="green" />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <ActivePersonnelList title="Bomberos en servicio" role="bombero" />
          <ActivePersonnelList title="Pilotos en servicio" role="piloto" />
        </section>

        <VehicleList />
      </div>
    </AppShell>
  );
}
