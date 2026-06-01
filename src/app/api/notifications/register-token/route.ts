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

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }

  const user = await currentUser(request);
  if (!user) return jsonResponse({ ok: false, message: "No autorizado." }, { status: 401 });

  const payload = await readJsonObject(request);
  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const deviceLabel = typeof payload?.deviceLabel === "string" ? payload.deviceLabel.trim().slice(0, 180) : null;
  if (!token || token.length > 4096) {
    return jsonResponse({ ok: false, message: "Token FCM invalido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active) return jsonResponse({ ok: false, message: "Perfil no autorizado." }, { status: 403 });

  const { error } = await admin.from("fcm_tokens").upsert(
    {
      user_id: user.id,
      token,
      device_label: deviceLabel || null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "token" }
  );

  if (error) {
    console.error("[FireOps] FCM token persistence failed", { code: error.code });
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

  const payload = await readJsonObject(request);
  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  if (!token) return jsonResponse({ ok: true });

  const { error } = await createAdminClient().from("fcm_tokens").delete().eq("user_id", user.id).eq("token", token);
  if (error) {
    console.error("[FireOps] FCM token removal failed", { code: error.code });
    return jsonResponse({ ok: false, message: "No se pudo retirar el dispositivo." }, { status: 500 });
  }

  return jsonResponse({ ok: true });
}
