import { isAllowedOrigin, jsonResponse } from "@/lib/server-security";
import {
  createSessionContext,
  sessionCookieOptions,
  validateSessionPolicy
} from "@/lib/session-policy";
import { sessionContextCookie, sessionStartedCookie } from "@/lib/session-policy-shared";
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

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return jsonResponse({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const status = await validateSessionPolicy(request, user.id);
  return jsonResponse(status, { status: status.ok ? 200 : 401 });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }

  const user = await currentUser(request);
  if (!user) return jsonResponse({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const response = jsonResponse({ ok: true });
  const options = sessionCookieOptions();
  response.cookies.set(sessionStartedCookie, String(Date.now()), options);
  response.cookies.set(sessionContextCookie, await createSessionContext(request, user.id), options);
  return response;
}

export async function DELETE(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }

  const response = jsonResponse({ ok: true });
  response.cookies.set(sessionStartedCookie, "", { path: "/", maxAge: 0 });
  response.cookies.set(sessionContextCookie, "", { path: "/", maxAge: 0 });
  return response;
}
