"use client";

import { useEffect, useState } from "react";
import { Clock3, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatServiceDuration } from "@/lib/utils";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";
import type { RoleName, ServiceMode } from "@/modules/shared/types/domain";

function isServingAsPilot(serviceMode?: ServiceMode | null) {
  return serviceMode === "piloto_voluntario" || serviceMode === "piloto_rentado";
}

function serviceLabel(serviceMode?: ServiceMode | null) {
  if (serviceMode === "piloto_rentado") return "Piloto rentado";
  if (serviceMode === "piloto_voluntario") return "Piloto voluntario";
  return "Bombero";
}

export function ActivePersonnelList({
  title = "Bomberos en servicio",
  role = "bombero"
}: {
  title?: string;
  role?: Extract<RoleName, "bombero" | "piloto">;
}) {
  const profiles = useOperationsStore((state) => state.profiles);
  const toggleService = useOperationsStore((state) => state.toggleService);
  const currentProfile = getCurrentProfile(profiles);
  const canMarkPersonnelExit = isChiefProfile(currentProfile);
  const [now, setNow] = useState(() => new Date());
  const activeProfiles = profiles.filter(
    (profile) =>
      profile.serviceStatus === "en_servicio" &&
      profile.isActive !== false &&
      (role === "piloto" ? isServingAsPilot(profile.serviceMode) : !isServingAsPilot(profile.serviceMode))
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs text-white/48">{activeProfiles.length} activos</span>
      </div>
      <div className="space-y-3">
        {activeProfiles.map((profile) => (
          <Card key={profile.id} className="min-h-[124px] p-4">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/14 text-emerald-100">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 font-semibold leading-6">{profile.fullName}</h3>
                  {canMarkPersonnelExit ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        toggleService(profile.id);
                      }}
                    >
                      Salida
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm text-white/55">
                  {profile.rank} · {serviceLabel(profile.serviceMode)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-100/80">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatServiceDuration(profile.serviceStartedAt, now)} en servicio
                </p>
              </div>
            </div>
          </Card>
        ))}
        {!activeProfiles.length ? (
          <Card className="p-5 text-sm font-medium text-white/52">No hay personal operativo actualmente.</Card>
        ) : null}
      </div>
    </section>
  );
}
