import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  formatPeruPhone,
  isStrongPassword,
  validateEmail,
  validatePeruPhone
} from "@/modules/auth/utils/validators";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };

  if (!payload.phone || !validatePeruPhone(payload.phone)) {
    return NextResponse.json({ message: "Teléfono inválido. Debe tener 9 números e iniciar con 9." }, { status: 422 });
  }

  if (!payload.email || !validateEmail(payload.email)) {
    return NextResponse.json({ message: "Correo inválido." }, { status: 422 });
  }

  if (!payload.password || payload.password !== payload.confirmPassword) {
    return NextResponse.json({ message: "Las contraseñas no coinciden." }, { status: 422 });
  }

  if (!isStrongPassword(payload.password)) {
    return NextResponse.json({ message: "La contraseña no cumple las reglas." }, { status: 422 });
  }

  const serverClient = await createClient();
  const {
    data: { user }
  } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Sesión no encontrada." }, { status: 401 });
  }

  const normalizedPhone = formatPeruPhone(payload.phone);
  const normalizedEmail = payload.email.trim().toLowerCase();
  const admin = createAdminClient();
  const { error: updateUserError } = await admin.auth.admin.updateUserById(user.id, {
    email: normalizedEmail,
    password: payload.password,
    email_confirm: true
  });

  if (updateUserError) {
    return NextResponse.json({ message: updateUserError.message }, { status: 500 });
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
    return NextResponse.json({ message: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
