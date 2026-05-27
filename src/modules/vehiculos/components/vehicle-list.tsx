"use client";

import { Clock3, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatTime } from "@/lib/utils";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { vehicleStatusClass, vehicleStatusLabel } from "@/modules/shared/utils/labels";

export function VehicleList() {
  const vehicles = useOperationsStore((state) => state.vehicles);
  const ordered = vehicles
    .filter((vehicle) => vehicle.isActive !== false && vehicle.status === "operativo")
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Unidades operativas</h2>
        <span className="text-xs text-white/48">{ordered.length} unidades</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {ordered.map((vehicle) => (
          <Card key={vehicle.id} className="p-4">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/8">
                <Truck className="h-5 w-5 text-red-100" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{vehicle.name}</h3>
                  <span className="text-xs text-white/42">{vehicle.code}</span>
                  <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${vehicleStatusClass[vehicle.status]}`}>
                    {vehicleStatusLabel[vehicle.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/58">
                  {vehicle.type} · {vehicle.plate}
                </p>
                <p className="mt-2 text-sm leading-5 text-white/72">{vehicle.observations}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/42">
                  <Clock3 className="h-4 w-4" />
                  Última actualización: {formatTime(vehicle.updatedAt)}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {!ordered.length ? (
          <Card className="p-5 text-sm font-medium text-white/52">No hay unidades operativas.</Card>
        ) : null}
      </div>
    </section>
  );
}
