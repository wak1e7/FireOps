import { isAllowedOrigin, jsonResponse, readJsonObject } from "@/lib/server-security";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  formatPeruPhone,
  isStrongPassword,
  validateEmail,
  validatePeruPhone
} from "@/modules/auth/utils/validators";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ message: "Origen no permitido." }, { status: 403 });
  }

  const payload = await readJsonObject(request);
  const phone = typeof payload?.phone === "string" ? payload.phone : "";
  const email = typeof payload?.email === "string" ? payload.email : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  const confirmPassword = typeof payload?.confirmPassword === "string" ? payload.confirmPassword : "";

  if (!phone || !validatePeruPhone(phone)) {
    return jsonResponse({ message: "Teléfono inválido. Debe tener 9 números e iniciar con 9." }, { status: 422 });
  }

  if (!email || !validateEmail(email)) {
    return jsonResponse({ message: "Correo inválido." }, { status: 422 });
  }

  if (!password || password !== confirmPassword) {
    return jsonResponse({ message: "Las contraseñas no coinciden." }, { status: 422 });
  }

  if (!isStrongPassword(password)) {
    return jsonResponse({ message: "La contraseña no cumple las reglas." }, { status: 422 });
  }

  const serverClient = await createClient();
  const {
    data: { user }
  } = await serverClient.auth.getUser();

  if (!user) {
    return jsonResponse({ message: "Sesión no encontrada." }, { status: 401 });
  }

  const normalizedPhone = formatPeruPhone(phone);
  const normalizedEmail = email.trim().toLowerCase();
  const admin = createAdminClient();
  const { error: updateUserError } = await admin.auth.admin.updateUserById(user.id, {
    email: normalizedEmail,
    password,
    email_confirm: true
  });

  if (updateUserError) {
    return jsonResponse({ message: "No se pudo actualizar la cuenta." }, { status: 500 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      phone: normalizedPhone,
      email: normalizedEmail,
      auth_email: normalizedEmail,
      must_change_password: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (profileError) {
    return jsonResponse({ message: "No se pudo actualizar el perfil." }, { status: 500 });
  }

  return jsonResponse({ ok: true });
}
