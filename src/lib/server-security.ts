import { NextResponse } from "next/server";

const jsonContentType = "application/json";

export function jsonResponse<T>(body: T, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const requestUrl = new URL(request.url);
  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.APP_ORIGIN;
  const localDevOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

  return (
    origin === requestOrigin ||
    Boolean(configuredOrigin && origin === configuredOrigin) ||
    (process.env.NODE_ENV === "development" && localDevOrigins.has(origin))
  );
}

export async function readJsonObject(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes(jsonContentType)) return null;

  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(request: Request, key: string, limit: number, windowMs: number) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "local";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}
