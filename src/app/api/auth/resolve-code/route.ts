import { isAllowedOrigin, isRateLimited, jsonResponse, readJsonObject } from "@/lib/server-security";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ message: "Origen no permitido." }, { status: 403 });
  }

  if (isRateLimited(request, "resolve-code", 12, 60_000)) {
    return jsonResponse({ message: "Demasiados intentos. Intenta nuevamente en un minuto." }, { status: 429 });
  }

  const payload = await readJsonObject(request);
  const firefighterCode = typeof payload?.firefighterCode === "string" ? payload.firefighterCode : "";
  const normalizedCode = firefighterCode.trim().toUpperCase();

  if (!/^[A-Z0-9]{4,16}$/.test(normalizedCode)) {
    return jsonResponse({ message: "Código requerido." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("auth_email,email,must_change_password")
    .eq("firefighter_code", normalizedCode)
    .single();

  if (error || !data) {
    return jsonResponse({ message: "Código o contraseña inválidos." }, { status: 404 });
  }

  return jsonResponse({
    email: data.email || data.auth_email,
    mustChangePassword: data.must_change_password
  });
}
