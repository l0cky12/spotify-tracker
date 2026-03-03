"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

type StatItem = {
  id: string;
  label: string;
  value: string;
};

type Props = {
  stats: StatItem[];
  timeline: DayDatum[];
  genres: GenreDatum[];
  monthly: MonthDatum[];
  artistRanks: ArtistRankDatum[];
  insights: HomeInsights;
};

type Widget =
  | { id: string; type: "stat"; statId: string; span: 1 | 2 }
  | { id: string; type: "line" | "bar"; sourceId: string; span: 1 | 2 }
  | { id: string; type: "pie"; sourceId: string; span: 1 | 2 }
  | { id: string; type: "heatmap"; days: number; span: 1 | 2 };

type SeriesSource = {
  id: string;
  label: string;
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  yKey: string;
};

const pieColors = ["#1ed760", "#22c55e", "#14b8a6", "#38bdf8", "#84cc16", "#06b6d4"];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

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

export function HomeDashboardBuilder({ stats, timeline, genres, monthly, artistRanks, insights }: Props) {
  const artistKeys = useMemo(
    () => Object.keys(artistRanks[0] ?? {}).filter((key) => key !== "date"),
    [artistRanks],
  );

  const lineBarSources = useMemo<SeriesSource[]>(() => {
    const sources: SeriesSource[] = [
      { id: "daily-hours", label: "Daily Listening Hours", data: timeline, xKey: "date", yKey: "hours" },
      { id: "daily-plays", label: "Daily Plays", data: timeline, xKey: "date", yKey: "plays" },
      { id: "monthly-hours", label: "Monthly Hours", data: monthly, xKey: "month", yKey: "hours" },
      { id: "monthly-plays", label: "Monthly Plays", data: monthly, xKey: "month", yKey: "plays" },
      { id: "tod-plays", label: "Time Of Day Plays", data: insights.timeOfDay, xKey: "name", yKey: "plays" },
      { id: "week-plays", label: "Weekday vs Weekend Plays", data: insights.weekdayWeekend, xKey: "name", yKey: "plays" },
      { id: "mood-energy", label: "Mood Energy Trend", data: insights.moodTrends, xKey: "month", yKey: "energy" },
      { id: "mood-valence", label: "Mood Valence Trend", data: insights.moodTrends, xKey: "month", yKey: "valence" },
      { id: "mood-dance", label: "Mood Danceability Trend", data: insights.moodTrends, xKey: "month", yKey: "danceability" },
    ];

    if (artistKeys.length) {
      sources.push({
        id: "artist-rank-primary",
        label: `Artist Rank: ${artistKeys[0]}`,
        data: artistRanks,
        xKey: "date",
        yKey: artistKeys[0],
      });
    }

    return sources;
  }, [artistKeys, artistRanks, insights.moodTrends, insights.timeOfDay, insights.weekdayWeekend, monthly, timeline]);

  const pieSources = useMemo(
    () => [
      { id: "genre-split", label: "Genre Split", data: genres.map((genre) => ({ name: genre.name, value: genre.hours })) },
      {
        id: "tod-split",
        label: "Time Of Day Split",
        data: insights.timeOfDay.map((row) => ({ name: row.name, value: row.plays })),
      },
      {
        id: "week-split",
        label: "Weekday vs Weekend Split",
        data: insights.weekdayWeekend.map((row) => ({ name: row.name, value: row.plays })),
      },
    ],
    [genres, insights.timeOfDay, insights.weekdayWeekend],
  );

  const [menuOpen, setMenuOpen] = useState(true);
  const [editMode, setEditMode] = useState(true);
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: uid("stat"), type: "stat", statId: stats[0]?.id ?? "plays", span: 1 },
    { id: uid("stat"), type: "stat", statId: stats[1]?.id ?? stats[0]?.id ?? "plays", span: 1 },
    { id: uid("line"), type: "line", sourceId: "daily-hours", span: 2 },
    { id: uid("bar"), type: "bar", sourceId: "daily-plays", span: 1 },
    { id: uid("pie"), type: "pie", sourceId: "genre-split", span: 1 },
    { id: uid("heat"), type: "heatmap", days: 84, span: 2 },
  ]);
  const [newStatId, setNewStatId] = useState(stats[0]?.id ?? "plays");
  const draggedId = useRef<string | null>(null);

  const statMap = useMemo(() => new Map(stats.map((stat) => [stat.id, stat])), [stats]);

  const moveWidget = (fromId: string, toId: string) => {
    setWidgets((current) => {
      const next = [...current];
      const from = next.findIndex((widget) => widget.id === fromId);
      const to = next.findIndex((widget) => widget.id === toId);
      if (from < 0 || to < 0 || from === to) return current;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  return (
    <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {widgets.map((widget) => (
          <article
            key={widget.id}
            draggable={editMode}
            onDragStart={() => {
              if (!editMode) return;
              draggedId.current = widget.id;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!editMode) return;
              if (!draggedId.current) return;
              moveWidget(draggedId.current, widget.id);
              draggedId.current = null;
            }}
            className={`ui-panel p-5 ${editMode ? "cursor-grab" : "cursor-default"} ${widget.span === 2 ? "md:col-span-2" : ""}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {widget.type === "stat"
                  ? "Stat Widget"
                  : widget.type === "heatmap"
                    ? "Heatmap Widget"
                    : widget.type === "pie"
                      ? "Pie Chart Widget"
                      : `${widget.type === "line" ? "Line" : "Bar"} Chart Widget`}
              </p>
              <button
                type="button"
                onClick={() => setWidgets((current) => current.filter((item) => item.id !== widget.id))}
                className={`rounded-md border border-[var(--stroke)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] ${editMode ? "" : "hidden"}`}
              >
                Remove
              </button>
            </div>

            {widget.type === "stat" ? (
              (() => {
                const stat = statMap.get(widget.statId);
                return (
                  <>
                    <p className="text-sm text-[var(--muted)]">{stat?.label ?? "Unknown stat"}</p>
                    <p className="mt-1 text-3xl font-bold">{stat?.value ?? "-"}</p>
                  </>
                );
              })()
            ) : null}

            {widget.type === "line" || widget.type === "bar" ? (
              (() => {
                const source = lineBarSources.find((item) => item.id === widget.sourceId) ?? lineBarSources[0];
                if (!source) return <p className="text-sm text-[var(--muted)]">No source available.</p>;
                return (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      {widget.type === "line" ? (
                        <LineChart data={source.data}>
                          <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
                          <XAxis dataKey={source.xKey} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey={source.yKey} stroke="var(--accent)" strokeWidth={2} dot={false} />
                        </LineChart>
                      ) : (
                        <BarChart data={source.data}>
                          <CartesianGrid stroke="var(--stroke)" strokeDasharray="4 4" />
                          <XAxis dataKey={source.xKey} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey={source.yKey} fill="var(--accent)" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                );
              })()
            ) : null}

            {widget.type === "pie" ? (
              (() => {
                const source = pieSources.find((item) => item.id === widget.sourceId) ?? pieSources[0];
                if (!source) return <p className="text-sm text-[var(--muted)]">No source available.</p>;
                return (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={source.data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={94}>
                          {source.data.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()
            ) : null}

            {widget.type === "heatmap" ? <Heatmap timeline={timeline} days={widget.days} /> : null}
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="fixed right-4 top-1/2 z-30 -translate-y-1/2 rounded-l-xl border border-[var(--stroke)] bg-[var(--panel)] px-3 py-2 text-sm"
      >
        {menuOpen ? "Close" : "Edit"}
      </button>

      <aside className={`ui-panel h-fit p-5 xl:sticky xl:top-8 ${menuOpen ? "block" : "hidden"}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Right Menu</p>
        <h2 className="mt-1 text-xl font-bold">Dashboard Builder</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Drag and drop is enabled by default. Turn on Edit Mode to change layout, add/remove widgets, and customize graph sources.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={editMode} onChange={(event) => setEditMode(event.target.checked)} />
          Edit Mode
        </label>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Add Stat</p>
            <select
              value={newStatId}
              onChange={(event) => setNewStatId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--stroke)] bg-[var(--panel-strong)] px-2 py-2 text-sm"
            >
              {stats.map((stat) => (
                <option key={stat.id} value={stat.id}>
                  {stat.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setWidgets((current) => [...current, { id: uid("stat"), type: "stat", statId: newStatId, span: 1 }])}
              className="ui-primary-btn mt-2 w-full px-3 py-2 text-sm"
              disabled={!editMode}
            >
              Add Stat Widget
            </button>
          </div>

          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Add Graphs</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setWidgets((current) => [...current, { id: uid("line"), type: "line", sourceId: "daily-hours", span: 2 }])}
                className="ui-ghost-btn px-3 py-2 text-sm"
                disabled={!editMode}
              >
                Add Line Chart
              </button>
              <button
                type="button"
                onClick={() => setWidgets((current) => [...current, { id: uid("bar"), type: "bar", sourceId: "daily-plays", span: 1 }])}
                className="ui-ghost-btn px-3 py-2 text-sm"
                disabled={!editMode}
              >
                Add Bar Chart
              </button>
              <button
                type="button"
                onClick={() => setWidgets((current) => [...current, { id: uid("pie"), type: "pie", sourceId: "genre-split", span: 1 }])}
                className="ui-ghost-btn px-3 py-2 text-sm"
                disabled={!editMode}
              >
                Add Pie Chart
              </button>
              <button
                type="button"
                onClick={() => setWidgets((current) => [...current, { id: uid("heat"), type: "heatmap", days: 84, span: 2 }])}
                className="ui-ghost-btn px-3 py-2 text-sm"
                disabled={!editMode}
              >
                Add Heatmap
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Customize Widgets</p>
            <div className="mt-2 space-y-2">
              {widgets.map((widget, index) => (
                <div key={widget.id} className="rounded-lg border border-[var(--stroke)] bg-[var(--panel-strong)] p-2">
                  <p className="text-xs text-[var(--muted)]">#{index + 1} {widget.type.toUpperCase()}</p>
                  <select
                    value={widget.span}
                    onChange={(event) =>
                      setWidgets((current) =>
                        current.map((item) =>
                          item.id === widget.id ? { ...item, span: Number(event.target.value) as 1 | 2 } : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--panel)] px-2 py-1.5 text-xs"
                    disabled={!editMode}
                  >
                    <option value={1}>Half width (side by side)</option>
                    <option value={2}>Full width</option>
                  </select>
                  {widget.type === "stat" ? (
                    <select
                      value={widget.statId}
                      onChange={(event) =>
                        setWidgets((current) =>
                          current.map((item) => (item.id === widget.id && item.type === "stat" ? { ...item, statId: event.target.value } : item)),
                        )
                      }
                      className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--panel)] px-2 py-1.5 text-xs"
                      disabled={!editMode}
                    >
                      {stats.map((stat) => (
                        <option key={stat.id} value={stat.id}>
                          {stat.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {widget.type === "line" || widget.type === "bar" ? (
                    <select
                      value={widget.sourceId}
                      onChange={(event) =>
                        setWidgets((current) =>
                          current.map((item) =>
                            item.id === widget.id && (item.type === "line" || item.type === "bar")
                              ? { ...item, sourceId: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--panel)] px-2 py-1.5 text-xs"
                      disabled={!editMode}
                    >
                      {lineBarSources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {widget.type === "pie" ? (
                    <select
                      value={widget.sourceId}
                      onChange={(event) =>
                        setWidgets((current) =>
                          current.map((item) => (item.id === widget.id && item.type === "pie" ? { ...item, sourceId: event.target.value } : item)),
                        )
                      }
                      className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--panel)] px-2 py-1.5 text-xs"
                      disabled={!editMode}
                    >
                      {pieSources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {widget.type === "heatmap" ? (
                    <select
                      value={widget.days}
                      onChange={(event) =>
                        setWidgets((current) =>
                          current.map((item) =>
                            item.id === widget.id && item.type === "heatmap"
                              ? { ...item, days: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--panel)] px-2 py-1.5 text-xs"
                      disabled={!editMode}
                    >
                      <option value={56}>8 weeks</option>
                      <option value={84}>12 weeks</option>
                      <option value={168}>24 weeks</option>
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
