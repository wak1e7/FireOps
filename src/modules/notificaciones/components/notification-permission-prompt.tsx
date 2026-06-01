"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserSupportsNotifications, requestFcmToken } from "@/modules/notificaciones/services/fcm-service";
import {
  hasAskedNotificationPermissionOnDevice,
  loadAccountNotificationSettings,
  markNotificationPermissionAskedOnDevice,
  saveAccountNotificationSettings
} from "@/modules/notificaciones/utils/notification-settings";

export function NotificationPermissionPrompt() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!browserSupportsNotifications()) return;

    if (Notification.permission === "granted" && loadAccountNotificationSettings().enablePushNotifications) {
      requestFcmToken().then((result) => {
        if (result.ok) {
          markNotificationPermissionAskedOnDevice();
          return;
        }
        setStatus(result.message);
        setOpen(true);
      });
      return;
    }

    if (hasAskedNotificationPermissionOnDevice()) return;

    if (Notification.permission === "denied") {
      saveAccountNotificationSettings({ enablePushNotifications: false });
      markNotificationPermissionAskedOnDevice();
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function accept() {
    setLoading(true);
    saveAccountNotificationSettings({ enablePushNotifications: true });
    const result = await requestFcmToken();
    setLoading(false);

    if (result.ok) {
      markNotificationPermissionAskedOnDevice();
      setOpen(false);
      return;
    }

    setStatus(result.message);
  }

  function reject() {
    saveAccountNotificationSettings({ enablePushNotifications: false });
    markNotificationPermissionAskedOnDevice();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="glass-panel w-full max-w-md rounded-3xl p-5 shadow-glow">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-red-300/15 bg-red-500/10 text-red-100">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black">Activar notificaciones</h2>
              <p className="mt-1 text-sm text-white/58">Este dispositivo puede recibir alertas operativas de FireOps.</p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-white/72 hover:bg-white/12 hover:text-white"
            aria-label="Cerrar"
            onClick={reject}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm leading-6 text-white/64">
          Se preguntará una sola vez en este dispositivo. Si rechazas, podrás activarlas luego desde Configuración.
        </p>
        {status ? <p className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-xs font-semibold text-red-100">{status}</p> : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={reject} disabled={loading}>
            Rechazar
          </Button>
          <Button type="button" onClick={accept} disabled={loading}>
            {loading ? "Activando..." : "Aceptar"}
          </Button>
        </div>
      </section>
    </div>
  );
}
