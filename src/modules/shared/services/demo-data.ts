import roster from "../../../../data/b88-roster.json";
import type {
  EmergencyAlert,
  FireNotification,
  OperationalEvent,
  PilotType,
  Profile,
  RankName,
  RoleName,
  Vehicle
} from "@/modules/shared/types/domain";

type RosterMember = {
  code: string;
  fullName: string;
  rank: RankName;
  role: RoleName;
  position?: "Primer Jefe" | "Segundo Jefe" | "Encargado de área";
  phone?: string;
  pilotType?: PilotType;
};

const b88Roster = roster as RosterMember[];

export const demoProfiles: Profile[] = b88Roster.map((member, index) => ({
  id: `b88-${member.code}`,
  firefighterCode: member.code,
  fullName: member.fullName,
  phone: member.phone ? `+51${member.phone}` : null,
  email: null,
  rank: member.rank,
  role: member.role,
  specialPosition: member.position,
  serviceStatus: index < 3 ? "en_servicio" : "fuera_de_servicio",
  serviceMode: index < 3 ? "bombero" : null,
  serviceStartedAt:
    index < 3 ? new Date(Date.now() - 1000 * 60 * (18 + index * 11)).toISOString() : null,
  pilotType: member.pilotType,
  canVolunteerAsPilot: Boolean(member.pilotType),
  isActive: true,
  mustChangePassword: true
}));

export const demoVehicles: Vehicle[] = [
  {
    id: "b88-v-1",
    code: "M-88",
    name: "Máquina 88",
    type: "Autobomba",
    plate: "B-88",
    status: "operativo",
    isActive: true,
    observations: "Unidad operativa de Salvadora Lambayeque 88.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString()
  },
  {
    id: "b88-v-2",
    code: "R-88",
    name: "Rescate 88",
    type: "Rescate",
    plate: "B-88-R",
    status: "operativo",
    isActive: true,
    observations: "Equipo de rescate disponible.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    id: "b88-v-3",
    code: "AMB-88",
    name: "Ambulancia 88",
    type: "Ambulancia",
    plate: "B-88-A",
    status: "mantenimiento",
    isActive: true,
    observations: "Revisión preventiva pendiente.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString()
  }
];

export const demoEvents: OperationalEvent[] = [
  {
    id: "b88-e-1",
    title: "Compañía cargada",
    detail: "Se cargó la nómina de Salvadora Lambayeque 88 con 31 bomberos únicos.",
    actor: "Sistema",
    createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    severity: "success"
  }
];

export const demoNotifications: FireNotification[] = [
  {
    id: "b88-n-1",
    title: "Nómina B-88 cargada",
    body: "Primer Jefe: Maty Ordoñez. Segundo Jefe: Kevin Rios.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    audience: "all"
  }
];

export const demoEmergencyAlerts: EmergencyAlert[] = [];
