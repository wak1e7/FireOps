import { jsonResponse } from "@/lib/server-security";
import {
  createSessionContext,
  sessionCookieOptions,
  validateSessionPolicy
} from "@/lib/session-policy";
import { sessionContextCookie, sessionStartedCookie } from "@/lib/session-policy-shared";
import { createClient } from "@/utils/supabase/server";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return jsonResponse({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const status = await validateSessionPolicy(request, user.id);
  return jsonResponse(status, { status: status.ok ? 200 : 401 });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonResponse({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const response = jsonResponse({ ok: true });
  const options = sessionCookieOptions();
  response.cookies.set(sessionStartedCookie, String(Date.now()), options);
  response.cookies.set(sessionContextCookie, await createSessionContext(request, user.id), options);
  return response;
}

export async function DELETE() {
  const response = jsonResponse({ ok: true });
  response.cookies.set(sessionStartedCookie, "", { path: "/", maxAge: 0 });
  response.cookies.set(sessionContextCookie, "", { path: "/", maxAge: 0 });
  return response;
}
