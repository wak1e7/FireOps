import { AppShell } from "@/modules/dashboard/components/app-shell";
import { EmergencyAlertModule } from "@/modules/emergencias/components/emergency-alert-module";

export default async function Emergencias({
  searchParams
}: {
  searchParams: Promise<{ emit?: string }>;
}) {
  const params = await searchParams;

  return (
    <AppShell>
      <EmergencyAlertModule autoOpenForm={params.emit === "1"} />
    </AppShell>
  );
}
