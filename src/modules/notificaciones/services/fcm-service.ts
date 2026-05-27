import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage, type Messaging, type MessagePayload } from "firebase/messaging";
import { loadAccountNotificationSettings } from "@/modules/notificaciones/utils/notification-settings";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

export type FcmRegistrationResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "disabled" | "missing_config" | "permission_denied" | "token_error"; message: string };

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );
}

function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneApp() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function browserSupportsNotifications() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function accountNotificationsEnabled() {
  return loadAccountNotificationSettings().enablePushNotifications;
}

export async function getFcmMessaging(): Promise<Messaging | null> {
  if (!(await isSupported())) return null;
  if (!hasFirebaseConfig()) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export async function requestFcmToken(): Promise<FcmRegistrationResult> {
  if (!accountNotificationsEnabled()) {
    return {
      ok: false,
      reason: "disabled",
      message: "Las notificaciones están desactivadas en la configuración de tu cuenta."
    };
  }

  if (!browserSupportsNotifications()) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Este navegador no soporta notificaciones push."
    };
  }

  if (isIosBrowser() && !isStandaloneApp()) {
    return {
      ok: false,
      reason: "unsupported",
      message: "En iPhone, instala FireOps en la pantalla de inicio para activar notificaciones push."
    };
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || !hasFirebaseConfig()) {
    return {
      ok: false,
      reason: "missing_config",
      message: "Falta completar la configuración pública del proyecto Firebase."
    };
  }

  const messaging = await getFcmMessaging();
  if (!messaging) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Este navegador no soporta Firebase Cloud Messaging."
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      reason: "permission_denied",
      message: "Permiso de notificaciones denegado."
    };
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      return {
        ok: false,
        reason: "token_error",
        message: "Firebase no devolvió un token para este navegador."
      };
    }

    window.localStorage.setItem("fireops-fcm-token", token);
    return { ok: true, token };
  } catch (error) {
    console.error("[FireOps] FCM registration failed", error);
    return {
      ok: false,
      reason: "token_error",
      message: "No se pudo registrar este dispositivo en FCM."
    };
  }
}

export async function subscribeForegroundMessages(onNotification: (payload: MessagePayload) => void) {
  const messaging = await getFcmMessaging();
  if (!messaging) return () => undefined;
  return onMessage(messaging, onNotification);
}

export async function showSystemNotification(title: string, body: string) {
  if (!accountNotificationsEnabled()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: { url: "/operaciones" }
  });
}
