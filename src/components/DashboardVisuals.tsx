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
  ZAxis,
} from "recharts";

type SliceDatum = { name: string; value: number };
type BubbleDatum = { name: string; hours: number; appearances: number; score: number; bubble: number };
type TimelineDatum = { date: string; hours: number };

type Props = {
  domainSlices: SliceDatum[];
  genreSlices: SliceDatum[];
  bubbles: BubbleDatum[];
  timeline: TimelineDatum[];
};

const pieColors = ["#fb7185", "#f97316", "#facc15", "#34d399", "#60a5fa", "#a78bfa"];
const formatHours = (value: unknown) => `${Number(value ?? 0).toFixed(2)}h`;

export function DashboardVisuals({ domainSlices, genreSlices, bubbles, timeline }: Props) {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="h-96 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
            <div className="h-full w-full rounded-lg bg-[var(--panel-soft)]/60" />
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Listening Mix</p>
        <h3 className="mt-2 text-lg font-semibold">Songs vs Albums vs Artists vs Genres</h3>
        <div className="mt-4 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <PieChart>
              <Pie data={domainSlices} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={4}>
                {domainSlices.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={pieColors[idx % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatHours(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Genre Split</p>
        <h3 className="mt-2 text-lg font-semibold">Top Genres by Estimated Hours</h3>
        <div className="mt-4 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <PieChart>
              <Pie data={genreSlices} dataKey="value" nameKey="name" outerRadius={100}>
                {genreSlices.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={pieColors[idx % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatHours(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Bubble Chart</p>
        <h3 className="mt-2 text-lg font-semibold">Top Songs Footprint</h3>
        <div className="mt-4 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis type="number" dataKey="hours" name="Hours" tick={{ fill: "var(--muted)" }} />
              <YAxis type="number" dataKey="score" name="Score" tick={{ fill: "var(--muted)" }} />
              <ZAxis type="number" dataKey="bubble" range={[50, 520]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value, key) => (key === "hours" ? formatHours(value) : String(value))}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.name ?? label}
              />
              <Scatter data={bubbles} fill="var(--accent)">
                {bubbles.map((point) => (
                  <Cell key={point.name} fill="var(--accent)" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Timeline</p>
        <h3 className="mt-2 text-lg font-semibold">Estimated Hours by Snapshot Interval</h3>
        <div className="mt-4 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis dataKey="date" name="Date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis dataKey="hours" name="Hours" tick={{ fill: "var(--muted)" }} />
              <Tooltip formatter={(value) => formatHours(value)} />
              <Scatter data={timeline} fill="var(--accent)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
