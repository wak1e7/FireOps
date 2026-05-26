import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(".env.local");
try {
  const env = await readFile(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !serviceRoleKey || !accessToken) {
  throw new Error("Missing Supabase environment variables.");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const sql = await readFile(resolve("supabase/fireops-reset.sql"), "utf8");
const roster = JSON.parse(await readFile(resolve("data/b88-roster.json"), "utf8"));

async function runSql(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase SQL API failed (${response.status}): ${text}`);
  }
}

async function ensureUser(admin, user) {
  let createError;
  try {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: user.authEmail,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        firefighter_code: user.code,
        full_name: user.fullName
      }
    });

    if (!error && created.user) return created.user.id;
    createError = error;
  } catch (error) {
    createError = error;
  }

  const users = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) throw listError;
    users.push(...list.users);
    if (list.users.length < 1000) break;
  }
  const existing = users.find((item) => item.email?.toLowerCase() === user.authEmail.toLowerCase());
  if (!existing) throw createError;

  await admin.auth.admin.updateUserById(existing.id, {
    password: user.password,
    email_confirm: true,
    user_metadata: {
      firefighter_code: user.code,
      full_name: user.fullName
    }
  });
  return existing.id;
}

function rolesFor(member) {
  if (member.code === "A06692") return ["primer_jefe"];
  if (member.code === "A22007") return ["segundo_jefe"];
  return [member.role ?? "bombero"];
}

const systemAdmin = {
  code: "ADMIN01",
  fullName: "Administrador FireOps",
  authEmail: "admin@fireops.local",
  password: "Temporal123!"
};

console.log("Resetting FireOps schema...");
await runSql(sql);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const allowedEmails = new Set([
  ...roster.map((member) => `${member.code}@fireops.local`.toLowerCase()),
  systemAdmin.authEmail.toLowerCase()
]);

for (let page = 1; page <= 10; page += 1) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (listError) throw listError;
  for (const user of list.users) {
    if (user.email && !allowedEmails.has(user.email.toLowerCase())) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
    }
  }
  if (list.users.length < 1000) break;
}

const { data: ranks } = await admin.from("ranks").select("id,name");
const { data: roles } = await admin.from("roles").select("id,name");
const { data: positions } = await admin.from("special_positions").select("id,name");
const companyId = "00000000-0000-0000-0000-000000000101";

for (const member of roster) {
  const user = {
    ...member,
    authEmail: `${member.code}@fireops.local`,
    password: "Temporal123!"
  };
  const id = await ensureUser(admin, user);
  const rank = ranks?.find((item) => item.name === member.rank);
  const position = positions?.find((item) => item.name === member.position);
  const phone = member.phone ? `+51${member.phone}` : null;

  const { error: profileError } = await admin.from("profiles").upsert({
    id,
    company_id: companyId,
    firefighter_code: member.code,
    auth_email: user.authEmail,
    email: null,
    full_name: member.fullName,
    phone,
    rank_id: rank?.id,
    special_position_id: position?.id ?? null,
    service_status: "fuera_de_servicio",
    pilot_type: member.pilotType ?? null,
    must_change_password: true
  });
  if (profileError) throw profileError;

  for (const roleName of rolesFor(member)) {
    const role = roles?.find((item) => item.name === roleName);
    if (!role) continue;
    const { error: roleError } = await admin.from("user_roles").upsert({
      user_id: id,
      role_id: role.id
    });
    if (roleError) throw roleError;
  }
}

const adminUserId = await ensureUser(admin, systemAdmin);
const { error: adminProfileError } = await admin.from("profiles").upsert({
  id: adminUserId,
  company_id: companyId,
  firefighter_code: systemAdmin.code,
  auth_email: systemAdmin.authEmail,
  email: null,
  full_name: systemAdmin.fullName,
  phone: null,
  rank_id: null,
  special_position_id: null,
  service_status: "fuera_de_servicio",
  pilot_type: null,
  must_change_password: true
});
if (adminProfileError) throw adminProfileError;

const adminRole = roles?.find((item) => item.name === "admin");
if (adminRole) {
  const { error: adminRoleError } = await admin.from("user_roles").upsert({
    user_id: adminUserId,
    role_id: adminRole.id
  });
  if (adminRoleError) throw adminRoleError;
}

const { data: firstChief } = await admin.from("profiles").select("id").eq("firefighter_code", "A06692").single();

const vehicles = [
  ["M-88", "Maquina 88", "Autobomba", "B-88", "operativo", "Unidad operativa de Salvadora Lambayeque 88."],
  ["R-88", "Rescate 88", "Rescate", "B-88-R", "operativo", "Equipo de rescate disponible."],
  ["AMB-88", "Ambulancia 88", "Ambulancia", "B-88-A", "mantenimiento", "Revision preventiva pendiente."]
].map(([code, name, type, plate, status, observations]) => ({
  company_id: companyId,
  code,
  name,
  type,
  plate,
  status,
  observations,
  updated_by: firstChief?.id
}));

const { error: vehicleError } = await admin.from("vehicles").insert(vehicles);
if (vehicleError) throw vehicleError;

console.log("FireOps Supabase reset completed for Salvadora Lambayeque 88.");
console.log("Bombero login: A06692 / Temporal123!");
console.log("Admin login: ADMIN01 / Temporal123!");
