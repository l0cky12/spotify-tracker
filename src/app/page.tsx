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
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
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

  const totalSongHours = songStats.reduce((sum, item) => sum + item.totalHours, 0);
  const totalAlbumHours = albumStats.reduce((sum, item) => sum + item.totalHours, 0);
  const totalArtistHours = artistStats.reduce((sum, item) => sum + item.totalHours, 0);
  const totalGenreHours = genreStats.reduce((sum, item) => sum + item.totalHours, 0);
  const avgMinutes = analyticsEntries.length
    ? analyticsEntries.reduce((sum, entry) => sum + entry.ms_played, 0) / analyticsEntries.length / 60000
    : 0;

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />
      <AutoSync intervalMinutes={autoSyncMinutes} />

      <section className="ui-panel relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-[var(--glow-a)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-8 h-44 w-44 rounded-full bg-[var(--glow-b)] blur-3xl" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Spotify Tracker</p>
        <h1 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight sm:text-3xl">Current Played Song</h1>
        {nowPlaying ? (
          <div className="mt-3 flex items-center gap-3">
            {nowPlaying.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nowPlaying.imageUrl} alt={nowPlaying.albumName} className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-[var(--panel-strong)]" />
            )}
            <div>
              <p className="text-sm font-semibold">{nowPlaying.trackName}</p>
              <p className="text-xs text-[var(--muted)]">{nowPlaying.artistName}</p>
              <p className="text-xs text-[var(--muted)]">{nowPlaying.albumName}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 max-w-2xl text-xs text-[var(--muted)] sm:text-sm">No song is currently playing.</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--stroke)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
            Auto-sync: {autoSyncText}
          </span>
          <span className="rounded-full border border-[var(--stroke)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
            Refresh: {nowPlayingRefreshText}
          </span>
          <span className="rounded-full border border-[var(--stroke)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
            Range: {range.label}
          </span>
        </div>
      </section>
      <DashboardCustomizer
        sections={[
          { id: "sync-status", label: "Sync Status" },
          { id: "range", label: "Range Filter" },
          { id: "stats", label: "Dashboard Stats" },
          { id: "library", label: "Browse Library" },
        ]}
      />

      <div id="dashboard-sections-root" className="mt-6 space-y-6">
        <section data-section-id="sync-status" className="space-y-2">
          {syncState === "ok" ? (
            <p className="ui-soft-panel border-emerald-400/40 px-3 py-2 text-sm text-emerald-200">
              Sync completed: {syncCount ?? "0"} recent plays imported.
            </p>
          ) : null}
          {syncError === "auth-required" ? (
            <p className="ui-soft-panel border-rose-500/50 px-3 py-2 text-sm text-rose-200">
              Sync failed: connect Spotify first from Settings.
            </p>
          ) : null}
          {syncError === "sync-failed" ? (
            <p className="ui-soft-panel border-rose-500/50 px-3 py-2 text-sm text-rose-200">
              Sync failed{syncReason ? `: ${syncReason}` : "."}
            </p>
          ) : null}
        </section>

        <section data-section-id="range" className="space-y-3">
          <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Current range: {range.label}</p>
        </section>

        <section data-section-id="stats" className="ui-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Dashboard Stats</p>
              <h2 className="mt-1 text-2xl font-bold">Full listening overview</h2>
            </div>
          </div>

          <div id="dashboard-stats-grid" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
              href={songStats[0] ? `/songs/${encodeURIComponent(songStats[0].id)}?${rangeQuery}` : undefined}
            />
            <TopStatCard
              label="Top Album"
              value={albumStats[0]?.name ?? "No data"}
              sub={albumStats[0] ? formatEstimatedDuration(albumStats[0].totalHours, displayUnit) : "Import JSON"}
              href={albumStats[0] ? `/albums/${encodeURIComponent(albumStats[0].id)}?${rangeQuery}` : undefined}
            />
            <TopStatCard
              label="Top Artist"
              value={artistStats[0]?.name ?? "No data"}
              sub={artistStats[0] ? formatEstimatedDuration(artistStats[0].totalHours, displayUnit) : "Import JSON"}
              href={artistStats[0] ? `/artists/${encodeURIComponent(artistStats[0].id)}?${rangeQuery}` : undefined}
            />
            <TopStatCard
              label="Top Genre"
              value={genreStats[0]?.name ?? "No data"}
              sub={genreStats[0] ? formatEstimatedDuration(genreStats[0].totalHours, displayUnit) : "Import JSON"}
              href={genreStats[0] ? `/genres/${encodeURIComponent(genreStats[0].id)}?${rangeQuery}` : undefined}
            />
            <StatCard label={`Albums (${unitLabel})`} value={formatEstimatedDuration(totalAlbumHours, displayUnit, { hoursDecimals: 1 })} />
            <StatCard label={`Artists (${unitLabel})`} value={formatEstimatedDuration(totalArtistHours, displayUnit, { hoursDecimals: 1 })} />
            <StatCard label={`Genres (${unitLabel})`} value={formatEstimatedDuration(totalGenreHours, displayUnit, { hoursDecimals: 1 })} />
            <StatCard label="Auto Sync" value={autoSyncText} />
          </div>
        </section>

        <section data-section-id="library" className="ui-panel p-5">
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
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="dashboard-card group relative overflow-hidden rounded-2xl border border-[var(--stroke)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--panel-soft)_88%,transparent),color-mix(in_oklab,var(--panel)_82%,transparent))] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[var(--glow-a)] blur-2xl transition group-hover:scale-110" />
      <div className="relative flex items-center justify-between gap-6">
        <p className="rounded-full border border-[var(--stroke)] bg-[var(--panel-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {label}
        </p>
        <p className="text-right text-3xl font-extrabold leading-none sm:text-4xl">{value}</p>
      </div>
    </article>
  );
}

function TopStatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const card = (
    <article className="dashboard-card group relative overflow-hidden rounded-2xl border border-[var(--stroke)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--panel-soft)_88%,transparent),color-mix(in_oklab,var(--panel)_82%,transparent))] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[var(--glow-b)] blur-2xl transition group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-6">
        <p className="rounded-full border border-[var(--stroke)] bg-[var(--panel-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {label}
        </p>
        <div className="min-w-0 text-right">
          <p className="truncate text-xl font-bold">{value}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p>
        </div>
      </div>
    </article>
  );

  if (!href) return card;
  return (
    <Link href={href} className="block transition hover:brightness-110">
      {card}
    </Link>
  );
}
