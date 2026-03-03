 "use client";

import { useState } from "react";
import { TimePreset } from "@/lib/time-range";

type Props = {
  selectedRange: TimePreset;
  from?: string;
  to?: string;
};

const presets: Array<{ value: TimePreset; label: string }> = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "last-3-years", label: "Last 3 years" },
  { value: "last-5-years", label: "Last 5 years" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function RangeFilter({ selectedRange, from, to }: Props) {
  const [range, setRange] = useState<TimePreset>(selectedRange);
  const [fromValue, setFromValue] = useState(from ?? "");
  const [toValue, setToValue] = useState(to ?? "");

  return (
    <form
      method="get"
      className="ui-panel mt-6 grid grid-cols-1 gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end"
    >
      <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Range
        <select
          name="range"
          value={range}
          onChange={(event) => {
            const next = event.target.value as TimePreset;
            setRange(next);
            if (next !== "custom") {
              setFromValue("");
              setToValue("");
            }
          }}
          className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-strong)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        >
          {presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        From
        <input
          type="date"
          name="from"
          value={fromValue}
          onChange={(event) => {
            const next = event.target.value;
            setFromValue(next);
            if (next || toValue) {
              setRange("custom");
            }
          }}
          className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-strong)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        To
        <input
          type="date"
          name="to"
          value={toValue}
          onChange={(event) => {
            const next = event.target.value;
            setToValue(next);
            if (fromValue || next) {
              setRange("custom");
            }
          }}
          className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-strong)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <button type="submit" className="ui-primary-btn h-[42px] px-6 text-sm">
        Refresh
      </button>
    </form>
  );
}
