import { AppShell } from "@/modules/dashboard/components/app-shell";
import { PersonnelList } from "@/modules/bomberos/components/personnel-list";

export function PersonalPage() {
  return (
    <AppShell>
      <PersonnelList />
    </AppShell>
  );
}
