import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

try {
  const env = await readFile(resolve(".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function countRows(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

const tables = [
  "profiles",
  "vehicles",
  "operational_events",
  "service_sessions",
  "emergency_alerts",
  "emergency_alert_recipients",
  "emergency_alert_responses",
  "notifications",
  "fcm_tokens",
  "web_push_subscriptions"
];

const counts = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await countRows(table)])));

const { data: roleRows, error: roleError } = await supabase
  .from("profiles")
  .select("firefighter_code, full_name, service_status, roles:user_roles(roles(name))")
  .in("firefighter_code", ["ADMIN01", "A06692", "A22007"])
  .order("firefighter_code");

if (roleError) throw roleError;

const { data: serviceStates, error: serviceStateError } = await supabase
  .from("profiles")
  .select("service_status");
if (serviceStateError) throw serviceStateError;

const serviceStatusSummary = serviceStates.reduce((summary, profile) => {
  summary[profile.service_status] = (summary[profile.service_status] ?? 0) + 1;
  return summary;
}, {});

console.log(
  JSON.stringify(
    {
      counts,
      serviceStatusSummary,
      keyUsers: roleRows
    },
    null,
    2
  )
);
