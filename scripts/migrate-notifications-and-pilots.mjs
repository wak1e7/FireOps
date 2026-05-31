import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = await readFile(resolve(".env.local"), "utf8");
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!supabaseUrl || !serviceRoleKey || !accessToken) throw new Error("Missing Supabase environment variables.");

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const sql = await readFile(resolve("supabase/migrations/20260530_notifications_and_pilot_duty.sql"), "utf8");
const sqlResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql })
});
if (!sqlResponse.ok) throw new Error(await sqlResponse.text());

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const companyId = "00000000-0000-0000-0000-000000000101";
const pilots = [
  { code: "PILOTO01", fullName: "CARDENAS, Marcelino" },
  { code: "PILOTO02", fullName: "CASTAÑEDA, Raul" }
];
const { data: pilotRole } = await admin.from("roles").select("id").eq("name", "piloto").single();

for (const pilot of pilots) {
  const email = `${pilot.code}@fireops.local`;
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = users.users.find((item) => item.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { firefighter_code: pilot.code, full_name: pilot.fullName }
    });
    if (error) throw error;
    user = data.user;
  }
  await admin.from("profiles").upsert({
    id: user.id,
    company_id: companyId,
    firefighter_code: pilot.code,
    auth_email: email,
    full_name: pilot.fullName,
    service_status: "fuera_de_servicio",
    service_mode: null,
    service_started_at: null,
    pilot_type: "rentado",
    is_active: true,
    must_change_password: false,
    can_login: false
  });
  if (pilotRole) await admin.from("user_roles").upsert({ user_id: user.id, role_id: pilotRole.id });
}

console.log("Notification and pilot-duty migration completed.");
