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
      className="ui-panel mt-5 grid grid-cols-1 gap-3 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-end"
    >
      <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        Range
        <select
          name="range"
          defaultValue={selectedRange}
          className="rounded-xl border border-[var(--stroke)] bg-[color:var(--panel-glass)] px-3 py-2.5 text-sm text-[var(--text)]"
        >
          {presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        From
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-xl border border-[var(--stroke)] bg-[color:var(--panel-glass)] px-3 py-2.5 text-sm text-[var(--text)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        To
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-xl border border-[var(--stroke)] bg-[color:var(--panel-glass)] px-3 py-2.5 text-sm text-[var(--text)]"
        />
      </label>

      <button
        type="submit"
        className="ui-primary-btn h-[42px] px-5 text-sm"
      >
        Apply
      </button>
    </form>
  );
}
