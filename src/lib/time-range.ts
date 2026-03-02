export type TimePreset = "day" | "week" | "month" | "year" | "last-year" | "last-3-years" | "last-5-years" | "all" | "custom";

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

function shiftYears(date: Date, years: number): Date {
  const out = startOfDay(date);
  out.setFullYear(out.getFullYear() - years);
  return out;
}

function pickPreset(value?: string): TimePreset {
  const presets: TimePreset[] = ["day", "week", "month", "year", "last-year", "last-3-years", "last-5-years", "all", "custom"];
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
          : preset === "year"
            ? startOfYear(now)
            : preset === "last-year"
              ? shiftYears(now, 1)
              : preset === "last-3-years"
                ? shiftYears(now, 3)
                : shiftYears(now, 5);

  return {
    preset,
    start,
    end: now,
    label: presetLabel(preset),
  };
}

function presetLabel(preset: TimePreset): string {
  if (preset === "day") return "Today";
  if (preset === "week") return "This week";
  if (preset === "month") return "This month";
  if (preset === "year") return "This year";
  if (preset === "last-year") return "Last year";
  if (preset === "last-3-years") return "Last 3 years";
  if (preset === "last-5-years") return "Last 5 years";
  if (preset === "all") return "All time";
  return "Custom";
}
