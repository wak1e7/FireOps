import { AppShell } from "@/modules/dashboard/components/app-shell";
import { ActivityFeed } from "@/modules/historial/components/activity-feed";

export function HistorialPage() {
  return (
    <AppShell>
      <ActivityFeed />
    </AppShell>
  );
}
