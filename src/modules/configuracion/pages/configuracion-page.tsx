"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/modules/dashboard/components/app-shell";
import { Card } from "@/components/ui/card";
import {
  loadAccountNotificationSettings,
  saveAccountNotificationSettings
} from "@/modules/notificaciones/utils/notification-settings";
import { requestFcmToken, unregisterCurrentFcmToken } from "@/modules/notificaciones/services/fcm-service";
import { useToast } from "@/modules/shared/components/toast-provider";

type NotificationOption = {
  value: boolean;
  label: string;
  icon: typeof Bell;
};

const notificationOptions: NotificationOption[] = [
  { value: true, label: "Activadas", icon: Bell },
  { value: false, label: "Desactivadas", icon: BellOff }
];

export function ConfiguracionPage() {
  const [settings, setSettings] = useState(loadAccountNotificationSettings());
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const selectedOption = notificationOptions.find((option) => option.value === settings.enablePushNotifications) ?? notificationOptions[0];
  const SelectedIcon = selectedOption.icon;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettings(loadAccountNotificationSettings());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function updateNotifications(value: boolean) {
    const nextSettings = { enablePushNotifications: value };
    setSettings(nextSettings);
    setOpen(false);
    saveAccountNotificationSettings(nextSettings);
    if (value) {
      const result = await requestFcmToken();
      showToast(result.ok ? "Notificaciones activadas en este dispositivo." : result.message);
      return;
    } else {
      await unregisterCurrentFcmToken();
    }
    showToast();
  }

  return (
    <AppShell>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">Configuración</p>
          <h1 className="text-3xl font-black tracking-tight">Configuración de cuenta</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/58">
            Administra las preferencias y notificaciones de tu cuenta.
          </p>
        </div>

        <Card className="max-w-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-red-300/15 bg-red-500/10 text-red-100">
              <Bell className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-black">Notificaciones</h2>
          </div>

          <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.045] p-4 sm:grid-cols-[1fr_310px] sm:items-center">
            <div>
              <h3 className="text-sm font-bold">Notificaciones push</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/46">
                Recibir alertas operativas y cambios importantes en esta cuenta.
              </p>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-red-200/18 bg-[#0b1120]/92 px-4 font-semibold text-white outline-none transition hover:border-red-200/30 hover:bg-white/[0.06] focus:border-fire-red focus:ring-2 focus:ring-fire-red/25"
                onClick={() => setOpen((value) => !value)}
              >
                <span className="flex items-center gap-3">
                  <SelectedIcon className="h-5 w-5 text-red-100" />
                  {selectedOption.label}
                </span>
                {open ? <ChevronUp className="h-5 w-5 text-red-100" /> : <ChevronDown className="h-5 w-5 text-red-100" />}
              </button>

              {open ? (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-white/12 bg-[#070d1b]/98 p-1 text-white shadow-panel backdrop-blur-xl"
                >
                  {notificationOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = option.value === settings.enablePushNotifications;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`flex h-12 w-full items-center gap-3 rounded-lg px-4 text-left font-semibold transition ${
                          selected ? "bg-fire-red text-white" : "text-white/78 hover:bg-white/8 hover:text-white"
                        }`}
                        onClick={() => updateNotifications(option.value)}
                      >
                        <Icon className={`h-5 w-5 ${selected ? "text-white" : "text-red-100"}`} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
