"use client";

import { useMemo, useState } from "react";
import { ClipboardList, FileClock, LogIn, Search, Truck, UsersRound } from "lucide-react";
import { AppShell } from "@/modules/dashboard/components/app-shell";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatServiceDuration } from "@/lib/utils";
import { vehicleStatusLabel } from "@/modules/shared/utils/labels";
import type { OperationalEvent } from "@/modules/shared/types/domain";

type ReportTab = "asistencia" | "vehiculos" | "auditoria";

type AttendanceRow = {
  id: string;
  date: string;
  movement: "Entrada de personal" | "Salida de personal";
  person: string;
  detail: string;
  duration: string;
  actor: string;
};

type VehicleHistoryRow = {
  id: string;
  date: string;
  movement: string;
  vehicle: string;
  change: string;
  actor: string;
};

const reportTabs: Array<{ value: ReportTab; label: string; icon: typeof UsersRound }> = [
  { value: "asistencia", label: "Asistencia histórica", icon: UsersRound },
  { value: "vehiculos", label: "Historial de vehículos", icon: Truck },
  { value: "auditoria", label: "Auditoría completa", icon: ClipboardList }
];

function isServiceEvent(event: OperationalEvent) {
  return (
    event.metadata?.movementType === "service_entry" ||
    event.metadata?.movementType === "service_exit" ||
    event.title === "Entrada de personal" ||
    event.title === "Salida de personal"
  );
}

function isVehicleEvent(event: OperationalEvent) {
  return (
    event.metadata?.movementType === "vehicle_status_change" ||
    event.metadata?.movementType === "vehicle_created" ||
    event.metadata?.movementType === "vehicle_status_toggle" ||
    event.title.toLowerCase().includes("vehículo") ||
    event.title.toLowerCase().includes("vehiculo")
  );
}

function personFromEvent(event: OperationalEvent) {
  return event.metadata?.profileName ?? event.actor;
}

function vehicleFromEvent(event: OperationalEvent) {
  if (event.metadata?.vehicleName) return event.metadata.vehicleName;
  return event.detail.split(" cambió ")[0].split(" fue ")[0] || "Unidad";
}

function buildAttendanceRows(events: OperationalEvent[]): AttendanceRow[] {
  const orderedEvents = [...events].filter(isServiceEvent).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const openEntries = new Map<string, OperationalEvent>();

  return orderedEvents
    .map((event) => {
      const person = personFromEvent(event);
      const isEntry = event.metadata?.movementType === "service_entry" || event.title === "Entrada de personal";
      let duration = "-";

      if (isEntry) {
        openEntries.set(person, event);
      } else {
        const entry = openEntries.get(person);
        if (entry) {
          duration = formatServiceDuration(entry.createdAt, new Date(event.createdAt));
          openEntries.delete(person);
        }
      }

      return {
        id: event.id,
        date: event.createdAt,
        movement: (isEntry ? "Entrada de personal" : "Salida de personal") as AttendanceRow["movement"],
        person,
        detail: isEntry ? `${person} entró al servicio.` : `${person} salió del servicio.`,
        duration,
        actor: event.actor
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function buildVehicleRows(events: OperationalEvent[]): VehicleHistoryRow[] {
  return [...events]
    .filter(isVehicleEvent)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((event) => {
      const previousStatus = event.metadata?.previousStatus ? vehicleStatusLabel[event.metadata.previousStatus] : null;
      const nextStatus = event.metadata?.nextStatus ? vehicleStatusLabel[event.metadata.nextStatus] : null;
      const change = previousStatus && nextStatus ? `${previousStatus} -> ${nextStatus}` : event.detail;

      return {
        id: event.id,
        date: event.createdAt,
        movement: event.title,
        vehicle: vehicleFromEvent(event),
        change,
        actor: event.actor
      };
    });
}

function eventType(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("entrada")) return "Entrada";
  if (normalized.includes("salida")) return "Salida";
  if (normalized.includes("vehículo") || normalized.includes("vehiculo")) return "Vehículo";
  if (normalized.includes("personal")) return "Personal";
  return "Sistema";
}

export function ReportesPage() {
  const events = useOperationsStore((state) => state.events);
  const [tab, setTab] = useState<ReportTab>("asistencia");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const attendanceRows = useMemo(() => buildAttendanceRows(events), [events]);
  const vehicleRows = useMemo(() => buildVehicleRows(events), [events]);
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [events]
  );

  const filteredAttendance = useMemo(
    () =>
      attendanceRows.filter((row) => {
        if (!normalizedQuery) return true;
        return `${row.movement} ${row.person} ${row.detail} ${row.actor}`.toLowerCase().includes(normalizedQuery);
      }),
    [attendanceRows, normalizedQuery]
  );
  const filteredVehicles = useMemo(
    () =>
      vehicleRows.filter((row) => {
        if (!normalizedQuery) return true;
        return `${row.movement} ${row.vehicle} ${row.change} ${row.actor}`.toLowerCase().includes(normalizedQuery);
      }),
    [vehicleRows, normalizedQuery]
  );
  const filteredEvents = useMemo(
    () =>
      sortedEvents.filter((event) => {
        if (!normalizedQuery) return true;
        return `${event.title} ${event.detail} ${event.actor}`.toLowerCase().includes(normalizedQuery);
      }),
    [sortedEvents, normalizedQuery]
  );

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">Reportes</p>
            <h1 className="text-3xl font-black tracking-tight">Reportes históricos</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/58">
              Consulta movimientos pasados de asistencia, cambios de unidades y auditoría operativa.
            </p>
          </div>
          <span className="relative block min-w-64">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 min-h-11 py-2 pl-11 font-semibold"
              placeholder="Buscar histórico"
            />
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ReportMetric label="Ingresos registrados" value={attendanceRows.filter((row) => row.movement === "Entrada de personal").length} icon={LogIn} />
          <ReportMetric label="Movimientos de vehículos" value={vehicleRows.length} icon={Truck} />
          <ReportMetric label="Eventos auditados" value={events.length} icon={FileClock} />
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-1">
          {reportTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                  tab === item.value ? "bg-fire-red text-white" : "text-white/58 hover:bg-white/8 hover:text-white"
                }`}
                onClick={() => setTab(item.value)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === "asistencia" ? <AttendanceHistoryReport rows={filteredAttendance} /> : null}
        {tab === "vehiculos" ? <VehicleHistoryReport rows={filteredVehicles} /> : null}
        {tab === "auditoria" ? <AuditReport events={filteredEvents} /> : null}
      </section>
    </AppShell>
  );
}

function ReportMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof UsersRound }) {
  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{label}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </div>
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-red-300/15 bg-red-500/10 text-red-100">
        <Icon className="h-5 w-5" />
      </span>
    </Card>
  );
}

function AttendanceHistoryReport({ rows }: { rows: AttendanceRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden grid-cols-[190px_190px_minmax(0,1fr)_150px_220px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/42 xl:grid">
        <span>Fecha/Hora</span>
        <span>Movimiento</span>
        <span>Detalle</span>
        <span>Tiempo</span>
        <span>Usuario</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map((row) => (
          <article key={row.id} className="grid gap-2 px-5 py-4 xl:grid-cols-[190px_190px_minmax(0,1fr)_150px_220px] xl:items-center xl:gap-4">
            <time className="text-sm font-semibold text-white/62">{formatDateTime(row.date)}</time>
            <span className="text-sm font-bold">{row.movement}</span>
            <p className="text-sm leading-6 text-white/64">{row.detail}</p>
            <span className="text-sm font-bold text-white/72">{row.duration}</span>
            <span className="text-sm font-semibold text-white/50">{row.actor}</span>
          </article>
        ))}
        {!rows.length ? <EmptyReport label="No hay movimientos históricos de asistencia para el filtro actual." /> : null}
      </div>
    </Card>
  );
}

function VehicleHistoryReport({ rows }: { rows: VehicleHistoryRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden grid-cols-[190px_220px_minmax(0,1fr)_220px_220px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/42 xl:grid">
        <span>Fecha/Hora</span>
        <span>Movimiento</span>
        <span>Unidad</span>
        <span>Cambio</span>
        <span>Usuario</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map((row) => (
          <article key={row.id} className="grid gap-2 px-5 py-4 xl:grid-cols-[190px_220px_minmax(0,1fr)_220px_220px] xl:items-center xl:gap-4">
            <time className="text-sm font-semibold text-white/62">{formatDateTime(row.date)}</time>
            <span className="text-sm font-bold">{row.movement}</span>
            <span className="text-sm font-semibold text-white/72">{row.vehicle}</span>
            <p className="text-sm leading-6 text-white/64">{row.change}</p>
            <span className="text-sm font-semibold text-white/50">{row.actor}</span>
          </article>
        ))}
        {!rows.length ? <EmptyReport label="No hay historial de vehículos para el filtro actual." /> : null}
      </div>
    </Card>
  );
}

function AuditReport({ events }: { events: OperationalEvent[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden grid-cols-[190px_190px_minmax(0,1fr)_220px_110px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/42 xl:grid">
        <span>Fecha/Hora</span>
        <span>Movimiento</span>
        <span>Detalle</span>
        <span>Usuario</span>
        <span>Tipo</span>
      </div>
      <div className="divide-y divide-white/10">
        {events.map((event) => (
          <article key={event.id} className="grid gap-2 px-5 py-4 xl:grid-cols-[190px_190px_minmax(0,1fr)_220px_110px] xl:items-center xl:gap-4">
            <time className="text-sm font-semibold text-white/62">{formatDateTime(event.createdAt)}</time>
            <span className="text-sm font-bold">{event.title}</span>
            <p className="text-sm leading-6 text-white/64">{event.detail}</p>
            <span className="text-sm font-semibold text-white/50">{event.actor}</span>
            <span className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-bold text-white/62">
              {eventType(event.title)}
            </span>
          </article>
        ))}
        {!events.length ? <EmptyReport label="No hay auditoría para el filtro actual." /> : null}
      </div>
    </Card>
  );
}

function EmptyReport({ label }: { label: string }) {
  return <div className="p-6 text-sm font-semibold text-white/50">{label}</div>;
}
