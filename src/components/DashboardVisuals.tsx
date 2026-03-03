"use client";

import { useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
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

const pieColors = ["#1ed760", "#1db954", "#14b8a6", "#84cc16", "#22c55e", "#2dd4bf"];
const formatValue = (value: unknown, unitSuffix: string) => `${Number(value ?? 0).toFixed(2)}${unitSuffix}`;

export function DashboardVisuals({ unitLabel, unitSuffix, domainSlices, genreSlices, timeline }: Props) {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="ui-panel h-80 p-5">
            <div className="h-full w-full rounded-lg bg-[var(--panel-strong)]/70" />
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
      <article className="ui-panel p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Collection Mix</p>
        <h3 className="mt-2 text-lg font-semibold">Listening split by type ({unitLabel})</h3>
        <div className="mt-4 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
            <PieChart>
              <Pie data={domainSlices} dataKey="value" nameKey="name" innerRadius={48} outerRadius={88} paddingAngle={4}>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Genre Share</p>
        <h3 className="mt-2 text-lg font-semibold">Top genres by estimated {unitLabel}</h3>
        <div className="mt-4 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
            <PieChart>
              <Pie data={genreSlices} dataKey="value" nameKey="name" outerRadius={90}>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Playback Timeline</p>
        <h3 className="mt-2 text-lg font-semibold">Estimated {unitLabel} per day</h3>
        <div className="mt-4 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis dataKey="date" name="Date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis dataKey="value" name={unitLabel} tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <Tooltip formatter={(value) => formatValue(value, unitSuffix)} />
              <Scatter data={timeline} fill="var(--accent)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
