export type TimePreset = "day" | "week" | "month" | "year" | "all" | "custom";

export type TimeRange = {
  preset: TimePreset;
  from?: string;
  to?: string;
  start: Date;
  end: Date;
  label: string;
};

function parseDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function endOfDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function startOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeek(date: Date): Date {
  const out = startOfDay(date);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function startOfMonth(date: Date): Date {
  const out = startOfDay(date);
  out.setDate(1);
  return out;
}

function startOfYear(date: Date): Date {
  const out = startOfDay(date);
  out.setMonth(0, 1);
  return out;
}

function pickPreset(value?: string): TimePreset {
  const presets: TimePreset[] = ["day", "week", "month", "year", "all", "custom"];
  return presets.includes((value ?? "") as TimePreset) ? (value as TimePreset) : "all";
}

export function resolveTimeRange(params: {
  range?: string;
  from?: string;
  to?: string;
  now?: Date;
}): TimeRange {
  const now = params.now ?? new Date();
  const preset = pickPreset(params.range);

  if (preset === "custom") {
    const start = parseDateOnly(params.from);
    const end = endOfDateOnly(params.to);

    if (start && end && start <= end) {
      return {
        preset,
        from: params.from,
        to: params.to,
        start,
        end,
        label: `Custom: ${params.from} to ${params.to}`,
      };
    }
  }

  if (preset === "all") {
    return {
      preset,
      start: new Date(0),
      end: now,
      label: "All time",
    };
  }

  const start =
    preset === "day"
      ? startOfDay(now)
      : preset === "week"
        ? startOfWeek(now)
        : preset === "month"
          ? startOfMonth(now)
          : startOfYear(now);

  return {
    preset,
    start,
    end: now,
    label:
      preset === "day" ? "Today" : preset === "week" ? "This week" : preset === "month" ? "This month" : "This year",
  };
}
