import type {
  EmergencyAlert,
  EmergencyResponseStatus,
  EmergencyType,
  FireNotification,
  OperationalEvent,
  PilotType,
  Profile,
  RankName,
  RoleName,
  ServiceMode,
  ServiceStatus,
  Vehicle,
  VehicleStatus
} from "@/modules/shared/types/domain";
import { isAllowedOrigin, jsonResponse, readJsonObject } from "@/lib/server-security";
import { createSessionContext, sessionCookieOptions, validateSessionPolicy } from "@/lib/session-policy";
import { sessionContextCookie, sessionStartedCookie } from "@/lib/session-policy-shared";
import { emergencyResponseLabel, emergencyTypeLabel, vehicleStatusLabel } from "@/modules/shared/utils/labels";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const companyId = "00000000-0000-0000-0000-000000000101";
const DEFAULT_TEMPORARY_PASSWORD = "Temporal123!";
const allowCodeAuthFallback = process.env.FIREOPS_ALLOW_CODE_AUTH === "true" && process.env.NODE_ENV !== "production";

type ActionPayload =
  | { action: "addProfile"; profile: Profile }
  | { action: "updateProfile"; profile: Profile }
  | { action: "toggleProfileActive"; profileId: string }
  | { action: "addVehicle"; vehicle: Vehicle }
  | { action: "updateVehicle"; vehicle: Vehicle }
  | { action: "toggleVehicleActive"; vehicleId: string }
  | { action: "toggleService"; profileId: string; serviceMode?: ServiceMode; targetStatus?: ServiceStatus }
  | { action: "updateVehicleStatus"; vehicleId: string; status: VehicleStatus }
  | { action: "emitEmergencyAlert"; type: EmergencyType; description?: string; location?: string; issuerId: string }
  | { action: "respondToEmergencyAlert"; alertId: string; profileId: string; status: EmergencyResponseStatus }
  | { action: "cancelEmergencyAlert"; alertId: string; cancelledById: string }
  | { action: "expireEmergencyAlerts" }
  | { action: "addNotification"; notification: FireNotification }
  | { action: "markNotificationsRead"; ids?: string[] };

type RoleRow = { roles?: { name?: RoleName } | null };
type ProfileRow = {
  id: string;
  firefighter_code: string;
  auth_email: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  service_status: ServiceStatus;
  service_mode: ServiceMode | null;
  service_started_at: string | null;
  pilot_type: PilotType | null;
  is_active: boolean;
  must_change_password: boolean;
  ranks?: { name?: RankName } | null;
  special_positions?: { name?: Profile["specialPosition"] } | null;
  user_roles?: RoleRow[];
};

function roleFromRows(rows?: RoleRow[]): RoleName {
  const names = rows?.map((row) => row.roles?.name).filter(Boolean) ?? [];
  if (names.includes("admin")) return "admin";
  if (names.includes("primer_jefe")) return "primer_jefe";
  if (names.includes("segundo_jefe")) return "segundo_jefe";
  if (names.includes("piloto")) return "piloto";
  return "bombero";
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    firefighterCode: row.firefighter_code,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    rank: row.ranks?.name ?? "Sin rango",
    role: roleFromRows(row.user_roles),
    specialPosition: row.special_positions?.name,
    serviceStatus: row.service_status,
    serviceMode: row.service_mode,
    serviceStartedAt: row.service_started_at,
    pilotType: row.pilot_type ?? undefined,
    canVolunteerAsPilot: Boolean(row.pilot_type),
    isActive: row.is_active,
    mustChangePassword: row.must_change_password
  };
}

function pilotTypeForProfile(profile: Profile): PilotType | null {
  if (profile.role === "piloto") return profile.pilotType ?? "voluntario";
  return profile.canVolunteerAsPilot ? "voluntario" : null;
}

function mapVehicle(row: {
  id: string;
  code: string;
  name: string;
  type: string;
  plate: string;
  status: VehicleStatus;
  is_active: boolean;
  observations: string;
  updated_at: string;
}): Vehicle {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    plate: row.plate,
    status: row.status,
    isActive: row.is_active,
    observations: row.observations,
    updatedAt: row.updated_at
  };
}

function notificationAudience(row: { recipient_id: string | null }): FireNotification["audience"] {
  if (row.recipient_id) return undefined;
  return "all";
}

async function currentUserProfile(request: Request) {
  const server = await createClient();
  const {
    data: { user }
  } = await server.auth.getUser();

  const admin = createAdminClient();
  const fallbackCode = allowCodeAuthFallback ? request.headers.get("x-fireops-code")?.trim().toUpperCase() : undefined;
  const query = admin.from("profiles").select("id, firefighter_code, user_roles(roles(name))");
  const { data } = user
    ? await query.eq("id", user.id).single()
    : fallbackCode
      ? await query.eq("firefighter_code", fallbackCode).single()
      : { data: null };
  if (!data) return null;
  return { id: data.id as string, code: data.firefighter_code as string, role: roleFromRows(data.user_roles as RoleRow[]) };
}

function isChiefOrAdmin(role?: RoleName) {
  return role === "admin" || role === "primer_jefe" || role === "segundo_jefe";
}

async function attachFreshSessionPolicy(request: Request, response: ReturnType<typeof jsonResponse>, userId: string) {
  const startedAt = Date.now();
  const options = sessionCookieOptions();
  response.cookies.set(sessionStartedCookie, String(startedAt), options);
  response.cookies.set(sessionContextCookie, await createSessionContext(request, userId, startedAt), options);
  return response;
}

async function validateOrRefreshPolicy(request: Request, response: ReturnType<typeof jsonResponse>, userId: string) {
  const policy = await validateSessionPolicy(request, userId);
  if (policy.ok) return response;
  if (policy.reason === "expired") return null;
  return attachFreshSessionPolicy(request, response, userId);
}

async function getCatalogs(admin: ReturnType<typeof createAdminClient>) {
  const [{ data: ranks }, { data: roles }, { data: positions }] = await Promise.all([
    admin.from("ranks").select("id,name"),
    admin.from("roles").select("id,name"),
    admin.from("special_positions").select("id,name")
  ]);
  return { ranks: ranks ?? [], roles: roles ?? [], positions: positions ?? [] };
}

async function insertEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: Omit<OperationalEvent, "id" | "createdAt" | "actor"> & { actorId?: string | null }
) {
  await admin.from("operational_events").insert({
    company_id: companyId,
    title: event.title,
    detail: event.detail,
    severity: event.severity,
    actor_id: event.actorId ?? null
  });
}

async function insertNotification(
  admin: ReturnType<typeof createAdminClient>,
  notification: Pick<FireNotification, "title" | "body"> & { recipientIds?: string[] }
) {
  const rows: Array<{ company_id: string; recipient_id: string | null; title: string; body: string }> = notification.recipientIds?.length
    ? notification.recipientIds.map((recipientId) => ({
        company_id: companyId,
        recipient_id: recipientId,
        title: notification.title,
        body: notification.body
      }))
    : [{ company_id: companyId, recipient_id: null, title: notification.title, body: notification.body }];
  await admin.from("notifications").insert(rows);
}

async function loadOperations() {
  const admin = createAdminClient();
  const [
    { data: profileRows, error: profilesError },
    { data: vehicleRows, error: vehiclesError },
    { data: eventRows, error: eventsError },
    { data: notificationRows, error: notificationsError },
    { data: alertRows, error: alertsError },
    { data: recipientRows, error: recipientsError },
    { data: responseRows, error: responsesError }
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id,firefighter_code,auth_email,email,full_name,phone,service_status,service_mode,service_started_at,pilot_type,is_active,must_change_password,ranks(name),special_positions(name),user_roles(roles(name))")
      .order("full_name"),
    admin.from("vehicles").select("id,code,name,type,plate,status,is_active,observations,updated_at").order("code"),
    admin.from("operational_events").select("id,title,detail,severity,actor_id,created_at").order("created_at", { ascending: false }),
    admin.from("notifications").select("id,title,body,read_at,recipient_id,created_at").order("created_at", { ascending: false }),
    admin.from("emergency_alerts").select("id,type,description,location,issued_by,status,created_at,expires_at,cancelled_at,cancelled_by").order("created_at", { ascending: false }),
    admin.from("emergency_alert_recipients").select("alert_id,profile_id,service_status,notified_at"),
    admin.from("emergency_alert_responses").select("alert_id,profile_id,status,responded_at")
  ]);

  const firstError = profilesError ?? vehiclesError ?? eventsError ?? notificationsError ?? alertsError ?? recipientsError ?? responsesError;
  if (firstError) throw firstError;

  const profiles = (profileRows as ProfileRow[]).map(mapProfile);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const vehicles = (vehicleRows ?? []).map(mapVehicle);
  const events: OperationalEvent[] = (eventRows ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    detail: event.detail,
    actor: profileById.get(event.actor_id ?? "")?.fullName ?? "Sistema",
    createdAt: event.created_at,
    severity: event.severity
  }));
  const notifications: FireNotification[] = (notificationRows ?? []).map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    read: Boolean(notification.read_at),
    createdAt: notification.created_at,
    audience: notificationAudience(notification),
    recipientIds: notification.recipient_id ? [notification.recipient_id] : undefined
  }));
  const recipientsByAlert = new Map<string, EmergencyAlert["recipients"]>();
  for (const recipient of recipientRows ?? []) {
    const list = recipientsByAlert.get(recipient.alert_id) ?? [];
    list.push({
      profileId: recipient.profile_id,
      serviceStatus: recipient.service_status as "en_servicio" | "en_alerta",
      notifiedAt: recipient.notified_at
    });
    recipientsByAlert.set(recipient.alert_id, list);
  }
  const responsesByAlert = new Map<string, EmergencyAlert["responses"]>();
  for (const response of responseRows ?? []) {
    const list = responsesByAlert.get(response.alert_id) ?? [];
    list.push({
      profileId: response.profile_id,
      status: response.status,
      respondedAt: response.responded_at
    });
    responsesByAlert.set(response.alert_id, list);
  }
  const emergencyAlerts: EmergencyAlert[] = (alertRows ?? []).map((alert) => ({
    id: alert.id,
    type: alert.type,
    description: alert.description ?? undefined,
    location: alert.location ?? undefined,
    issuedById: alert.issued_by,
    issuedByName: profileById.get(alert.issued_by)?.fullName ?? "Jefatura",
    createdAt: alert.created_at,
    expiresAt: alert.expires_at,
    status: alert.status,
    cancelledAt: alert.cancelled_at ?? undefined,
    cancelledById: alert.cancelled_by ?? undefined,
    recipients: recipientsByAlert.get(alert.id) ?? [],
    responses: responsesByAlert.get(alert.id) ?? []
  }));

  return { profiles, vehicles, events, notifications, emergencyAlerts };
}

async function ensureAuthUser(admin: ReturnType<typeof createAdminClient>, profile: Profile) {
  const authEmail = `${profile.firefighterCode.trim().toUpperCase()}@fireops.local`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password: DEFAULT_TEMPORARY_PASSWORD,
    email_confirm: true,
    user_metadata: {
      firefighter_code: profile.firefighterCode,
      full_name: profile.fullName
    }
  });
  if (!error && created.user) return { id: created.user.id, authEmail };

  for (let page = 1; page <= 10; page += 1) {
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (usersError) throw usersError;
    const existing = users.users.find((user) => user.email?.toLowerCase() === authEmail.toLowerCase());
    if (existing) return { id: existing.id, authEmail };
    if (users.users.length < 1000) break;
  }
  throw error;
}

async function setUserRoles(admin: ReturnType<typeof createAdminClient>, userId: string, roleName: RoleName) {
  const { roles } = await getCatalogs(admin);
  const role = roles.find((item) => item.name === roleName);
  if (!role) return;
  await admin.from("user_roles").delete().eq("user_id", userId);
  await admin.from("user_roles").insert({ user_id: userId, role_id: role.id });
}

async function handleAction(payload: ActionPayload, user: NonNullable<Awaited<ReturnType<typeof currentUserProfile>>>) {
  const admin = createAdminClient();

  if (payload.action === "addProfile") {
    if (!isChiefOrAdmin(user.role)) return;
    const { ranks, positions } = await getCatalogs(admin);
    const { id, authEmail } = await ensureAuthUser(admin, payload.profile);
    const rank = ranks.find((item) => item.name === payload.profile.rank);
    const position = positions.find((item) => item.name === payload.profile.specialPosition);
    await admin.from("profiles").upsert({
      id,
      company_id: companyId,
      firefighter_code: payload.profile.firefighterCode,
      auth_email: authEmail,
      email: payload.profile.email,
      full_name: payload.profile.fullName,
      phone: payload.profile.phone,
      rank_id: rank?.id ?? null,
      special_position_id: position?.id ?? null,
      service_status: "fuera_de_servicio",
      service_mode: null,
      service_started_at: null,
      pilot_type: pilotTypeForProfile(payload.profile),
      is_active: true,
      must_change_password: true
    });
    await setUserRoles(admin, id, payload.profile.role);
    await insertEvent(admin, {
      title: "Creacion de personal",
      detail: `${payload.profile.fullName} fue agregado a la nomina operativa.`,
      severity: "success",
      actorId: user.id
    });
  }

  if (payload.action === "updateProfile") {
    if (!isChiefOrAdmin(user.role) && payload.profile.id !== user.id) return;
    const { ranks, positions } = await getCatalogs(admin);
    const rank = ranks.find((item) => item.name === payload.profile.rank);
    const position = positions.find((item) => item.name === payload.profile.specialPosition);
    await admin
      .from("profiles")
      .update({
        firefighter_code: payload.profile.firefighterCode,
        email: payload.profile.email,
        full_name: payload.profile.fullName,
        phone: payload.profile.phone,
        rank_id: rank?.id ?? null,
        special_position_id: position?.id ?? null,
        pilot_type: pilotTypeForProfile(payload.profile),
        updated_at: new Date().toISOString()
      })
      .eq("id", payload.profile.id);
    if (isChiefOrAdmin(user.role)) await setUserRoles(admin, payload.profile.id, payload.profile.role);
  }

  if (payload.action === "toggleProfileActive") {
    if (!isChiefOrAdmin(user.role)) return;
    const { data: profile } = await admin.from("profiles").select("is_active,full_name").eq("id", payload.profileId).single();
    if (!profile) return;
    const nextActive = !profile.is_active;
    await admin
      .from("profiles")
      .update({
        is_active: nextActive,
        service_status: nextActive ? undefined : "fuera_de_servicio",
        service_mode: nextActive ? undefined : null,
        service_started_at: nextActive ? undefined : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", payload.profileId);
    await insertEvent(admin, {
      title: nextActive ? "Personal activado" : "Personal desactivado",
      detail: `${profile.full_name} fue ${nextActive ? "activado" : "desactivado"}.`,
      severity: nextActive ? "success" : "warning",
      actorId: user.id
    });
  }

  if (payload.action === "addVehicle") {
    if (!isChiefOrAdmin(user.role)) return;
    await admin.from("vehicles").insert({
      company_id: companyId,
      code: payload.vehicle.code,
      name: payload.vehicle.name,
      type: payload.vehicle.type,
      plate: payload.vehicle.plate,
      status: payload.vehicle.status,
      observations: payload.vehicle.observations,
      updated_by: user.id
    });
    await insertEvent(admin, {
      title: "Creacion de vehiculo",
      detail: `${payload.vehicle.name} fue agregado al parque automotor.`,
      severity: "success",
      actorId: user.id
    });
  }

  if (payload.action === "updateVehicle") {
    if (!isChiefOrAdmin(user.role)) return;
    await admin
      .from("vehicles")
      .update({
        code: payload.vehicle.code,
        name: payload.vehicle.name,
        type: payload.vehicle.type,
        plate: payload.vehicle.plate,
        status: payload.vehicle.status,
        observations: payload.vehicle.observations,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", payload.vehicle.id);
  }

  if (payload.action === "toggleVehicleActive") {
    if (!isChiefOrAdmin(user.role)) return;
    const { data: vehicle } = await admin.from("vehicles").select("is_active,name").eq("id", payload.vehicleId).single();
    if (!vehicle) return;
    const nextActive = !vehicle.is_active;
    await admin
      .from("vehicles")
      .update({ is_active: nextActive, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", payload.vehicleId);
    await insertEvent(admin, {
      title: nextActive ? "Vehiculo activado" : "Vehiculo desactivado",
      detail: `${vehicle.name} fue ${nextActive ? "activado" : "desactivado"}.`,
      severity: nextActive ? "success" : "warning",
      actorId: user.id
    });
  }

  if (payload.action === "toggleService") {
    if (payload.profileId !== user.id && !isChiefOrAdmin(user.role)) return;
    const { data: profile } = await admin.from("profiles").select("id,full_name,role:user_roles(roles(name)),service_status,is_active").eq("id", payload.profileId).single();
    if (!profile || profile.is_active === false) return;
    const currentStatus = profile.service_status as ServiceStatus;
    const requestedStatus = payload.targetStatus ?? "en_servicio";
    const nextStatus: ServiceStatus = currentStatus === requestedStatus ? "fuera_de_servicio" : requestedStatus;
    const nextMode =
      nextStatus === "fuera_de_servicio"
        ? null
        : payload.serviceMode ?? (roleFromRows(profile.role as RoleRow[]) === "piloto" ? "piloto_voluntario" : "bombero");
    const startedAt = nextStatus === "fuera_de_servicio" ? null : new Date().toISOString();
    await admin
      .from("profiles")
      .update({ service_status: nextStatus, service_mode: nextMode, service_started_at: startedAt, updated_at: new Date().toISOString() })
      .eq("id", payload.profileId);
    await insertEvent(admin, {
      title: nextStatus === "en_servicio" ? "Entrada de personal" : nextStatus === "en_alerta" ? "Personal en alerta" : "Salida de personal",
      detail:
        nextStatus === "en_servicio"
          ? `${profile.full_name} entro al servicio.`
          : nextStatus === "en_alerta"
            ? `${profile.full_name} quedo en alerta.`
            : `${profile.full_name} salio del servicio.`,
      severity: nextStatus === "fuera_de_servicio" ? "warning" : "success",
      actorId: payload.profileId
    });
    await insertNotification(admin, {
      title: nextStatus === "en_servicio" ? "Entrada de personal" : nextStatus === "en_alerta" ? "Personal en alerta" : "Salida de personal",
      body:
        nextStatus === "en_servicio"
          ? `${profile.full_name} entro al servicio.`
          : nextStatus === "en_alerta"
            ? `${profile.full_name} quedo en alerta.`
            : `${profile.full_name} salio del servicio.`
    });
  }

  if (payload.action === "updateVehicleStatus") {
    if (!isChiefOrAdmin(user.role)) return;
    const { data: vehicle } = await admin.from("vehicles").select("name,status").eq("id", payload.vehicleId).single();
    if (!vehicle || vehicle.status === payload.status) return;
    await admin.from("vehicles").update({ status: payload.status, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", payload.vehicleId);
    await admin.from("vehicle_status_events").insert({
      vehicle_id: payload.vehicleId,
      previous_status: vehicle.status,
      new_status: payload.status,
      changed_by: user.id
    });
    await insertEvent(admin, {
      title: "Cambio de estado de vehiculo",
      detail: `${vehicle.name} cambio de ${vehicleStatusLabel[vehicle.status as VehicleStatus]} a ${vehicleStatusLabel[payload.status]}.`,
      severity: payload.status === "fuera_de_servicio" ? "danger" : payload.status === "operativo" ? "success" : "warning",
      actorId: user.id
    });
  }

  if (payload.action === "emitEmergencyAlert") {
    if (!isChiefOrAdmin(user.role) || payload.issuerId !== user.id) return;
    const { data: issuer } = await admin.from("profiles").select("full_name").eq("id", payload.issuerId).single();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const { data: alert, error } = await admin
      .from("emergency_alerts")
      .insert({
        company_id: companyId,
        type: payload.type,
        description: payload.description?.trim() || null,
        location: payload.location?.trim() || null,
        issued_by: payload.issuerId,
        expires_at: expiresAt
      })
      .select("id")
      .single();
    if (error || !alert) throw error;
    const { data: recipients } = await admin
      .from("profiles")
      .select("id,service_status")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .in("service_status", ["en_servicio", "en_alerta"])
      .neq("id", payload.issuerId);
    const recipientRows = (recipients ?? []).map((recipient) => ({
      alert_id: alert.id,
      profile_id: recipient.id,
      service_status: recipient.service_status,
      notified_at: now.toISOString()
    }));
    if (recipientRows.length) await admin.from("emergency_alert_recipients").insert(recipientRows);
    const body = `${emergencyTypeLabel[payload.type]} reportado${payload.location?.trim() ? ` en ${payload.location.trim()}` : ""}. Se requiere personal disponible de la compania.`;
    await insertNotification(admin, { title: "Alerta de emergencia", body, recipientIds: recipientRows.map((row) => row.profile_id) });
    await insertEvent(admin, {
      title: "Alerta de emergencia",
      detail: `${emergencyTypeLabel[payload.type]} emitida por ${issuer?.full_name ?? "Jefatura"}. ${recipientRows.length} bomberos notificados.`,
      severity: "danger",
      actorId: payload.issuerId
    });
  }

  if (payload.action === "respondToEmergencyAlert") {
    if (payload.profileId !== user.id) return;
    const { data: recipient } = await admin
      .from("emergency_alert_recipients")
      .select("service_status")
      .eq("alert_id", payload.alertId)
      .eq("profile_id", payload.profileId)
      .single();
    if (!recipient) return;
    if (payload.status === "confirmed" && recipient.service_status !== "en_servicio") return;
    if (payload.status === "on_way" && recipient.service_status !== "en_alerta") return;
    await admin.from("emergency_alert_responses").upsert({
      alert_id: payload.alertId,
      profile_id: payload.profileId,
      status: payload.status,
      responded_at: new Date().toISOString()
    });
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", payload.profileId).single();
    await insertNotification(admin, {
      title: "Respuesta a alerta",
      body: `${profile?.full_name ?? "Bombero"}: ${emergencyResponseLabel[payload.status]}.`
    });
  }

  if (payload.action === "cancelEmergencyAlert") {
    if (!isChiefOrAdmin(user.role) || payload.cancelledById !== user.id) return;
    const { data: alert } = await admin.from("emergency_alerts").select("id,status").eq("id", payload.alertId).single();
    if (!alert || alert.status !== "active") return;
    await admin
      .from("emergency_alerts")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: payload.cancelledById })
      .eq("id", payload.alertId);
    const { data: recipients } = await admin.from("emergency_alert_recipients").select("profile_id").eq("alert_id", payload.alertId);
    await insertNotification(admin, {
      title: "Alerta cancelada",
      body: "La emergencia fue cancelada por jefatura.",
      recipientIds: (recipients ?? []).map((recipient) => recipient.profile_id)
    });
    await insertEvent(admin, {
      title: "Alerta cancelada",
      detail: "La emergencia fue cancelada por jefatura.",
      severity: "warning",
      actorId: payload.cancelledById
    });
  }

  if (payload.action === "expireEmergencyAlerts") {
    await admin
      .from("emergency_alerts")
      .update({ status: "expired" })
      .eq("status", "active")
      .lte("expires_at", new Date().toISOString());
  }

  if (payload.action === "addNotification") {
    await insertNotification(admin, payload.notification);
  }

  if (payload.action === "markNotificationsRead") {
    const query = admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id);
    if (payload.ids?.length) query.in("id", payload.ids);
    await query;
  }
}

export async function GET(request: Request) {
  const user = await currentUserProfile(request);
  if (!user) return jsonResponse({ message: "No autorizado." }, { status: 401 });
  const response = await validateOrRefreshPolicy(request, jsonResponse(await loadOperations()), user.id);
  if (!response) return jsonResponse({ message: "Sesión expirada." }, { status: 401 });
  return response;
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ message: "Origen no permitido." }, { status: 403 });
  }

  const user = await currentUserProfile(request);
  if (!user) return jsonResponse({ message: "No autorizado." }, { status: 401 });
  const policy = await validateSessionPolicy(request, user.id);
  if (!policy.ok && policy.reason === "expired") return jsonResponse({ message: "Sesión expirada." }, { status: 401 });
  const payload = (await readJsonObject(request)) as ActionPayload | null;
  if (!payload || typeof payload.action !== "string") {
    return jsonResponse({ message: "Solicitud inválida." }, { status: 400 });
  }
  await handleAction(payload, user);
  const response = jsonResponse(await loadOperations());
  return policy.ok ? response : attachFreshSessionPolicy(request, response, user.id);
}
