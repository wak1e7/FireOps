"use client";

import { create } from "zustand";
import type {
  EmergencyAlert,
  EmergencyResponseStatus,
  EmergencyType,
  FireNotification,
  OperationalEvent,
  Profile,
  ServiceMode,
  ServiceStatus,
  Vehicle,
  VehicleStatus
} from "@/modules/shared/types/domain";
import { demoEmergencyAlerts, demoEvents, demoNotifications, demoProfiles, demoVehicles } from "@/modules/shared/services/demo-data";
import { emergencyResponseLabel, emergencyTypeLabel, vehicleStatusLabel } from "@/modules/shared/utils/labels";
import { getCurrentProfile } from "@/modules/shared/utils/current-profile";

function getCurrentActor(profiles: Profile[]) {
  return getCurrentProfile(profiles)?.fullName ?? "Sistema";
}

function serviceNotification(profile: Profile): FireNotification {
  const isServiceEntry = profile.serviceStatus === "en_servicio";
  const isAlert = profile.serviceStatus === "en_alerta";
  return {
    id: crypto.randomUUID(),
    title: isServiceEntry ? "Entrada de personal" : isAlert ? "Personal en alerta" : "Salida de personal",
    body:
      profile.serviceStatus === "en_servicio"
        ? `${profile.fullName} entró al servicio.`
        : `${profile.fullName} salió del servicio.`,
    read: false,
    createdAt: new Date().toISOString(),
    audience: "chiefs"
  };
}

function emergencyAlertBody(type: EmergencyType, location?: string) {
  const place = location?.trim() ? ` en ${location.trim()}` : "";
  return `${emergencyTypeLabel[type]} reportado${place}. Se requiere personal disponible de la compañía.`;
}

function canReceiveEmergencyAlert(profile: Profile, issuerId: string) {
  return (
    profile.id !== issuerId &&
    profile.isActive !== false &&
    (profile.serviceStatus === "en_servicio" || profile.serviceStatus === "en_alerta")
  );
}

interface OperationsStore {
  profiles: Profile[];
  vehicles: Vehicle[];
  events: OperationalEvent[];
  notifications: FireNotification[];
  emergencyAlerts: EmergencyAlert[];
  addProfile: (profile: Profile) => void;
  updateProfile: (profile: Profile) => void;
  toggleProfileActive: (profileId: string) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  toggleVehicleActive: (vehicleId: string) => void;
  toggleService: (profileId: string, serviceMode?: ServiceMode, targetStatus?: ServiceStatus) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  emitEmergencyAlert: (payload: { type: EmergencyType; description?: string; location?: string; issuerId: string }) => void;
  respondToEmergencyAlert: (alertId: string, profileId: string, status: EmergencyResponseStatus) => void;
  cancelEmergencyAlert: (alertId: string, cancelledById: string) => void;
  expireEmergencyAlerts: () => void;
  addNotification: (notification: FireNotification) => void;
  markNotificationsRead: (ids?: string[]) => void;
}

export const useOperationsStore = create<OperationsStore>((set) => ({
  profiles: demoProfiles,
  vehicles: demoVehicles,
  events: demoEvents,
  notifications: demoNotifications,
  emergencyAlerts: demoEmergencyAlerts,
  addProfile: (profile) =>
    set((state) => {
      const actor = getCurrentActor(state.profiles);
      return {
        profiles: [profile, ...state.profiles],
        events: [
          {
            id: crypto.randomUUID(),
            title: "Creación de personal",
            detail: `${profile.fullName} fue agregado a la nómina operativa.`,
            actor,
            createdAt: new Date().toISOString(),
            severity: "success",
            metadata: {
              profileId: profile.id,
              profileName: profile.fullName,
              movementType: "profile_created"
            }
          },
          ...state.events
        ]
      };
    }),
  updateProfile: (profile) =>
    set((state) => ({
      profiles: state.profiles.map((item) => (item.id === profile.id ? profile : item))
    })),
  toggleProfileActive: (profileId) =>
    set((state) => {
      const profiles = state.profiles.map((profile) => {
        if (profile.id !== profileId) return profile;
        const nextProfile: Profile = {
          ...profile,
          isActive: profile.isActive === false,
          serviceStatus: profile.isActive === false ? profile.serviceStatus : "fuera_de_servicio",
          serviceMode: profile.isActive === false ? profile.serviceMode : null,
          serviceStartedAt: profile.isActive === false ? profile.serviceStartedAt : null
        };

        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem("fireops-disabled-codes");
          const disabledCodes = new Set<string>(raw ? JSON.parse(raw) : []);
          if (nextProfile.isActive === false) disabledCodes.add(nextProfile.firefighterCode);
          else disabledCodes.delete(nextProfile.firefighterCode);
          window.localStorage.setItem("fireops-disabled-codes", JSON.stringify([...disabledCodes]));
        }

        return nextProfile;
      });
      const profile = profiles.find((item) => item.id === profileId);
      const actor = getCurrentActor(state.profiles);
      return {
        profiles,
        events: profile
          ? [
              {
                id: crypto.randomUUID(),
                title: profile.isActive === false ? "Personal desactivado" : "Personal activado",
                detail: `${profile.fullName} fue ${profile.isActive === false ? "desactivado" : "activado"}.`,
                actor,
                createdAt: new Date().toISOString(),
                severity: profile.isActive === false ? "warning" : "success",
                metadata: {
                  profileId: profile.id,
                  profileName: profile.fullName,
                  movementType: "profile_status_change"
                }
              },
              ...state.events
            ]
          : state.events
      };
    }),
  addVehicle: (vehicle) =>
    set((state) => {
      const actor = getCurrentActor(state.profiles);
      return {
        vehicles: [vehicle, ...state.vehicles],
        events: [
          {
            id: crypto.randomUUID(),
            title: "Creación de vehículo",
            detail: `${vehicle.name} fue agregado al parque automotor.`,
            actor,
            createdAt: new Date().toISOString(),
            severity: "success",
            metadata: {
              vehicleId: vehicle.id,
              vehicleName: vehicle.name,
              movementType: "vehicle_created"
            }
          },
          ...state.events
        ]
      };
    }),
  updateVehicle: (vehicle) =>
    set((state) => ({
      vehicles: state.vehicles.map((item) =>
        item.id === vehicle.id ? { ...vehicle, updatedAt: new Date().toISOString() } : item
      )
    })),
  toggleVehicleActive: (vehicleId) =>
    set((state) => {
      const vehicles = state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId
          ? {
              ...vehicle,
              isActive: vehicle.isActive === false,
              updatedAt: new Date().toISOString()
            }
          : vehicle
      );
      const vehicle = vehicles.find((item) => item.id === vehicleId);
      const actor = getCurrentActor(state.profiles);
      return {
        vehicles,
        events: vehicle
          ? [
              {
                id: crypto.randomUUID(),
                title: vehicle.isActive === false ? "Vehículo desactivado" : "Vehículo activado",
                detail: `${vehicle.name} fue ${vehicle.isActive === false ? "desactivado" : "activado"}.`,
                actor,
                createdAt: new Date().toISOString(),
                severity: vehicle.isActive === false ? "warning" : "success",
                metadata: {
                  vehicleId: vehicle.id,
                  vehicleName: vehicle.name,
                  movementType: "vehicle_status_toggle"
                }
              },
              ...state.events
            ]
          : state.events
      };
    }),
  toggleService: (profileId, serviceMode, targetStatus) =>
    set((state) => {
      const previousProfile = state.profiles.find((profile) => profile.id === profileId);
      const profiles: Profile[] = state.profiles.map((profile) => {
        const requestedStatus = targetStatus ?? "en_servicio";
        const nextStatus: ServiceStatus =
          profile.serviceStatus === requestedStatus ? "fuera_de_servicio" : requestedStatus;
        return profile.id === profileId && profile.isActive !== false
          ? {
              ...profile,
              serviceStatus: nextStatus,
              serviceMode: nextStatus !== "fuera_de_servicio" ? serviceMode ?? (profile.role === "piloto" ? "piloto_voluntario" : "bombero") : null,
              serviceStartedAt: nextStatus !== "fuera_de_servicio" ? new Date().toISOString() : null
            }
          : profile;
      });
      const profile = profiles.find((item) => item.id === profileId);
      return {
        profiles,
        events: profile && previousProfile && previousProfile.isActive !== false
          ? [
              {
                id: crypto.randomUUID(),
                title: profile.serviceStatus === "en_servicio" ? "Entrada de personal" : "Salida de personal",
                detail:
                  profile.serviceStatus === "en_servicio"
                    ? `${profile.fullName} entró al servicio.`
                    : `${profile.fullName} salió del servicio.`,
                actor: profile.fullName,
                createdAt: new Date().toISOString(),
                severity: profile.serviceStatus === "en_servicio" ? "success" : "warning",
                metadata: {
                  profileId: profile.id,
                  profileName: profile.fullName,
                  movementType: profile.serviceStatus === "en_servicio" ? "service_entry" : "service_exit"
                }
              },
              ...state.events
            ]
          : state.events,
        notifications: profile && previousProfile && previousProfile.isActive !== false
          ? [serviceNotification(profile), ...state.notifications]
          : state.notifications
      };
    }),
  updateVehicleStatus: (vehicleId, status) =>
    set((state) => {
      const currentVehicle = state.vehicles.find((vehicle) => vehicle.id === vehicleId);
      const canUpdate = currentVehicle && currentVehicle.isActive !== false && currentVehicle.status !== status;
      const actor = getCurrentActor(state.profiles);
      return {
        vehicles: state.vehicles.map((vehicle) =>
          vehicle.id === vehicleId && vehicle.isActive !== false
            ? { ...vehicle, status, updatedAt: new Date().toISOString() }
            : vehicle
        ),
        events: canUpdate
          ? [
              {
                id: crypto.randomUUID(),
                title: "Cambio de estado de vehículo",
                detail: `${currentVehicle.name} cambió de ${vehicleStatusLabel[currentVehicle.status]} a ${vehicleStatusLabel[status]}.`,
                actor,
                createdAt: new Date().toISOString(),
                severity: status === "fuera_de_servicio" ? "danger" : status === "operativo" ? "success" : "warning",
                metadata: {
                  vehicleId: currentVehicle.id,
                  vehicleName: currentVehicle.name,
                  previousStatus: currentVehicle.status,
                  nextStatus: status,
                  movementType: "vehicle_status_change"
                }
              },
              ...state.events
            ]
          : state.events,
        notifications: canUpdate
          ? [
              {
                id: crypto.randomUUID(),
                title: "Vehículo actualizado",
                body: `${currentVehicle.name} cambió a ${vehicleStatusLabel[status]}.`,
                read: false,
                createdAt: new Date().toISOString(),
                audience: "crew"
              },
              ...state.notifications
            ]
          : state.notifications
      };
    }),
  emitEmergencyAlert: ({ type, description, location, issuerId }) =>
    set((state) => {
      const issuer = state.profiles.find((profile) => profile.id === issuerId);
      if (!issuer || (issuer.role !== "primer_jefe" && issuer.role !== "segundo_jefe")) return state;

      const now = new Date();
      const recipients = state.profiles
        .filter((profile) => canReceiveEmergencyAlert(profile, issuerId))
        .map((profile) => ({
          profileId: profile.id,
          serviceStatus: profile.serviceStatus as "en_servicio" | "en_alerta",
          notifiedAt: now.toISOString()
        }));
      const alert: EmergencyAlert = {
        id: crypto.randomUUID(),
        type,
        description: description?.trim() || undefined,
        location: location?.trim() || undefined,
        issuedById: issuer.id,
        issuedByName: issuer.fullName,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        status: "active",
        recipients,
        responses: []
      };
      const title = "Alerta de emergencia";
      const body = emergencyAlertBody(type, alert.location);

      return {
        emergencyAlerts: [alert, ...state.emergencyAlerts],
        events: [
          {
            id: crypto.randomUUID(),
            title,
            detail: `${emergencyTypeLabel[type]} emitida por ${issuer.fullName}. ${recipients.length} bomberos notificados.`,
            actor: issuer.fullName,
            createdAt: now.toISOString(),
            severity: "danger",
            metadata: {
              emergencyAlertId: alert.id,
              movementType: "emergency_alert_created"
            }
          },
          ...state.events
        ],
        notifications: [
          {
            id: crypto.randomUUID(),
            title,
            body,
            read: false,
            createdAt: now.toISOString(),
            audience: "crew",
            recipientIds: recipients.map((recipient) => recipient.profileId)
          },
          ...state.notifications
        ]
      };
    }),
  respondToEmergencyAlert: (alertId, profileId, status) =>
    set((state) => {
      const alert = state.emergencyAlerts.find((item) => item.id === alertId);
      const profile = state.profiles.find((item) => item.id === profileId);
      const recipient = alert?.recipients.find((item) => item.profileId === profileId);
      if (!alert || !profile || !recipient || alert.status !== "active" || new Date(alert.expiresAt).getTime() <= Date.now()) {
        return state;
      }
      if (status === "confirmed" && recipient.serviceStatus !== "en_servicio") return state;
      if (status === "on_way" && recipient.serviceStatus !== "en_alerta") return state;

      const now = new Date().toISOString();
      return {
        emergencyAlerts: state.emergencyAlerts.map((item) =>
          item.id === alertId
            ? {
                ...item,
                responses: [
                  { profileId, status, respondedAt: now },
                  ...item.responses.filter((response) => response.profileId !== profileId)
                ]
              }
            : item
        ),
        events: [
          {
            id: crypto.randomUUID(),
            title: "Respuesta a alerta",
            detail: `${profile.fullName}: ${emergencyResponseLabel[status]}.`,
            actor: profile.fullName,
            createdAt: now,
            severity: status === "unavailable" ? "warning" : "success",
            metadata: {
              profileId,
              profileName: profile.fullName,
              emergencyAlertId: alertId,
              movementType: "emergency_alert_response"
            }
          },
          ...state.events
        ],
        notifications: [
          {
            id: crypto.randomUUID(),
            title: "Respuesta a alerta",
            body: `${profile.fullName}: ${emergencyResponseLabel[status]}.`,
            read: false,
            createdAt: now,
            audience: "chiefs"
          },
          ...state.notifications
        ]
      };
    }),
  cancelEmergencyAlert: (alertId, cancelledById) =>
    set((state) => {
      const alert = state.emergencyAlerts.find((item) => item.id === alertId);
      const issuer = state.profiles.find((profile) => profile.id === cancelledById);
      if (!alert || !issuer || alert.status !== "active" || (issuer.role !== "primer_jefe" && issuer.role !== "segundo_jefe")) {
        return state;
      }
      const now = new Date().toISOString();
      return {
        emergencyAlerts: state.emergencyAlerts.map((item) =>
          item.id === alertId
            ? { ...item, status: "cancelled", cancelledAt: now, cancelledById }
            : item
        ),
        events: [
          {
            id: crypto.randomUUID(),
            title: "Alerta cancelada",
            detail: `La emergencia fue cancelada por ${issuer.specialPosition ?? issuer.fullName}.`,
            actor: issuer.fullName,
            createdAt: now,
            severity: "warning",
            metadata: {
              emergencyAlertId: alertId,
              movementType: "emergency_alert_cancelled"
            }
          },
          ...state.events
        ],
        notifications: [
          {
            id: crypto.randomUUID(),
            title: "Alerta cancelada",
            body: `La emergencia fue cancelada por ${issuer.specialPosition ?? issuer.fullName}.`,
            read: false,
            createdAt: now,
            audience: "crew",
            recipientIds: alert.recipients.map((recipient) => recipient.profileId)
          },
          ...state.notifications
        ]
      };
    }),
  expireEmergencyAlerts: () =>
    set((state) => {
      const now = new Date();
      const expired = state.emergencyAlerts.filter(
        (alert) => alert.status === "active" && new Date(alert.expiresAt).getTime() <= now.getTime()
      );
      if (!expired.length) return state;
      return {
        emergencyAlerts: state.emergencyAlerts.map((alert) =>
          expired.some((item) => item.id === alert.id) ? { ...alert, status: "expired" } : alert
        ),
        events: [
          ...expired.map((alert) => ({
            id: crypto.randomUUID(),
            title: "Alerta expirada",
            detail: `${emergencyTypeLabel[alert.type]} finalizó automáticamente tras 10 minutos.`,
            actor: "Sistema",
            createdAt: now.toISOString(),
            severity: "info" as const,
            metadata: {
              emergencyAlertId: alert.id,
              movementType: "emergency_alert_expired" as const
            }
          })),
          ...state.events
        ]
      };
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications]
    })),
  markNotificationsRead: (ids) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        !ids || ids.includes(notification.id) ? { ...notification, read: true } : notification
      )
    }))
}));
