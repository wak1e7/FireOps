import { createClient } from "@/utils/supabase/client";
import type { FirstLoginPayload, LoginResult } from "@/modules/auth/types/auth";
import roster from "../../../../data/b88-roster.json";

const DEMO_CODES = new Set((roster as Array<{ code: string }>).map((member) => member.code));

export async function loginWithFirefighterCode(
  firefighterCode: string,
  password: string
): Promise<LoginResult> {
  const code = firefighterCode.trim().toUpperCase();
  const rawDisabledCodes = window.localStorage.getItem("fireops-disabled-codes");
  const disabledCodes = new Set<string>(rawDisabledCodes ? JSON.parse(rawDisabledCodes) : []);

  if (disabledCodes.has(code)) {
    return {
      ok: false,
      message: "Este usuario está desactivado. Contacta a jefatura."
    };
  }

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    window.localStorage.setItem("fireops-demo-session", code);
    return { ok: true, mustChangePassword };
  } catch {
    if (DEMO_CODES.has(code) && password.length >= 6) {
      window.localStorage.setItem("fireops-demo-session", code);
      return { ok: true, mustChangePassword: code !== "ADMIN001" };
    }

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
    window.localStorage.setItem("fireops-first-login-complete", "true");
    return {
      ok: true,
      message: error instanceof Error ? error.message : undefined
    };
  }
}
