export const AUTO_SYNC_INTERVAL_COOKIE = "spotify_tracker_auto_sync_minutes";

export function parseAutoSyncInterval(value: string | null | undefined): number {
  const parsed = Number(value ?? "60");
  if (!Number.isFinite(parsed)) return 60;
  if (parsed <= 0) return 0;
  const rounded = Math.round(parsed);
  return Math.min(720, Math.max(5, rounded));
}

export function autoSyncLabel(minutes: number): string {
  if (minutes <= 0) return "Disabled";
  if (minutes < 60) return `Every ${minutes} minutes`;
  if (minutes === 60) return "Every hour";
  const hours = minutes / 60;
  return `Every ${hours} hours`;
}
