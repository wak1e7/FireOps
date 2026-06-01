import { createSign } from "node:crypto";
import webpush from "web-push";
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
  if (!account) {
    console.warn("[FireOps] Push skipped: FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
    return;
  }
  if (!profileIds.length) return;

  const admin = createAdminClient();
  const { data: tokenRows } = await admin.from("fcm_tokens").select("token").in("user_id", profileIds);
  const tokens = [...new Set((tokenRows ?? []).map((row) => row.token).filter(Boolean))];
  if (!tokens.length) return;

  const token = await accessToken(account);
  const results = await Promise.allSettled(
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

      const responseBody = response.ok ? "" : await response.text();
      if (response.status === 404 || response.status === 410 || responseBody.includes("UNREGISTERED")) {
        await admin.from("fcm_tokens").delete().eq("token", deviceToken);
      }
      if (!response.ok) throw new Error(`Firebase send failed (${response.status}).`);
    })
  );
  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed) console.warn(`[FireOps] Push delivery failed for ${failed} device(s).`);
}

export async function sendWebPushToProfiles(profileIds: string[], title: string, body: string, url: string) {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:admin@fireops.app";
  if (!publicKey || !privateKey || !profileIds.length) {
    if (!publicKey || !privateKey) console.warn("[FireOps] Web Push skipped: VAPID keys are not configured.");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("web_push_subscriptions")
    .select("endpoint,p256dh,auth")
    .in("user_id", profileIds);
  const results = await Promise.allSettled(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          JSON.stringify({ source: "fireops-web-push", title, body, url })
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("web_push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        }
        throw error;
      }
    })
  );
  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed) console.warn(`[FireOps] Web Push delivery failed for ${failed} device(s).`);
}
