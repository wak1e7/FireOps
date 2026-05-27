import { createClient } from "@/utils/supabase/client";
import type { FirstLoginPayload, LoginResult } from "@/modules/auth/types/auth";

export async function loginWithFirefighterCode(
  firefighterCode: string,
  password: string
): Promise<LoginResult> {
  const code = firefighterCode.trim().toUpperCase();

  try {
    const resolveResponse = await fetch("/api/auth/resolve-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firefighterCode: code })
    });

    if (!resolveResponse.ok) {
      throw new Error("No se pudo resolver el código.");
    }

    const { email, mustChangePassword } = (await resolveResponse.json()) as {
      email: string;
      mustChangePassword: boolean;
    };

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const token = data.session?.access_token;
    if (!token) throw new Error("No se pudo crear la sesión.");

    const policyResponse = await fetch("/api/auth/session-policy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!policyResponse.ok) throw new Error("No se pudo iniciar la política de sesión.");

    window.localStorage.setItem("fireops-demo-session", code);
    return { ok: true, mustChangePassword };
  } catch {
    return {
      ok: false,
      message: "Código o contraseña inválidos."
    };
  }
}

export async function completeFirstLogin(payload: FirstLoginPayload): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/complete-first-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      throw new Error(data.message);
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : undefined
    };
  }
}
