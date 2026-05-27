"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, CheckCircle2, Clock3, MapPin, Radio, Send, Siren, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/utils";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import type { EmergencyAlert, EmergencyResponseStatus, EmergencyType, Profile } from "@/modules/shared/types/domain";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";
import { emergencyResponseLabel, emergencyTypeLabel } from "@/modules/shared/utils/labels";

const emergencyTypes: EmergencyType[] = [
  "incendio",
  "accidente_vehicular",
  "rescate",
  "emergencia_medica",
  "materiales_peligrosos",
  "apoyo_operativo"
];

function responseTone(status?: EmergencyResponseStatus) {
  if (status === "confirmed") return "border-emerald-300/35 bg-emerald-500/10 text-emerald-100";
  if (status === "on_way") return "border-sky-300/35 bg-sky-500/10 text-sky-100";
  if (status === "unavailable") return "border-red-300/35 bg-red-500/10 text-red-100";
  return "border-white/10 bg-white/[0.045] text-white/58";
}

function isAlertUsable(alert: EmergencyAlert) {
  return alert.status === "active" && new Date(alert.expiresAt).getTime() > Date.now();
}

function EmergencyAlertModal({ issuer, onClose }: { issuer: Profile; onClose: () => void }) {
  const emitEmergencyAlert = useOperationsStore((state) => state.emitEmergencyAlert);
  const [type, setType] = useState<EmergencyType>("incendio");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function sendAlert() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    emitEmergencyAlert({ type, description, location, issuerId: issuer.id });
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/72 p-4 backdrop-blur-sm">
      <section className="glass-panel mx-auto my-4 max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl p-5 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Emitir alerta operativa</h2>
            <p className="mt-1 text-sm text-white/58">Notifica al personal disponible de Salvadora Lambayeque 88.</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/8 text-white/72 transition hover:bg-white/12 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-bold text-white/72">Tipo de emergencia</label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {emergencyTypes.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`min-h-12 rounded-xl border px-4 text-left text-sm font-semibold transition ${
                    type === item
                      ? "border-red-300/40 bg-fire-red text-white shadow-glow"
                      : "border-white/10 bg-white/[0.045] text-white/68 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => {
                    setType(item);
                    setConfirming(false);
                  }}
                >
                  {emergencyTypeLabel[item]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-white/72" htmlFor="emergency-description">
              Descripción
            </label>
            <textarea
              id="emergency-description"
              value={description}
              maxLength={180}
              onChange={(event) => {
                setDescription(event.target.value);
                setConfirming(false);
              }}
              className="mt-3 min-h-28 w-full rounded-xl border border-white/18 bg-white px-4 py-3 text-base font-semibold text-slate-950 caret-fire-red outline-none transition placeholder:text-slate-500 focus:border-fire-red focus:ring-2 focus:ring-fire-red/25"
              placeholder="Detalle breve del incidente"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-white/72" htmlFor="emergency-location">
              Ubicación o referencia
            </label>
            <Input
              id="emergency-location"
              value={location}
              maxLength={120}
              onChange={(event) => {
                setLocation(event.target.value);
                setConfirming(false);
              }}
              className="mt-3 font-semibold"
              placeholder="Av. Principal, cuadra 4"
            />
          </div>

          {confirming ? (
            <div className="rounded-xl border border-red-300/30 bg-red-500/12 p-4 text-sm font-semibold leading-6 text-red-50">
              Confirmación final: se notificará solo al personal en servicio y en alerta.
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" className="min-h-12" onClick={sendAlert}>
              <Send className="h-4 w-4" />
              {confirming ? "Confirmar y enviar" : "Enviar alerta"}
            </Button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function ChiefEmergencyPanel({ currentProfile, autoOpenForm = false }: { currentProfile: Profile; autoOpenForm?: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const autoOpenedRef = useRef(false);
  const profiles = useOperationsStore((state) => state.profiles);
  const alerts = useOperationsStore((state) => state.emergencyAlerts);
  const cancelEmergencyAlert = useOperationsStore((state) => state.cancelEmergencyAlert);
  const activeAlert = alerts.find(isAlertUsable);
  const selectedAlert = activeAlert;
  const responseByProfile = useMemo(() => {
    const map = new Map<string, EmergencyResponseStatus>();
    selectedAlert?.responses.forEach((response) => map.set(response.profileId, response.status));
    return map;
  }, [selectedAlert]);
  const notifiedProfiles = useMemo(() => {
    return selectedAlert?.recipients
      .map((recipient) => profiles.find((profile) => profile.id === recipient.profileId))
      .filter(Boolean) as Profile[] | undefined;
  }, [profiles, selectedAlert]);
  const confirmed = selectedAlert?.responses.filter((response) => response.status === "confirmed").length ?? 0;
  const onWay = selectedAlert?.responses.filter((response) => response.status === "on_way").length ?? 0;
  const unavailable = selectedAlert?.responses.filter((response) => response.status === "unavailable").length ?? 0;
  const notified = selectedAlert?.recipients.length ?? 0;
  const unanswered = Math.max(0, notified - confirmed - onWay - unavailable);

  useEffect(() => {
    if (!autoOpenForm || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    setModalOpen(true);
  }, [autoOpenForm]);

  return (
    <section className="overflow-hidden rounded-2xl border border-red-300/30 bg-[#170812] shadow-glow">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200/76">Emergencias</p>
          <h2 className="mt-2 text-2xl font-black">Alerta de emergencia</h2>
        </div>
        <Button type="button" className="min-h-14 bg-red-600 text-base hover:bg-red-500" onClick={() => setModalOpen(true)}>
          <Siren className="h-5 w-5" />
          Emitir alerta operativa
        </Button>
      </div>

      {selectedAlert ? (
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-300/30 bg-red-500/12 px-3 py-1 text-sm font-black text-red-100">
                {emergencyTypeLabel[selectedAlert.type]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-sm font-bold text-white/62">
                {selectedAlert.status === "active" ? "Activa" : selectedAlert.status === "cancelled" ? "Cancelada" : "Expirada"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-sm font-bold text-white/62">
                <Clock3 className="h-4 w-4" />
                Hasta {formatTime(selectedAlert.expiresAt)}
              </span>
            </div>
            {selectedAlert.location ? (
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-white/78">
                <MapPin className="h-4 w-4 text-red-200" />
                {selectedAlert.location}
              </p>
            ) : null}
            {selectedAlert.description ? (
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/62">{selectedAlert.description}</p>
            ) : null}
            {selectedAlert.status === "active" ? (
              <div className="mt-5">
                {cancelTarget === selectedAlert.id ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-red-300/25 bg-red-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold text-red-50">Confirmar cancelación de esta alerta.</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setCancelTarget(null)}>
                        Volver
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          cancelEmergencyAlert(selectedAlert.id, currentProfile.id);
                          setCancelTarget(null);
                        }}
                      >
                        Cancelar alerta
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="danger" onClick={() => setCancelTarget(selectedAlert.id)}>
                    <Ban className="h-4 w-4" />
                    Cancelar alerta de emergencia
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              ["Notificados", notified],
              ["Confirmaron", confirmed],
              ["En camino", onWay],
              ["No respondieron", unanswered]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">{label}</p>
                <p className="mt-2 text-3xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="xl:col-span-2">
            <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
              {notifiedProfiles?.map((profile) => {
                const response = responseByProfile.get(profile.id);
                return (
                  <article key={profile.id} className="grid gap-2 bg-white/[0.025] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_170px] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{profile.fullName}</p>
                      <p className="mt-1 text-xs font-semibold text-white/46">
                        {profile.serviceStatus === "en_servicio" ? "En servicio" : "En alerta"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-center text-xs font-black ${responseTone(response)}`}>
                      {response ? emergencyResponseLabel[response] : "Sin respuesta"}
                    </span>
                  </article>
                );
              })}
              {!notifiedProfiles?.length ? (
                <div className="p-4 text-sm font-semibold text-white/54">No hay personal en servicio o alerta para notificar.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 text-sm font-semibold text-white/56">No existen alertas operativas activas.</div>
      )}

      {modalOpen ? <EmergencyAlertModal issuer={currentProfile} onClose={() => setModalOpen(false)} /> : null}
    </section>
  );
}

function FirefighterEmergencyCard({ currentProfile }: { currentProfile: Profile }) {
  const alerts = useOperationsStore((state) => state.emergencyAlerts);
  const respondToEmergencyAlert = useOperationsStore((state) => state.respondToEmergencyAlert);
  const activeAlert = alerts.find((alert) => isAlertUsable(alert) && alert.recipients.some((recipient) => recipient.profileId === currentProfile.id));
  const response = activeAlert?.responses.find((item) => item.profileId === currentProfile.id);

  if (!activeAlert) return null;

  const canConfirm = currentProfile.serviceStatus === "en_servicio";
  const canGo = currentProfile.serviceStatus === "en_alerta";

  return (
    <section className="rounded-2xl border border-red-300/35 bg-red-950/60 p-5 shadow-glow">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-200/30 bg-red-500/20 text-red-100">
          <Radio className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">Alerta de emergencia</h2>
          <p className="mt-1 text-sm font-bold text-red-100">{emergencyTypeLabel[activeAlert.type]}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/72">
            {activeAlert.location
              ? `${emergencyTypeLabel[activeAlert.type]} reportado en ${activeAlert.location}. Se requiere personal disponible de la compañía.`
              : `${emergencyTypeLabel[activeAlert.type]} reportado. Se requiere personal disponible de la compañía.`}
          </p>
          {activeAlert.description ? <p className="mt-2 text-sm leading-6 text-white/58">{activeAlert.description}</p> : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {canConfirm ? (
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-500"
            disabled={response?.status === "confirmed"}
            onClick={() => respondToEmergencyAlert(activeAlert.id, currentProfile.id, "confirmed")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmo asistencia
          </Button>
        ) : null}
        {canGo ? (
          <Button
            type="button"
            className="bg-sky-600 hover:bg-sky-500"
            disabled={response?.status === "on_way"}
            onClick={() => respondToEmergencyAlert(activeAlert.id, currentProfile.id, "on_way")}
          >
            <Siren className="h-4 w-4" />
            Estoy en camino
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          disabled={response?.status === "unavailable"}
          onClick={() => respondToEmergencyAlert(activeAlert.id, currentProfile.id, "unavailable")}
        >
          <X className="h-4 w-4" />
          No puedo asistir
        </Button>
      </div>
      {response ? (
        <p className="mt-3 text-sm font-semibold text-white/58">Respuesta registrada: {emergencyResponseLabel[response.status]}.</p>
      ) : null}
    </section>
  );
}

export function EmergencyAlertModule({ autoOpenForm = false }: { autoOpenForm?: boolean }) {
  const profiles = useOperationsStore((state) => state.profiles);
  const expireEmergencyAlerts = useOperationsStore((state) => state.expireEmergencyAlerts);
  const currentProfile = getCurrentProfile(profiles);

  useEffect(() => {
    expireEmergencyAlerts();
    const timer = window.setInterval(expireEmergencyAlerts, 15000);
    return () => window.clearInterval(timer);
  }, [expireEmergencyAlerts]);

  if (!currentProfile) return null;
  if (isChiefProfile(currentProfile)) return <ChiefEmergencyPanel currentProfile={currentProfile} autoOpenForm={autoOpenForm} />;
  return <FirefighterEmergencyCard currentProfile={currentProfile} />;
}
