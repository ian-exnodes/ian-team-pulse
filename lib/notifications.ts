"use client";

// Tiny external store around the browser Notification permission, so
// components can read it via useSyncExternalStore without SSR mismatches
// or setState-in-effect patterns.

export type NotifPermission = NotificationPermission | "unsupported" | "ssr";

const listeners = new Set<() => void>();

export function subscribeNotifPermission(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getNotifPermission(): NotifPermission {
  return typeof Notification === "undefined"
    ? "unsupported"
    : Notification.permission;
}

export function getServerNotifPermission(): NotifPermission {
  return "ssr";
}

export async function requestNotifPermission(): Promise<void> {
  if (typeof Notification === "undefined") return;
  try {
    await Notification.requestPermission();
  } finally {
    listeners.forEach((l) => l());
  }
}

export function showNotification(title: string, body: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    // Some platforms (e.g. Android Chrome) require a service worker; a
    // missed notification is not worth crashing a realtime handler.
  }
}
