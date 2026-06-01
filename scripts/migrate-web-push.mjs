import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const env = await readFile(resolve(".env.local"), "utf8");
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!supabaseUrl || !accessToken) throw new Error("Missing Supabase environment variables.");

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const sql = await readFile(resolve("supabase/migrations/20260601_web_push_subscriptions.sql"), "utf8");
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql })
});
if (!response.ok) throw new Error(await response.text());

console.log("Web Push migration completed.");
