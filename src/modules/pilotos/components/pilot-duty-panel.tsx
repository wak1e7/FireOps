"use client";

import { Gauge, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";

const pilotCodes = new Set(["PILOTO01", "PILOTO02", "A02075"]);

export function PilotDutyPanel() {
  const profiles = useOperationsStore((state) => state.profiles);
  const togglePilotDuty = useOperationsStore((state) => state.togglePilotDuty);
  const currentProfile = getCurrentProfile(profiles);
  if (!isChiefProfile(currentProfile)) return null;

  const pilots = profiles.filter((profile) => pilotCodes.has(profile.firefighterCode));

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200/76">Jefatura</p>
        <h2 className="mt-2 text-xl font-black">Pilotos de turno</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {pilots.map((pilot) => {
          const onDuty =
            pilot.serviceStatus === "en_servicio" &&
            (pilot.serviceMode === "piloto_voluntario" || pilot.serviceMode === "piloto_rentado");
          return (
            <Card key={pilot.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/12 text-sky-100">
                  <Gauge className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black leading-5">{pilot.fullName}</h3>
                  <p className="mt-1 text-xs font-semibold text-white/52">{onDuty ? "Piloto en servicio" : "Fuera de turno"}</p>
                </div>
              </div>
              <Button
                type="button"
                variant={onDuty ? "danger" : "secondary"}
                className="mt-4 w-full"
                onClick={() => togglePilotDuty(pilot.id)}
              >
                <UserCheck className="h-4 w-4" />
                {onDuty ? "Retirar del turno" : "Asignar piloto"}
              </Button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
