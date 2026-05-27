import { SESSION_MAX_AGE_MS, sessionContextCookie, sessionStartedCookie } from "@/lib/session-policy-shared";

export type SessionPolicyStatus =
  | { ok: true }
  | { ok: false; reason: "expired" | "suspicious_context" | "missing_context" };

const legacyContextMigrationEndsAt = Date.UTC(2026, 4, 30, 0, 0, 0);

function getUserAgent(request: Request) {
  return request.headers.get("user-agent") ?? "unknown";
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionContext(request: Request, userId: string, startedAt: number) {
  const secret = process.env.SESSION_FINGERPRINT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fireops-dev";
  return sha256Hex(`${secret}:${userId}:${startedAt}:${getUserAgent(request)}`);
}

export async function validateSessionPolicy(request: Request, userId: string): Promise<SessionPolicyStatus> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return separator === -1
          ? [part, ""]
          : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
  const startedAt = Number(cookies.get(sessionStartedCookie));
  const storedContext = cookies.get(sessionContextCookie);

  if (!startedAt || !storedContext) return { ok: false, reason: "missing_context" };
  if (Date.now() - startedAt > SESSION_MAX_AGE_MS) return { ok: false, reason: "expired" };

  const currentContext = await createSessionContext(request, userId, startedAt);
  if (currentContext !== storedContext && Date.now() >= legacyContextMigrationEndsAt) {
    return { ok: false, reason: "suspicious_context" };
  }

  return { ok: true };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000
  };
}
