import { isAllowedOrigin, jsonResponse, readJsonObject } from "@/lib/server-security";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

async function currentUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (token) {
    const {
      data: { user }
    } = await createAdminClient().auth.getUser(token);

    if (user) return user;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

function subscriptionPayload(payload: Record<string, unknown> | null) {
  const endpoint = typeof payload?.endpoint === "string" ? payload.endpoint.trim() : "";
  const keys = payload?.keys && typeof payload.keys === "object" && !Array.isArray(payload.keys)
    ? payload.keys as Record<string, unknown>
    : null;
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys?.auth === "string" ? keys.auth.trim() : "";
  const deviceLabel = typeof payload?.deviceLabel === "string" ? payload.deviceLabel.trim().slice(0, 180) : null;
  return { endpoint, p256dh, auth, deviceLabel };
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }

  const user = await currentUser(request);
  if (!user) return jsonResponse({ ok: false, message: "No autorizado." }, { status: 401 });

  const subscription = subscriptionPayload(await readJsonObject(request));
  if (!subscription.endpoint || !subscription.p256dh || !subscription.auth || subscription.endpoint.length > 4096) {
    return jsonResponse({ ok: false, message: "Suscripcion Web Push invalida." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active) return jsonResponse({ ok: false, message: "Perfil no autorizado." }, { status: 403 });

  const { error } = await admin.from("web_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      device_label: subscription.deviceLabel,
      updated_at: new Date().toISOString()
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    console.error("[FireOps] Web Push subscription persistence failed", { code: error.code });
    return jsonResponse({ ok: false, message: "No se pudo registrar el dispositivo." }, { status: 500 });
  }

  return jsonResponse({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }

  const user = await currentUser(request);
  if (!user) return jsonResponse({ ok: false, message: "No autorizado." }, { status: 401 });

  const endpoint = subscriptionPayload(await readJsonObject(request)).endpoint;
  if (!endpoint) return jsonResponse({ ok: true });

  const { error } = await createAdminClient().from("web_push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) {
    console.error("[FireOps] Web Push subscription removal failed", { code: error.code });
    return jsonResponse({ ok: false, message: "No se pudo retirar el dispositivo." }, { status: 500 });
  }

  return jsonResponse({ ok: true });
}
