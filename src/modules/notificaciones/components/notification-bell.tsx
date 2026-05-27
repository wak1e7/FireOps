"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOperationsStore } from "@/modules/dashboard/stores/operations-store";
import { showSystemNotification, subscribeForegroundMessages } from "@/modules/notificaciones/services/fcm-service";
import { getCurrentProfile, isChiefProfile } from "@/modules/shared/utils/current-profile";

function dayKey(date: Date) {
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function notificationTime(date: Date) {
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const initializedNotificationsRef = useRef(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const profiles = useOperationsStore((state) => state.profiles);
  const allNotifications = useOperationsStore((state) => state.notifications);
  const addNotification = useOperationsStore((state) => state.addNotification);
  const markNotificationsRead = useOperationsStore((state) => state.markNotificationsRead);
  const currentProfile = getCurrentProfile(profiles);
  const isChief = isChiefProfile(currentProfile);
  const notifications = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return allNotifications
      .filter((notification) => {
        const createdAt = new Date(notification.createdAt);
        if (Number.isNaN(createdAt.getTime()) || createdAt < weekAgo) return false;
        if (notification.recipientIds?.length) return currentProfile ? notification.recipientIds.includes(currentProfile.id) : false;
        if (!notification.audience || notification.audience === "all") return true;
        return notification.audience === "chiefs" ? isChief : !isChief;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allNotifications, currentProfile, isChief]);
  const unread = notifications.filter((notification) => !notification.read).length;
  const visibleNotificationIds = useMemo(
    () => notifications.map((notification) => notification.id).join("|"),
    [notifications]
  );
  const groupedNotifications = useMemo(() => {
    return notifications.reduce<Array<{ date: string; items: typeof notifications }>>((groups, notification) => {
      const createdAt = new Date(notification.createdAt);
      const key = dayKey(createdAt);
      const existingGroup = groups.find((group) => group.date === key);
      if (existingGroup) {
        existingGroup.items.push(notification);
      } else {
        groups.push({ date: key, items: [notification] });
      }
      return groups;
    }, []);
  }, [notifications]);

  function openPanel() {
    setClosing(false);
    setOpen(true);
  }

  function closePanel() {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 180);
  }

  useEffect(() => {
    if (!initializedNotificationsRef.current) {
      seenNotificationIdsRef.current = new Set(notifications.map((notification) => notification.id));
      initializedNotificationsRef.current = true;
      return;
    }

    const freshNotification = notifications.find((notification) => !seenNotificationIdsRef.current.has(notification.id));
    notifications.forEach((notification) => seenNotificationIdsRef.current.add(notification.id));

    if (freshNotification) {
      showSystemNotification(freshNotification.title, freshNotification.body);
    }
  }, [notifications]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    subscribeForegroundMessages((payload) => {
      addNotification({
        id: crypto.randomUUID(),
        title: payload.notification?.title ?? "FireOps",
        body: payload.notification?.body ?? "Nueva actividad operativa",
        read: false,
        createdAt: new Date().toISOString(),
        audience: "all"
      });
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      unsubscribe?.();
    };
  }, [addNotification]);

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const ids = visibleNotificationIds ? visibleNotificationIds.split("|") : [];
    if (ids.length) markNotificationsRead(ids);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [markNotificationsRead, open, visibleNotificationIds]);

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Abrir notificaciones"
        aria-expanded={open}
        onClick={openPanel}
        className="lg:border-0 lg:bg-transparent lg:hover:bg-white/8"
      >
        <Bell className="h-5 w-5" />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-fire-red px-1 text-[11px] font-bold">
            {unread}
          </span>
        ) : null}
      </Button>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div className="fixed inset-0 z-[999] overflow-hidden">
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={closePanel}
          />
          <section className={`fixed bottom-0 right-0 top-0 z-[1000] w-[min(75vw,420px)] overflow-hidden border-l border-white/10 bg-[#070d1b] text-white shadow-panel ${
            closing ? "animate-[notification-panel-out_180ms_ease-in_forwards]" : "animate-[notification-panel-in_180ms_ease-out]"
          }`}>
            <div className="absolute inset-0 bg-[#070d1b]" />
            <header className="absolute left-0 right-0 top-0 z-10 flex h-16 items-center gap-3 border-b border-white/10 bg-[#090f1d] px-5">
              <button
                type="button"
                aria-label="Cerrar notificaciones"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/70 transition hover:bg-white/8 hover:text-white"
                onClick={closePanel}
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-black">Notificaciones</h2>
            </header>

            <div className="absolute bottom-0 left-0 right-0 top-16 overflow-y-auto bg-[#070d1b]">
              {groupedNotifications.map((group) => (
                <section key={group.date}>
                  <div className="sticky top-0 z-10 flex min-h-12 items-center justify-between border-b border-white/10 bg-[#070d1b]/96 px-5 backdrop-blur-xl">
                    <h3 className="text-sm font-black text-red-100">{group.date}</h3>
                  </div>
                  <div className="divide-y divide-white/10">
                    {group.items.map((notification) => {
                      const createdAt = new Date(notification.createdAt);
                      return (
                        <article key={notification.id} className="bg-white/[0.025] px-5 py-5">
                          <div className="flex items-start gap-3">
                            <span className="relative mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-red-100">
                              <Megaphone className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-sm font-black text-white">{notification.title}</h4>
                                <time className="shrink-0 text-xs font-semibold text-white/42">
                                  {notificationTime(createdAt)}
                                </time>
                              </div>
                              <p className="mt-2 text-sm font-semibold leading-6 text-white/76">
                                {notification.body}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
              {!notifications.length ? (
                <div className="px-5 py-10 text-sm font-semibold text-white/52">
                  No hay notificaciones de esta semana.
                </div>
              ) : null}
            </div>
          </section>
        </div>,
        document.body
      )
        : null}
    </div>
  );
}
