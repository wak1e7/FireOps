import { jsonResponse } from "@/lib/server-security";

export function GET() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return jsonResponse({ ok: false, message: "Web Push no esta configurado." }, { status: 503 });
  }

  return jsonResponse({ ok: true, publicKey });
}
