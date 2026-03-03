import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import { AutoSync } from "@/components/AutoSync";
import {
  DISPLAY_UNIT_COOKIE,
  displayUnitLabel,
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

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
  const unitLabel = displayUnitLabel(displayUnit);
  const autoSyncText = autoSyncLabel(autoSyncMinutes);
  const nowPlayingRefreshText = nowPlayingRefreshLabel(nowPlayingRefreshSeconds);

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

  const totalSongHours = songStats.reduce((sum, item) => sum + item.totalHours, 0);
  const totalAlbumHours = albumStats.reduce((sum, item) => sum + item.totalHours, 0);
  const totalArtistHours = artistStats.reduce((sum, item) => sum + item.totalHours, 0);
  const totalGenreHours = genreStats.reduce((sum, item) => sum + item.totalHours, 0);
  const avgMinutes = analyticsEntries.length
    ? analyticsEntries.reduce((sum, entry) => sum + entry.ms_played, 0) / analyticsEntries.length / 60000
    : 0;

  return (
    <main className="mx-auto max-w-[1300px] px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pt-8">
      <Nav />
      <AutoSync intervalMinutes={autoSyncMinutes} />

      <section className="ui-panel relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-[var(--glow-a)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-8 h-44 w-44 rounded-full bg-[var(--glow-b)] blur-3xl" />

        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Spotify Tracker</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">Your listening stats dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          One place to view total plays, listening time, top items, and collection size across songs, albums, artists, and genres.
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

      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Current range: {range.label}</p>

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

      <section className="ui-panel mt-6 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Dashboard Stats</p>
            <h2 className="mt-1 text-2xl font-bold">Full listening overview</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <StatCard label="Plays" value={String(analyticsEntries.length)} />
          <StatCard
            label={`Listening (${unitLabel})`}
            value={formatEstimatedDuration(totalSongHours, displayUnit, { hoursDecimals: 1 })}
          />
          <StatCard label="Avg Play Length" value={`${avgMinutes.toFixed(1)}m`} />
          <StatCard label="Unique Songs" value={String(songStats.length)} />
          <StatCard label="Unique Albums" value={String(albumStats.length)} />
          <StatCard label="Unique Artists" value={String(artistStats.length)} />
          <StatCard label="Unique Genres" value={String(genreStats.length)} />
          <StatCard label="Song Time Share" value={formatEstimatedDuration(totalSongHours, displayUnit, { hoursDecimals: 1 })} />
          <TopStatCard
            label="Top Song"
            value={songStats[0]?.name ?? "No data"}
            sub={songStats[0] ? formatEstimatedDuration(songStats[0].totalHours, displayUnit) : "Import JSON"}
          />
          <TopStatCard
            label="Top Album"
            value={albumStats[0]?.name ?? "No data"}
            sub={albumStats[0] ? formatEstimatedDuration(albumStats[0].totalHours, displayUnit) : "Import JSON"}
          />
          <TopStatCard
            label="Top Artist"
            value={artistStats[0]?.name ?? "No data"}
            sub={artistStats[0] ? formatEstimatedDuration(artistStats[0].totalHours, displayUnit) : "Import JSON"}
          />
          <TopStatCard
            label="Top Genre"
            value={genreStats[0]?.name ?? "No data"}
            sub={genreStats[0] ? formatEstimatedDuration(genreStats[0].totalHours, displayUnit) : "Import JSON"}
          />
          <StatCard label={`Albums (${unitLabel})`} value={formatEstimatedDuration(totalAlbumHours, displayUnit, { hoursDecimals: 1 })} />
          <StatCard label={`Artists (${unitLabel})`} value={formatEstimatedDuration(totalArtistHours, displayUnit, { hoursDecimals: 1 })} />
          <StatCard label={`Genres (${unitLabel})`} value={formatEstimatedDuration(totalGenreHours, displayUnit, { hoursDecimals: 1 })} />
          <StatCard label="Auto Sync" value={autoSyncText} />
        </div>
      </section>

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
    <article className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
        <p className="text-right text-3xl font-extrabold leading-none">{value}</p>
      </div>
    </article>
  );
}

function TopStatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
        <div className="min-w-0 text-right">
          <p className="truncate text-lg font-bold">{value}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p>
        </div>
      </div>
    </article>
  );
}
