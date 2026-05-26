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

type OperationsSnapshot = {
  profiles: Profile[];
  vehicles: Vehicle[];
  events: OperationalEvent[];
  notifications: FireNotification[];
  emergencyAlerts: EmergencyAlert[];
};

type OperationAction =
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

interface OperationsStore extends OperationsSnapshot {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadOperations: () => Promise<void>;
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

const emptySnapshot: OperationsSnapshot = {
  profiles: [],
  vehicles: [],
  events: [],
  notifications: [],
  emergencyAlerts: []
};

async function fetchOperations(): Promise<OperationsSnapshot> {
  const response = await fetch("/api/operations", {
    cache: "no-store",
    headers: currentCodeHeader()
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "No se pudo cargar la operación.");
  }
  return (await response.json()) as OperationsSnapshot;
}

async function runOperation(action: OperationAction): Promise<OperationsSnapshot> {
  const response = await fetch("/api/operations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...currentCodeHeader() },
    body: JSON.stringify(action)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "No se pudo guardar la operación.");
  }
  return (await response.json()) as OperationsSnapshot;
}

function currentCodeHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const code = window.localStorage.getItem("fireops-demo-session");
  return code ? { "x-fireops-code": code } : {};
}

function applySnapshot(set: (partial: Partial<OperationsStore>) => void, snapshot: OperationsSnapshot) {
  set({ ...snapshot, loaded: true, loading: false, error: null });
}

function runAndRefresh(
  set: (partial: Partial<OperationsStore>) => void,
  get: () => OperationsStore,
  action: OperationAction
) {
  set({ error: null });
  runOperation(action)
    .then((snapshot) => applySnapshot(set, snapshot))
    .catch((error: unknown) => {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo completar la operación."
      });
    });
}

export const useOperationsStore = create<OperationsStore>((set, get) => ({
  ...emptySnapshot,
  loaded: false,
  loading: false,
  error: null,
  loadOperations: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      applySnapshot(set, await fetchOperations());
    } catch (error) {
      set({
        loading: false,
        loaded: true,
        error: error instanceof Error ? error.message : "No se pudo cargar la operación."
      });
    }
  },
  addProfile: (profile) => runAndRefresh(set, get, { action: "addProfile", profile }),
  updateProfile: (profile) => runAndRefresh(set, get, { action: "updateProfile", profile }),
  toggleProfileActive: (profileId) => runAndRefresh(set, get, { action: "toggleProfileActive", profileId }),
  addVehicle: (vehicle) => runAndRefresh(set, get, { action: "addVehicle", vehicle }),
  updateVehicle: (vehicle) => runAndRefresh(set, get, { action: "updateVehicle", vehicle }),
  toggleVehicleActive: (vehicleId) => runAndRefresh(set, get, { action: "toggleVehicleActive", vehicleId }),
  toggleService: (profileId, serviceMode, targetStatus) =>
    runAndRefresh(set, get, { action: "toggleService", profileId, serviceMode, targetStatus }),
  updateVehicleStatus: (vehicleId, status) => runAndRefresh(set, get, { action: "updateVehicleStatus", vehicleId, status }),
  emitEmergencyAlert: (payload) => runAndRefresh(set, get, { action: "emitEmergencyAlert", ...payload }),
  respondToEmergencyAlert: (alertId, profileId, status) =>
    runAndRefresh(set, get, { action: "respondToEmergencyAlert", alertId, profileId, status }),
  cancelEmergencyAlert: (alertId, cancelledById) =>
    runAndRefresh(set, get, { action: "cancelEmergencyAlert", alertId, cancelledById }),
  expireEmergencyAlerts: () => runAndRefresh(set, get, { action: "expireEmergencyAlerts" }),
  addNotification: (notification) => runAndRefresh(set, get, { action: "addNotification", notification }),
  markNotificationsRead: (ids) => runAndRefresh(set, get, { action: "markNotificationsRead", ids })
}));
