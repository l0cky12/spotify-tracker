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
  return (
    <form
      method="get"
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4 md:flex-row md:flex-wrap md:items-end"
    >
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--muted)]">
        Range
        <select
          name="range"
          defaultValue={selectedRange}
          className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)]"
        >
          {presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--muted)]">
        From
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--muted)]">
        To
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>

      <button
        type="submit"
        className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:brightness-110"
      >
        Apply
      </button>
    </form>
  );
}
