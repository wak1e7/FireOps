export type AccountNotificationSettings = {
  enablePushNotifications: boolean;
};

const defaultSettings: AccountNotificationSettings = {
  enablePushNotifications: true
};

export function loadAccountNotificationSettings() {
  if (typeof window === "undefined") return defaultSettings;
  const raw = window.localStorage.getItem("fireops-account-settings");
  if (!raw) return defaultSettings;
  try {
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<AccountNotificationSettings>) };
  } catch {
    return defaultSettings;
  }
}

export function saveAccountNotificationSettings(settings: AccountNotificationSettings) {
  window.localStorage.setItem("fireops-account-settings", JSON.stringify(settings));
}

export function hasAskedNotificationPermissionOnDevice() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("fireops-notification-permission-asked") === "true";
}

export function markNotificationPermissionAskedOnDevice() {
  window.localStorage.setItem("fireops-notification-permission-asked", "true");
}
