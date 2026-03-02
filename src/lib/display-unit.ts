export type DisplayUnit = "hours" | "minutes";

export const DISPLAY_UNIT_COOKIE = "spotify_tracker_display_unit";

export function parseDisplayUnit(value: string | null | undefined): DisplayUnit {
  return value === "minutes" ? "minutes" : "hours";
}

export function displayUnitLabel(unit: DisplayUnit): string {
  return unit === "minutes" ? "minutes" : "hours";
}

export function displayUnitSuffix(unit: DisplayUnit): string {
  return unit === "minutes" ? "m" : "h";
}

export function convertHoursForDisplay(hours: number, unit: DisplayUnit): number {
  return unit === "minutes" ? hours * 60 : hours;
}

export function formatEstimatedDuration(
  hours: number,
  unit: DisplayUnit,
  options?: { hoursDecimals?: number; minutesDecimals?: number },
): string {
  const value = convertHoursForDisplay(hours, unit);
  const decimals = unit === "minutes" ? (options?.minutesDecimals ?? 0) : (options?.hoursDecimals ?? 2);
  return `${value.toFixed(decimals)}${displayUnitSuffix(unit)}`;
}
