export type TimePreset = "day" | "week" | "month" | "year" | "all" | "custom";

export type TimeRange = {
  preset: TimePreset;
  from?: string;
  to?: string;
  start: Date;
  end: Date;
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function endOfDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function pickPreset(value?: string): TimePreset {
  const presets: TimePreset[] = ["day", "week", "month", "year", "all", "custom"];
  return presets.includes((value ?? "") as TimePreset) ? (value as TimePreset) : "week";
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

  const spanMs =
    preset === "day"
      ? DAY_MS
      : preset === "week"
        ? 7 * DAY_MS
        : preset === "month"
          ? 30 * DAY_MS
          : 365 * DAY_MS;

  const start = new Date(now.getTime() - spanMs);

  return {
    preset,
    start,
    end: now,
    label:
      preset === "day"
        ? "Last 24 hours"
        : preset === "week"
          ? "Last 7 days"
          : preset === "month"
            ? "Last 30 days"
            : "Last 365 days",
  };
}
