import { createSign } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FirebaseServiceAccount;
  } catch {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as FirebaseServiceAccount;
  }
}

async function accessToken(account: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const unsignedToken = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const assertion = `${unsignedToken}.${signer.sign(account.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  if (!response.ok) throw new Error(`Firebase OAuth failed (${response.status}).`);
  return ((await response.json()) as { access_token: string }).access_token;
}

export async function sendPushToProfiles(profileIds: string[], title: string, body: string, url: string) {
  const account = serviceAccount();
  if (!account || !profileIds.length) return;

  const admin = createAdminClient();
  const { data: tokenRows } = await admin.from("fcm_tokens").select("token").in("user_id", profileIds);
  const tokens = [...new Set((tokenRows ?? []).map((row) => row.token).filter(Boolean))];
  if (!tokens.length) return;

  const token = await accessToken(account);
  await Promise.allSettled(
    tokens.map(async (deviceToken) => {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title, body },
            data: { url },
            webpush: { fcm_options: { link: url } }
          }
        })
      });

      if (response.status === 404 || response.status === 410) {
        await admin.from("fcm_tokens").delete().eq("token", deviceToken);
      }
      if (!response.ok) throw new Error(`Firebase send failed (${response.status}).`);
    })
  );
}
