import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function jsString(value: string | undefined) {
  return JSON.stringify(value ?? "");
}

export function GET() {
  const script = `
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: ${jsString(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)},
  authDomain: ${jsString(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)},
  projectId: ${jsString(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)},
  storageBucket: ${jsString(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)},
  messagingSenderId: ${jsString(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)},
  appId: ${jsString(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)},
  measurementId: ${jsString(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID)}
});

firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || event.notification.data?.FCM_MSG?.data?.url || "/operaciones";
  event.waitUntil(clients.openWindow(url));
});
`.trim();

  return new NextResponse(script, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/javascript; charset=utf-8"
    }
  });
}
