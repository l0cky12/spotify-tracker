export const AUTO_SYNC_INTERVAL_COOKIE = "spotify_tracker_auto_sync_minutes";
export const NOW_PLAYING_REFRESH_COOKIE = "spotify_tracker_now_playing_refresh_seconds";

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

export function parseNowPlayingRefreshSeconds(value: string | null | undefined): number {
  const parsed = Number(value ?? "30");
  if (!Number.isFinite(parsed)) return 30;
  const rounded = Math.round(parsed);
  return Math.min(300, Math.max(10, rounded));
}

export function nowPlayingRefreshLabel(seconds: number): string {
  if (seconds < 60) return `Every ${seconds} seconds`;
  if (seconds === 60) return "Every 1 minute";
  return `Every ${Math.round(seconds / 60)} minutes`;
}
