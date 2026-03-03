"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DayDatum = { date: string; hours: number; plays: number };
type GenreDatum = { name: string; hours: number };
type ArtistRankDatum = { date: string; [key: string]: string | number | null };
type MonthDatum = { month: string; hours: number; plays: number };

type Props = {
  timeline: DayDatum[];
  genres: GenreDatum[];
  artistRanks: ArtistRankDatum[];
  monthly: MonthDatum[];
};

const pieColors = ["#1ed760", "#22c55e", "#14b8a6", "#38bdf8", "#84cc16", "#06b6d4"];

function Heatmap({ timeline }: { timeline: DayDatum[] }) {
  const maxPlays = Math.max(1, ...timeline.map((item) => item.plays));
  return (
    <div className="grid grid-cols-12 gap-1">
      {timeline.slice(-84).map((item) => {
        const level = Math.max(0.15, item.plays / maxPlays);
        return (
          <div
            key={item.date}
            title={`${item.date}: ${item.plays} plays`}
            className="h-4 rounded-[3px]"
            style={{ backgroundColor: `color-mix(in oklab, var(--accent) ${Math.round(level * 100)}%, #1b1b1b)` }}
          />
        );
      })}
    </div>
  );
}

export function VisualDashboards({ timeline, genres, artistRanks, monthly }: Props) {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="ui-panel h-72 p-5">
            <div className="h-full w-full rounded-lg bg-[var(--panel-strong)]/70" />
          </article>
        ))}
      </section>
    );
  }

  const artistKeys = Object.keys(artistRanks[0] ?? {}).filter((key) => key !== "date");

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2" data-section-id="visuals">
      <article className="ui-panel p-5 xl:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Visual Dashboards</p>
            <h2 className="mt-1 text-xl font-bold">Charts, Graphs, Heatmaps, and Timeline Views</h2>
          </div>
          <Link href="/wrapped" className="ui-primary-btn px-4 py-2 text-sm">
            Wrapped-Style Summary
          </Link>
        </div>
      </article>

      <article className="ui-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Listening Time Over Time</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline.slice(-60)}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip />
              <Line dataKey="hours" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="ui-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Top Genres + Genre Split</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genres.slice(0, 8)}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="ui-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Pie Chart: Genre Split</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={genres.slice(0, 6)} dataKey="hours" nameKey="name" innerRadius={45} outerRadius={90}>
                {genres.slice(0, 6).map((genre, index) => (
                  <Cell key={`${genre.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="ui-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Artist Ranking Changes</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={artistRanks.slice(-40)}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis reversed domain={[1, 10]} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {artistKeys.slice(0, 4).map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} dot={false} stroke={pieColors[index % pieColors.length]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="ui-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Heatmap Calendar Of Listening Activity</p>
        <div className="mt-4">
          <Heatmap timeline={timeline} />
        </div>
      </article>

      <article className="ui-panel p-5 xl:col-span-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Timeline View For Listening History</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly.slice(-12)}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="hours" fill="var(--accent)" name="Hours" />
              <Bar yAxisId="right" dataKey="plays" fill="#38bdf8" name="Plays" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
