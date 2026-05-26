import { AppShell } from "@/modules/dashboard/components/app-shell";
import { VehicleManagement } from "@/modules/vehiculos/components/vehicle-management";

export function VehiculosPage() {
  return (
    <AppShell>
      <VehicleManagement />
    </AppShell>
  );
}
