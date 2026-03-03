"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
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
import type { HomeInsights } from "@/lib/home-insights";

type DayDatum = { date: string; hours: number; plays: number };
type GenreDatum = { name: string; hours: number };
type ArtistRankDatum = { date: string; [key: string]: string | number | null };
type MonthDatum = { month: string; hours: number; plays: number };

type Props = {
  timeline: DayDatum[];
  genres: GenreDatum[];
  artistRanks: ArtistRankDatum[];
  monthly: MonthDatum[];
  insights: HomeInsights;
};

const pieColors = ["#1ed760", "#22c55e", "#14b8a6", "#38bdf8", "#84cc16", "#06b6d4"];

type Visibility = {
  listening: boolean;
  topGenres: boolean;
  genrePie: boolean;
  artistRanks: boolean;
  heatmap: boolean;
  timeline: boolean;
  mood: boolean;
  habits: boolean;
};

function Heatmap({ timeline, days }: { timeline: DayDatum[]; days: number }) {
  const maxPlays = Math.max(1, ...timeline.map((item) => item.plays));
  return (
    <div className="grid grid-cols-12 gap-1">
      {timeline.slice(-days).map((item) => {
        const level = Math.max(0.15, item.plays / maxPlays);
        return (
          <div
            key={`${item.date}-${item.plays}`}
            title={`${item.date}: ${item.plays} plays`}
            className="h-4 rounded-[3px]"
            style={{ backgroundColor: `color-mix(in oklab, var(--accent) ${Math.round(level * 100)}%, #1b1b1b)` }}
          />
        );
      })}
    </div>
  );
}

export function VisualDashboards({ timeline, genres, artistRanks, monthly, insights }: Props) {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [windowDays, setWindowDays] = useState(60);
  const [heatmapDays, setHeatmapDays] = useState(84);
  const [show, setShow] = useState<Visibility>({
    listening: true,
    topGenres: true,
    genrePie: true,
    artistRanks: true,
    heatmap: true,
    timeline: true,
    mood: true,
    habits: true,
  });

  const artistKeys = useMemo(
    () => Object.keys(artistRanks[0] ?? {}).filter((key) => key !== "date"),
    [artistRanks],
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

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2" data-section-id="visuals">
      <article className="ui-panel p-5 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Visual Dashboards</p>
            <h2 className="mt-1 text-xl font-bold">Charts, Graphs, Heatmaps, and Timeline Views</h2>
          </div>
          <Link href="/wrapped" className="ui-primary-btn px-4 py-2 text-sm">
            Wrapped-Style Summary
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs text-[var(--muted)]">
            Chart Window
            <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--stroke)] bg-[var(--panel-soft)] px-2 py-1.5 text-sm text-[var(--text)]">
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            Heatmap Window
            <select value={heatmapDays} onChange={(e) => setHeatmapDays(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--stroke)] bg-[var(--panel-soft)] px-2 py-1.5 text-sm text-[var(--text)]">
              <option value={56}>8 weeks</option>
              <option value={84}>12 weeks</option>
              <option value={168}>24 weeks</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.listening} onChange={(e) => setShow((s) => ({ ...s, listening: e.target.checked }))} />Listening chart</label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.topGenres} onChange={(e) => setShow((s) => ({ ...s, topGenres: e.target.checked }))} />Genre bar chart</label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.genrePie} onChange={(e) => setShow((s) => ({ ...s, genrePie: e.target.checked }))} />Genre pie chart</label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.artistRanks} onChange={(e) => setShow((s) => ({ ...s, artistRanks: e.target.checked }))} />Artist ranks</label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.heatmap} onChange={(e) => setShow((s) => ({ ...s, heatmap: e.target.checked }))} />Heatmap</label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.timeline} onChange={(e) => setShow((s) => ({ ...s, timeline: e.target.checked }))} />Timeline</label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.mood} onChange={(e) => setShow((s) => ({ ...s, mood: e.target.checked }))} />Mood trends</label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={show.habits} onChange={(e) => setShow((s) => ({ ...s, habits: e.target.checked }))} />Habit cards</label>
        </div>
      </article>

      {show.habits ? (
        <article className="ui-panel p-5 xl:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Listening streaks" value={insights.streakCurrent ? `You listened ${insights.streakCurrent} days in a row` : `Best streak: ${insights.streakBest} days`} />
            <Info label="Artist obsession score" value={`${insights.artistObsession.score}/100 - ${insights.artistObsession.artist}`} />
            <Info label="Discovery stats" value={`${insights.discovery.newArtists} new artists, ${insights.discovery.newSongs} new songs (${insights.discovery.month})`} />
            <Info label="Repeat score" value={`${insights.repeatScore.score}/100 (${insights.repeatScore.replayRate}% replay rate)`} />
          </div>
        </article>
      ) : null}

      {show.listening ? (
        <article className="ui-panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Listening Time Over Time</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline.slice(-windowDays)}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip />
                <Line dataKey="hours" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {show.topGenres ? (
        <article className="ui-panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Top Genres</p>
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
      ) : null}

      {show.genrePie ? (
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
      ) : null}

      {show.artistRanks ? (
        <article className="ui-panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Artist Ranking Changes</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={artistRanks.slice(-windowDays)}>
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
      ) : null}

      {show.mood ? (
        <article className="ui-panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Mood Trends (Inferred)</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insights.moodTrends}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line dataKey="energy" stroke="#22c55e" dot={false} />
                <Line dataKey="valence" stroke="#f97316" dot={false} />
                <Line dataKey="danceability" stroke="#38bdf8" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {show.heatmap ? (
        <article className="ui-panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Heatmap Calendar Of Listening Activity</p>
          <div className="mt-4">
            <Heatmap timeline={timeline} days={heatmapDays} />
          </div>
        </article>
      ) : null}

      {show.timeline ? (
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
      ) : null}

      {show.habits ? (
        <article className="ui-panel p-5 xl:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Time-Of-Day And Week Habits</p>
          <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.timeOfDay}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="plays" fill="var(--accent)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.weekdayWeekend}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="plays" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-soft-panel p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </article>
  );
}
