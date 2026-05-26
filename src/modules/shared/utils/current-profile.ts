import type { Profile } from "@/modules/shared/types/domain";

export function getCurrentProfile(profiles: Profile[]) {
  if (typeof window === "undefined") return profiles[0];
  const code = window.localStorage.getItem("fireops-demo-session") ?? "A06692";
  return profiles.find((profile) => profile.firefighterCode === code) ?? profiles[0];
}

export function isChiefProfile(profile?: Profile) {
  return (
    profile?.role === "admin" ||
    profile?.specialPosition === "Primer Jefe" ||
    profile?.specialPosition === "Segundo Jefe"
  );
}
