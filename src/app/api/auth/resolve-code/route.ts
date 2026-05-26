import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const { firefighterCode } = (await request.json()) as { firefighterCode?: string };

  if (!firefighterCode) {
    return NextResponse.json({ message: "Código requerido." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("auth_email,email,must_change_password")
    .eq("firefighter_code", firefighterCode.trim().toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ message: "Código no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    email: data.email || data.auth_email,
    mustChangePassword: data.must_change_password
  });
}
