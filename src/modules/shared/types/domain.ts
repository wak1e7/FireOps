export type RoleName = "admin" | "bombero" | "piloto" | "primer_jefe" | "segundo_jefe";

export type RankName =
  | "Sin rango"
  | "Seccionario"
  | "Subteniente"
  | "Teniente"
  | "Capitán"
  | "Teniente Brigadier"
  | "Brigadier"
  | "Brigadier Mayor"
  | "Brigadier General"
  | "Comandante General";

export type VehicleStatus =
  | "operativo"
  | "fuera_de_servicio"
  | "mantenimiento"
  | "emergencia_activa";

export type ServiceStatus = "en_servicio" | "en_alerta" | "fuera_de_servicio";
export type PilotType = "voluntario" | "rentado";
export type ServiceMode = "bombero" | "piloto_voluntario" | "piloto_rentado";
export type EmergencyType =
  | "incendio"
  | "accidente_vehicular"
  | "rescate"
  | "emergencia_medica"
  | "materiales_peligrosos"
  | "apoyo_operativo";
export type EmergencyAlertStatus = "active" | "cancelled" | "expired";
export type EmergencyResponseStatus = "confirmed" | "on_way" | "unavailable";

export interface Profile {
  id: string;
  firefighterCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  rank: RankName;
  role: RoleName;
  specialPosition?: "Primer Jefe" | "Segundo Jefe" | "Encargado de área";
  serviceStatus: ServiceStatus;
  serviceMode?: ServiceMode | null;
  serviceStartedAt?: string | null;
  pilotType?: PilotType;
  canVolunteerAsPilot?: boolean;
  canLogin?: boolean;
  temporaryPassword?: string;
  isActive?: boolean;
  mustChangePassword: boolean;
}

export interface Vehicle {
  id: string;
  code: string;
  name: string;
  type: string;
  plate: string;
  status: VehicleStatus;
  isActive?: boolean;
  observations: string;
  updatedAt: string;
}

export interface OperationalEvent {
  id: string;
  title: string;
  detail: string;
  actor: string;
  createdAt: string;
  severity: "info" | "success" | "warning" | "danger";
  metadata?: {
    profileId?: string;
    profileName?: string;
    vehicleId?: string;
    vehicleName?: string;
    previousStatus?: VehicleStatus;
    nextStatus?: VehicleStatus;
    movementType?:
      | "service_entry"
      | "service_exit"
      | "vehicle_status_change"
      | "profile_created"
      | "vehicle_created"
      | "profile_status_change"
      | "vehicle_status_toggle"
      | "emergency_alert_created"
      | "emergency_alert_cancelled"
      | "emergency_alert_expired"
      | "emergency_alert_response";
    emergencyAlertId?: string;
  };
}

export interface FireNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  audience?: "all" | "chiefs" | "crew";
  recipientIds?: string[];
}

export interface EmergencyAlertResponse {
  profileId: string;
  status: EmergencyResponseStatus;
  respondedAt: string;
}

export interface EmergencyAlertRecipient {
  profileId: string;
  serviceStatus: Extract<ServiceStatus, "en_servicio" | "en_alerta">;
  notifiedAt: string;
}

export interface EmergencyAlert {
  id: string;
  type: EmergencyType;
  description?: string;
  location?: string;
  issuedById: string;
  issuedByName: string;
  createdAt: string;
  expiresAt: string;
  status: EmergencyAlertStatus;
  cancelledAt?: string;
  cancelledById?: string;
  recipients: EmergencyAlertRecipient[];
  responses: EmergencyAlertResponse[];
}
