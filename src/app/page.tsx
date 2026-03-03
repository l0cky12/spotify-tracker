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

  const totalSongHours = songStats.reduce((sum, item) => sum + item.totalHours, 0);
  const topSongs = songStats.slice(0, 5);
  const maxTopSong = topSongs[0]?.totalHours ?? 1;

  return (
    <main className="mx-auto max-w-[1300px] px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pt-8">
      <Nav />
      <AutoSync intervalMinutes={autoSyncMinutes} />

      <section className="ui-panel relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-[var(--glow-a)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-8 h-44 w-44 rounded-full bg-[var(--glow-b)] blur-3xl" />

        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Spotify Tracker</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
          Your listening habits, rebuilt like a streaming home page.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Focus on what you played most, watch the timeline evolve, and jump into songs, albums, artists, or genres.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-1 text-xs text-[var(--muted)]">
            Auto-sync: {autoSyncText}
          </span>
          <span className="rounded-full border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-1 text-xs text-[var(--muted)]">
            Refresh: {nowPlayingRefreshText}
          </span>
          <span className="rounded-full border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-1 text-xs text-[var(--muted)]">
            Range: {range.label}
          </span>
        </div>
      </section>

      {syncState === "ok" ? (
        <p className="ui-soft-panel mt-4 border-emerald-400/40 px-3 py-2 text-sm text-emerald-200">
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

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="ui-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Top Songs</p>
              <h2 className="mt-1 text-xl font-bold">Your Current Heavy Rotation</h2>
            </div>
            <Link href={`/songs?${rangeQuery}`} className="ui-ghost-btn px-4 py-2 text-sm">
              Open Songs
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {topSongs.length ? (
              topSongs.map((song) => (
                <article key={song.id} className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold">
                      #{song.currentRank} {song.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{formatEstimatedDuration(song.totalHours, displayUnit)}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">{song.subtitle}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--panel-strong)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.max(8, (song.totalHours / maxTopSong) * 100)}%` }}
                    />
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No song data yet. Import Spotify JSON in Settings.</p>
            )}
          </div>
        </div>

        <NowPlayingCard initialNowPlaying={nowPlaying} refreshSeconds={nowPlayingRefreshSeconds} />
      </section>

      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Current range: {range.label}</p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plays" value={String(analyticsEntries.length)} />
        <StatCard label={`Listening (${unitLabel})`} value={formatEstimatedDuration(totalSongHours, displayUnit, { hoursDecimals: 1 })} />
        <StatCard label="Unique Artists" value={String(artistStats.length)} />
        <StatCard label="Unique Genres" value={String(genreStats.length)} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HighlightCard
          title="Top Album"
          primary={albumStats[0]?.name ?? "No data"}
          secondary={albumStats[0] ? formatEstimatedDuration(albumStats[0].totalHours, displayUnit) : "Import JSON"}
          href={`/albums?${rangeQuery}`}
        />
        <HighlightCard
          title="Top Artist"
          primary={artistStats[0]?.name ?? "No data"}
          secondary={artistStats[0] ? formatEstimatedDuration(artistStats[0].totalHours, displayUnit) : "Import JSON"}
          href={`/artists?${rangeQuery}`}
        />
        <HighlightCard
          title="Top Genre"
          primary={genreStats[0]?.name ?? "No data"}
          secondary={genreStats[0] ? formatEstimatedDuration(genreStats[0].totalHours, displayUnit) : "Import JSON"}
          href={`/genres?${rangeQuery}`}
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
        <h2 className="text-xl font-bold">Browse your library</h2>
        {!analyticsEntries.length && allEntries.length > 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            No listening history found in this range. Try widening the date range or selecting All time.
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href={`/songs?${rangeQuery}`} className="ui-ghost-btn px-4 py-3 text-center text-sm">
            Songs
          </Link>
          <Link href={`/albums?${rangeQuery}`} className="ui-ghost-btn px-4 py-3 text-center text-sm">
            Albums
          </Link>
          <Link href={`/artists?${rangeQuery}`} className="ui-ghost-btn px-4 py-3 text-center text-sm">
            Artists
          </Link>
          <Link href={`/genres?${rangeQuery}`} className="ui-ghost-btn px-4 py-3 text-center text-sm">
            Genres
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-panel p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold leading-none">{value}</p>
    </article>
  );
}

function HighlightCard({
  title,
  primary,
  secondary,
  href,
}: {
  title: string;
  primary: string;
  secondary: string;
  href: string;
}) {
  return (
    <Link href={href} className="ui-panel block p-5 transition hover:brightness-110">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{title}</p>
      <p className="mt-3 line-clamp-2 text-lg font-bold">{primary}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{secondary}</p>
    </Link>
  );
}
