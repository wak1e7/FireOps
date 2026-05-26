import type { EmergencyResponseStatus, EmergencyType, VehicleStatus } from "@/modules/shared/types/domain";

export const vehicleStatusLabel: Record<VehicleStatus, string> = {
  operativo: "Operativo",
  fuera_de_servicio: "Fuera de servicio",
  mantenimiento: "En mantenimiento",
  emergencia_activa: "Emergencia activa"
};

export const vehicleStatusClass: Record<VehicleStatus, string> = {
  operativo: "border-emerald-500 bg-emerald-950 text-emerald-100",
  emergencia_activa: "border-sky-500 bg-sky-950 text-sky-100",
  mantenimiento: "border-amber-500 bg-amber-950 text-amber-100",
  fuera_de_servicio: "border-red-500 bg-red-950 text-red-100"
};

export const emergencyTypeLabel: Record<EmergencyType, string> = {
  incendio: "Incendio",
  accidente_vehicular: "Accidente vehicular",
  rescate: "Rescate",
  emergencia_medica: "Emergencia médica",
  materiales_peligrosos: "Materiales peligrosos",
  apoyo_operativo: "Apoyo operativo"
};

export const emergencyResponseLabel: Record<EmergencyResponseStatus, string> = {
  confirmed: "Confirmó asistencia",
  on_way: "Está en camino",
  unavailable: "No puede asistir"
};
