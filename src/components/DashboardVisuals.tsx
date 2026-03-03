"use client";

import { useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";

type SliceDatum = { name: string; value: number };
type TimelineDatum = { date: string; value: number };

type Props = {
  unitLabel: string;
  unitSuffix: string;
  domainSlices: SliceDatum[];
  genreSlices: SliceDatum[];
  timeline: TimelineDatum[];
};

const pieColors = ["#fb7185", "#f97316", "#facc15", "#34d399", "#60a5fa", "#a78bfa"];
const formatValue = (value: unknown, unitSuffix: string) => `${Number(value ?? 0).toFixed(2)}${unitSuffix}`;

export function DashboardVisuals({ unitLabel, unitSuffix, domainSlices, genreSlices, timeline }: Props) {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <section className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="ui-panel h-96 p-5">
            <div className="h-full w-full rounded-lg bg-[var(--panel-soft)]/60" />
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <article className="ui-panel p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Listening Mix</p>
        <h3 className="mt-2 text-lg font-semibold">Songs vs Albums vs Artists vs Genres ({unitLabel})</h3>
        <div className="mt-5 h-80 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <PieChart>
              <Pie data={domainSlices} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={4}>
                {domainSlices.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={pieColors[idx % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatValue(value, unitSuffix)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="ui-panel p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Genre Split</p>
        <h3 className="mt-2 text-lg font-semibold">Top Genres by Estimated {unitLabel}</h3>
        <div className="mt-5 h-80 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <PieChart>
              <Pie data={genreSlices} dataKey="value" nameKey="name" outerRadius={100}>
                {genreSlices.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={pieColors[idx % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatValue(value, unitSuffix)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="ui-panel p-5 xl:col-span-2">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Timeline</p>
        <h3 className="mt-2 text-lg font-semibold">Estimated {unitLabel} by Day</h3>
        <div className="mt-5 h-80 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis dataKey="date" name="Date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis dataKey="value" name={unitLabel} tick={{ fill: "var(--muted)" }} />
              <Tooltip formatter={(value) => formatValue(value, unitSuffix)} />
              <Scatter data={timeline} fill="var(--accent)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
