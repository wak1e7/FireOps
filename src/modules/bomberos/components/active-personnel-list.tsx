"use client";

import { useEffect, useState } from "react";
import { Clock3, Gauge, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatServiceDuration } from "@/lib/utils";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";
import type { RoleName, ServiceMode } from "@/modules/shared/types/domain";

function isServingAsPilot(serviceMode?: ServiceMode | null) {
  return serviceMode === "piloto_voluntario" || serviceMode === "piloto_rentado";
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
  const togglePilotDuty = useOperationsStore((state) => state.togglePilotDuty);
  const currentProfile = getCurrentProfile(profiles);
  const canManagePersonnel = isChiefProfile(currentProfile);
  const [now, setNow] = useState(() => new Date());
  const visibleProfiles = profiles
    .filter((profile) => {
      if (profile.isActive === false) return false;
      if (role === "piloto") {
        if (!profile.pilotType) return false;
        return canManagePersonnel || (profile.serviceStatus === "en_servicio" && isServingAsPilot(profile.serviceMode));
      }
      return profile.serviceStatus === "en_servicio" && !isServingAsPilot(profile.serviceMode);
    })
    .sort((a, b) => {
      if (role === "piloto" && a.pilotType !== b.pilotType) return a.pilotType === "rentado" ? -1 : 1;
      return a.fullName.localeCompare(b.fullName);
    });
  const activeCount = visibleProfiles.filter(
    (profile) => profile.serviceStatus === "en_servicio" && (role !== "piloto" || isServingAsPilot(profile.serviceMode))
  ).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs text-white/48">{activeCount} activos</span>
      </div>
      <div className="space-y-3">
        {visibleProfiles.map((profile) => {
          const pilotOnDuty = role === "piloto" && isServingAsPilot(profile.serviceMode);
          return (
            <Card key={profile.id} className="min-h-[124px] p-4">
              <div className="flex gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/14 text-emerald-100">
                  {role === "piloto" ? <Gauge className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 font-semibold leading-6">{profile.fullName}</h3>
                    {canManagePersonnel ? (
                      <Button
                        type="button"
                        variant={pilotOnDuty ? "danger" : "secondary"}
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          if (role === "piloto") {
                            togglePilotDuty(profile.id);
                          } else {
                            toggleService(profile.id);
                          }
                        }}
                      >
                        {role === "piloto" ? (pilotOnDuty ? "Retirar" : "Marcar en servicio") : "Salida"}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-sm text-white/55">
                    {profile.rank} · {role === "piloto" ? "Piloto" : "Bombero"}
                  </p>
                  {profile.serviceStatus === "en_servicio" && (!pilotOnDuty || isServingAsPilot(profile.serviceMode)) ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-100/80">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatServiceDuration(profile.serviceStartedAt, now)} en servicio
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-white/42">Fuera de servicio</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {!visibleProfiles.length ? (
          <Card className="p-5 text-sm font-medium text-white/52">No hay personal operativo actualmente.</Card>
        ) : null}
      </div>
    </section>
  );
}
