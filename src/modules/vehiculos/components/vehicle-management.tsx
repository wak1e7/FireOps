"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, FileText, Plus, Save, Search, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import type { Vehicle, VehicleStatus } from "@/modules/shared/types/domain";
import { vehicleStatusClass, vehicleStatusLabel } from "@/modules/shared/utils/labels";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";
import { useToast } from "@/modules/shared/components/toast-provider";

const statuses: VehicleStatus[] = ["operativo", "emergencia_activa", "mantenimiento", "fuera_de_servicio"];
const PAGE_SIZE = 20;

function VehicleFormModal({ vehicle, onClose }: { vehicle?: Vehicle; onClose: () => void }) {
  const addVehicle = useOperationsStore((state) => state.addVehicle);
  const updateVehicle = useOperationsStore((state) => state.updateVehicle);
  const vehicles = useOperationsStore((state) => state.vehicles);
  const { showToast } = useToast();
  const [code, setCode] = useState(vehicle?.code ?? "");
  const [name, setName] = useState(vehicle?.name ?? "");
  const [type, setType] = useState(vehicle?.type ?? "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [status, setStatus] = useState<VehicleStatus>(vehicle?.status ?? "operativo");
  const [observations, setObservations] = useState(vehicle?.observations ?? "");
  const normalizedCode = code.trim().toUpperCase();
  const duplicateCode = vehicles.some((item) => item.id !== vehicle?.id && item.code === normalizedCode);
  const canSubmit = normalizedCode.length >= 2 && name.trim().length >= 3 && type.trim().length >= 3 && plate.trim().length >= 3 && !duplicateCode;

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

    const payload: Vehicle = {
      id: vehicle?.id ?? `local-vehicle-${crypto.randomUUID()}`,
      code: normalizedCode,
      name: name.trim(),
      type: type.trim(),
      plate: plate.trim().toUpperCase(),
      status,
      isActive: vehicle?.isActive ?? true,
      observations: observations.trim(),
      updatedAt: new Date().toISOString()
    };

    if (vehicle) {
      updateVehicle(payload);
      showToast();
    } else {
      addVehicle(payload);
      showToast("El vehículo ha sido agregado correctamente.");
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/72 p-4 backdrop-blur-sm">
      <form className="glass-panel mx-auto my-4 max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl p-5 sm:p-6" onSubmit={submit}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{vehicle ? "Información de la unidad" : "Agregar unidad"}</h2>
            <p className="mt-1 text-sm text-white/58">Gestiona datos operativos de la unidad.</p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-white/72 hover:bg-white/12 hover:text-white"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Código</span>
            <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="font-semibold uppercase" placeholder="M-88" required />
            {duplicateCode ? <p className="text-xs text-red-200">Este código ya existe.</p> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Nombre</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} className="font-semibold" placeholder="Máquina 88" required />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Tipo</span>
            <Input value={type} onChange={(event) => setType(event.target.value)} className="font-semibold" placeholder="Autobomba" required />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Placa</span>
            <Input value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} className="font-semibold uppercase" placeholder="B-88" required />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Estado operativo</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as VehicleStatus)}
              className="min-h-12 w-full rounded-xl border border-white/18 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-fire-red focus:ring-2 focus:ring-fire-red/25"
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {vehicleStatusLabel[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-semibold">Observaciones</span>
            <textarea
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-white/18 bg-white px-4 py-3 font-semibold text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-fire-red focus:ring-2 focus:ring-fire-red/25"
              placeholder="Detalle operativo, falla o disponibilidad."
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            <Save className="h-4 w-4" />
            {vehicle ? "Guardar cambios" : "Guardar unidad"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function VehicleManagement() {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleToToggle, setVehicleToToggle] = useState<Vehicle | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const vehicles = useOperationsStore((state) => state.vehicles);
  const profiles = useOperationsStore((state) => state.profiles);
  const updateVehicleStatus = useOperationsStore((state) => state.updateVehicleStatus);
  const toggleVehicleActive = useOperationsStore((state) => state.toggleVehicleActive);
  const { showToast } = useToast();
  const canManageVehicles = isChiefProfile(getCurrentProfile(profiles));
  const orderedVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...vehicles]
      .filter((vehicle) => canManageVehicles || vehicle.isActive !== false)
      .filter((vehicle) => {
        if (!normalizedQuery) return true;
        return [vehicle.code, vehicle.name, vehicle.type, vehicle.plate, vehicleStatusLabel[vehicle.status], vehicle.observations]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es") || a.code.localeCompare(b.code, "es"));
  }, [vehicles, query, canManageVehicles]);
  const totalPages = Math.max(1, Math.ceil(orderedVehicles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedVehicles = orderedVehicles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">Unidades</p>
          <h1 className="text-3xl font-black tracking-tight">Parque automotor</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="relative block min-w-64">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="h-11 min-h-11 py-2 pl-11 font-semibold"
              placeholder="Buscar unidad"
            />
          </span>
          <span className="text-sm font-semibold text-white/56">{orderedVehicles.length} unidades</span>
          {canManageVehicles ? (
            <Button type="button" className="h-11" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar unidad
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className={`hidden gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/42 xl:grid ${canManageVehicles ? "grid-cols-[96px_1.4fr_150px_220px_170px]" : "grid-cols-[96px_1.4fr_150px_220px]"}`}>
          <span>Código</span>
          <span>Unidad</span>
          <span>Placa</span>
          <span>Estado</span>
          {canManageVehicles ? <span>Acciones</span> : null}
        </div>

        <div className="divide-y divide-white/10">
          {paginatedVehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className={`grid gap-3 px-4 py-4 xl:items-center ${canManageVehicles ? "xl:grid-cols-[96px_1.4fr_150px_220px_170px]" : "xl:grid-cols-[96px_1.4fr_150px_220px]"} ${vehicle.isActive === false ? "opacity-55" : ""}`}
            >
              <div className="flex items-center gap-3 xl:block">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 text-red-100 xl:hidden">
                  <Truck className="h-5 w-5" />
                </div>
                <span className="font-mono text-sm font-bold text-red-100">{vehicle.code}</span>
              </div>

              <div>
                <h2 className="font-bold leading-tight">{vehicle.name}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/46">
                  <FileText className="h-3.5 w-3.5" />
                  {vehicle.type}
                </p>
                {vehicle.observations ? <p className="mt-2 text-sm text-white/58">{vehicle.observations}</p> : null}
                <p className="mt-2 flex items-center gap-1.5 text-xs text-white/42">
                  <Clock3 className="h-3.5 w-3.5" />
                  Última actualización: {formatDateTime(vehicle.updatedAt)}
                </p>
              </div>

              <span className="text-sm font-semibold text-white/72">{vehicle.plate}</span>

              {canManageVehicles ? (
                <select
                  value={vehicle.status}
                  onChange={(event) => {
                    updateVehicleStatus(vehicle.id, event.target.value as VehicleStatus);
                    showToast();
                  }}
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-fire-red/35 ${vehicleStatusClass[vehicle.status]}`}
                  aria-label={`Cambiar estado de ${vehicle.name}`}
                  disabled={vehicle.isActive === false}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status} className="bg-slate-950 text-white">
                      {vehicleStatusLabel[status]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${vehicleStatusClass[vehicle.status]}`}>
                  {vehicleStatusLabel[vehicle.status]}
                </span>
              )}

              {canManageVehicles ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="border border-sky-400/25 bg-sky-500/14 text-sky-100 hover:bg-sky-500/22" onClick={() => setSelectedVehicle(vehicle)}>
                    Detalles
                  </Button>
                  <Button type="button" variant={vehicle.isActive === false ? "default" : "danger"} size="sm" onClick={() => setVehicleToToggle(vehicle)}>
                    {vehicle.isActive === false ? "Activar" : "Deshabilitar"}
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
          {!orderedVehicles.length ? (
            <div className="p-6 text-sm font-semibold text-white/50">No hay unidades para mostrar.</div>
          ) : null}
        </div>
      </Card>

      {orderedVehicles.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-white/50">
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, orderedVehicles.length)} de {orderedVehicles.length}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Anterior
            </Button>
            <Button type="button" variant="secondary" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

      {addOpen ? <VehicleFormModal onClose={() => setAddOpen(false)} /> : null}
      {selectedVehicle ? <VehicleFormModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} /> : null}
      {vehicleToToggle ? (
        <ConfirmToggleModal
          title={vehicleToToggle.isActive === false ? "Activar unidad" : "Deshabilitar unidad"}
          message={
            vehicleToToggle.isActive === false
              ? `¿Deseas activar ${vehicleToToggle.name}? Se podrá cambiar su estado operativo nuevamente.`
              : `¿Deseas desactivar ${vehicleToToggle.name}? No se podrá cambiar su estado y dejará de aparecer para bomberos comunes.`
          }
          confirmLabel={vehicleToToggle.isActive === false ? "Activar" : "Deshabilitar"}
          danger={vehicleToToggle.isActive !== false}
          onCancel={() => setVehicleToToggle(null)}
          onConfirm={() => {
            toggleVehicleActive(vehicleToToggle.id);
            showToast();
            setVehicleToToggle(null);
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
