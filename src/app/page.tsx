import Link from "next/link";
import { cookies } from "next/headers";
import { DashboardVisuals } from "@/components/DashboardVisuals";
import { Nav } from "@/components/Nav";
import { AutoSync } from "@/components/AutoSync";
import { NowPlayingCard } from "@/components/NowPlayingCard";
import {
  convertHoursForDisplay,
  DISPLAY_UNIT_COOKIE,
  displayUnitLabel,
  displayUnitSuffix,
  formatEstimatedDuration,
  parseDisplayUnit,
} from "@/lib/display-unit";
import { RangeFilter } from "@/components/RangeFilter";
import { buildCollectionStats, entriesInRange } from "@/lib/stats";
import { readHistoryEntries } from "@/lib/storage";
import { resolveTimeRange } from "@/lib/time-range";
import {
  AUTO_SYNC_INTERVAL_COOKIE,
  autoSyncLabel,
  NOW_PLAYING_REFRESH_COOKIE,
  nowPlayingRefreshLabel,
  parseAutoSyncInterval,
  parseNowPlayingRefreshSeconds,
} from "@/lib/auto-sync";
import { fetchCurrentlyPlaying, refreshAccessToken } from "@/lib/spotify";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildTimeline(entries: Awaited<ReturnType<typeof readHistoryEntries>>, toDisplay: (hours: number) => number) {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.ts.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + entry.ms_played);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, ms]) => ({
      date: day.slice(5),
      value: Number(toDisplay(ms / 3600000).toFixed(2)),
    }));
}

export default async function Home({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const syncState = firstParam(params.sync);
  const syncCount = firstParam(params.syncCount) ?? firstParam(params.count);
  const syncError = firstParam(params.error);
  const syncReason = firstParam(params.reason);
  const range = resolveTimeRange({
    range: firstParam(params.range),
    from: firstParam(params.from),
    to: firstParam(params.to),
  });

  const cookieStore = await cookies();
  const displayUnit = parseDisplayUnit(cookieStore.get(DISPLAY_UNIT_COOKIE)?.value);
  const autoSyncMinutes = parseAutoSyncInterval(cookieStore.get(AUTO_SYNC_INTERVAL_COOKIE)?.value);
  const nowPlayingRefreshSeconds = parseNowPlayingRefreshSeconds(cookieStore.get(NOW_PLAYING_REFRESH_COOKIE)?.value);
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
  const unitLabel = displayUnitLabel(displayUnit);
  const unitSuffix = displayUnitSuffix(displayUnit);
  const toDisplay = (hours: number) => convertHoursForDisplay(hours, displayUnit);
  const autoSyncText = autoSyncLabel(autoSyncMinutes);
  const nowPlayingRefreshText = nowPlayingRefreshLabel(nowPlayingRefreshSeconds);

  let nowPlaying: Awaited<ReturnType<typeof fetchCurrentlyPlaying>> = null;
  if (refreshToken) {
    try {
      const accessToken = await refreshAccessToken(refreshToken);
      nowPlaying = await fetchCurrentlyPlaying(accessToken);
    } catch {
      nowPlaying = null;
    }
  }

  const allEntries = await readHistoryEntries();
  const filteredEntries = entriesInRange(allEntries, range);
  const analyticsEntries = filteredEntries.filter((entry) => entry.ms_played >= 30_000);

  const songStats = buildCollectionStats(allEntries, "songs", range);
  const albumStats = buildCollectionStats(allEntries, "albums", range);
  const artistStats = buildCollectionStats(allEntries, "artists", range);
  const genreStats = buildCollectionStats(allEntries, "genres", range);

  const query = new URLSearchParams();
  query.set("range", range.preset);
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const rangeQuery = query.toString();

  const domainSlices = [
    { name: "Songs", value: toDisplay(songStats.reduce((sum, item) => sum + item.totalHours, 0)) },
    { name: "Albums", value: toDisplay(albumStats.reduce((sum, item) => sum + item.totalHours, 0)) },
    { name: "Artists", value: toDisplay(artistStats.reduce((sum, item) => sum + item.totalHours, 0)) },
    { name: "Genres", value: toDisplay(genreStats.reduce((sum, item) => sum + item.totalHours, 0)) },
  ];

  const genreSlices = genreStats.slice(0, 6).map((item) => ({ name: item.name, value: toDisplay(item.totalHours) }));
  const timeline = buildTimeline(analyticsEntries, toDisplay);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <Nav />
      <AutoSync intervalMinutes={autoSyncMinutes} />

      <header className="ui-panel mb-6 p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text)] sm:text-4xl">Spotify Tracker</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Import your Spotify JSON history and explore songs, albums, artists, and genres by listening time.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/settings/theme"
            className="ui-primary-btn px-4 py-2 text-sm"
          >
            Settings
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className="ui-soft-panel px-2 py-1">Auto-sync: {autoSyncText}</span>
          <span className="ui-soft-panel px-2 py-1">Now Playing refresh: {nowPlayingRefreshText}</span>
        </div>
      </header>

      {syncState === "ok" ? (
        <p className="ui-soft-panel mt-4 px-3 py-2 text-sm text-sky-200">
          Sync completed: {syncCount ?? "0"} recent plays imported.
        </p>
      ) : null}
      {syncError === "auth-required" ? (
        <p className="ui-soft-panel mt-4 border-rose-500/50 px-3 py-2 text-sm text-rose-200">
          Sync failed: connect Spotify first from Settings.
        </p>
      ) : null}
      {syncError === "sync-failed" ? (
        <p className="ui-soft-panel mt-4 border-rose-500/50 px-3 py-2 text-sm text-rose-200">
          Sync failed{syncReason ? `: ${syncReason}` : "."}
        </p>
      ) : null}

      <NowPlayingCard initialNowPlaying={nowPlaying} refreshSeconds={nowPlayingRefreshSeconds} />

      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">Range: {range.label}</p>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Plays" value={String(analyticsEntries.length)} />
        <StatCard
          label={`Songs (${unitLabel})`}
          value={formatEstimatedDuration(songStats.reduce((sum, item) => sum + item.totalHours, 0), displayUnit, {
            hoursDecimals: 1,
          })}
        />
        <StatCard
          label={`Albums (${unitLabel})`}
          value={formatEstimatedDuration(albumStats.reduce((sum, item) => sum + item.totalHours, 0), displayUnit, {
            hoursDecimals: 1,
          })}
        />
        <StatCard
          label={`Artists (${unitLabel})`}
          value={formatEstimatedDuration(artistStats.reduce((sum, item) => sum + item.totalHours, 0), displayUnit, {
            hoursDecimals: 1,
          })}
        />
        <StatCard
          label={`Genres (${unitLabel})`}
          value={formatEstimatedDuration(genreStats.reduce((sum, item) => sum + item.totalHours, 0), displayUnit, {
            hoursDecimals: 1,
          })}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TopCard
          title={`Top Song (${unitLabel})`}
          primary={songStats[0]?.name ?? "No data"}
          secondary={songStats[0] ? formatEstimatedDuration(songStats[0].totalHours, displayUnit) : "Import JSON"}
        />
        <TopCard
          title={`Top Album (${unitLabel})`}
          primary={albumStats[0]?.name ?? "No data"}
          secondary={albumStats[0] ? formatEstimatedDuration(albumStats[0].totalHours, displayUnit) : "Import JSON"}
        />
        <TopCard
          title={`Top Artist (${unitLabel})`}
          primary={artistStats[0]?.name ?? "No data"}
          secondary={artistStats[0] ? formatEstimatedDuration(artistStats[0].totalHours, displayUnit) : "Import JSON"}
        />
        <TopCard
          title={`Top Genre (${unitLabel})`}
          primary={genreStats[0]?.name ?? "No data"}
          secondary={genreStats[0] ? formatEstimatedDuration(genreStats[0].totalHours, displayUnit) : "Import JSON"}
        />
      </section>

      <DashboardVisuals
        unitLabel={unitLabel}
        unitSuffix={unitSuffix}
        domainSlices={domainSlices}
        genreSlices={genreSlices}
        timeline={timeline}
      />

      <section className="ui-panel mt-8 p-5">
        <h2 className="text-lg font-semibold">Drill down</h2>
        {!analyticsEntries.length && allEntries.length > 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            No listening history found in this range. Try widening the date range or selecting All time.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/songs?${rangeQuery}`}
            className="ui-ghost-btn px-3 py-2 text-sm"
          >
            Songs page
          </Link>
          <Link
            href={`/albums?${rangeQuery}`}
            className="ui-ghost-btn px-3 py-2 text-sm"
          >
            Albums page
          </Link>
          <Link
            href={`/artists?${rangeQuery}`}
            className="ui-ghost-btn px-3 py-2 text-sm"
          >
            Artists page
          </Link>
          <Link
            href={`/genres?${rangeQuery}`}
            className="ui-ghost-btn px-3 py-2 text-sm"
          >
            Genres page
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-panel p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}

function TopCard({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <article className="ui-panel p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <p className="mt-3 text-lg font-semibold">{primary}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{secondary}</p>
    </article>
  );
}
