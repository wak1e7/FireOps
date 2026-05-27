"use client";

import { ClipboardPlus, LogIn, LogOut, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";

type HistoryFilter = "todos" | "personal" | "vehiculos";

const PAGE_SIZE = 20;

function eventType(title: string): Exclude<HistoryFilter, "todos"> | "otros" {
  const normalized = title.toLowerCase();
  if (
    normalized.includes("personal") ||
    normalized.includes("entrada") ||
    normalized.includes("salida") ||
    normalized.includes("ingresó") ||
    normalized.includes("ingreso") ||
    normalized.includes("salió") ||
    normalized.includes("salio") ||
    normalized.includes("creación de personal") ||
    normalized.includes("creacion de personal")
  ) {
    return "personal";
  }
  if (normalized.includes("vehículo") || normalized.includes("vehiculo") || normalized.includes("unidad")) return "vehiculos";
  if (normalized.includes("alerta") || normalized.includes("emergencia")) return "personal";
  return "otros";
}

function HistoryIcon({ title }: { title: string }) {
  const normalized = title.toLowerCase();
  const Icon = normalized.includes("entrada")
    ? LogIn
    : normalized.includes("salida")
      ? LogOut
      : normalized.includes("creación") || normalized.includes("creacion")
        ? ClipboardPlus
        : Truck;

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-red-100">
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function ActivityFeed() {
  const events = useOperationsStore((state) => state.events);
  const [filter, setFilter] = useState<HistoryFilter>("todos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events
      .filter((event) => filter === "todos" || eventType(event.title) === filter)
      .filter((event) => {
        if (!normalizedQuery) return true;
        return `${event.title} ${event.detail} ${event.actor}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events, filter, query]);
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">Historial</p>
          <h1 className="text-3xl font-black tracking-tight">Auditoría operativa</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/58">
            Registro operativo de personal y unidades de emergencia.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.045] p-1">
            {[
              ["todos", "General"],
              ["personal", "Personal"],
              ["vehiculos", "Unidades"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  filter === value ? "bg-fire-red text-white" : "text-white/58 hover:bg-white/8 hover:text-white"
                }`}
                onClick={() => {
                  setFilter(value as HistoryFilter);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="relative block min-w-64">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="h-11 min-h-11 py-2 pl-11 font-semibold"
              placeholder="Buscar movimiento"
            />
          </span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[190px_260px_minmax(0,1fr)_220px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/42 lg:grid">
          <span>Fecha/Hora</span>
          <span>Movimiento</span>
          <span>Detalle</span>
          <span>Usuario</span>
        </div>
        <div className="divide-y divide-white/10">
          {paginatedEvents.map((event) => (
            <article key={event.id} className="grid gap-2 px-5 py-4 lg:grid-cols-[190px_260px_minmax(0,1fr)_220px] lg:items-center lg:gap-4">
              <time className="text-sm font-semibold text-white/62">{formatDateTime(event.createdAt)}</time>
              <div className="flex items-center gap-3">
                <HistoryIcon title={event.title} />
                <span className="text-sm font-bold leading-5 text-white">{event.title}</span>
              </div>
              <p className="text-sm leading-6 text-white/64">{event.detail}</p>
              <span className="text-sm font-semibold text-white/50">{event.actor}</span>
            </article>
          ))}
          {!filteredEvents.length ? (
            <div className="p-6 text-sm font-semibold text-white/50">No hay movimientos para mostrar.</div>
          ) : null}
        </div>
      </Card>

      {filteredEvents.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-white/50">
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredEvents.length)} de {filteredEvents.length}
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
    </section>
  );
}
