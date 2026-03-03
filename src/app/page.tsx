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
import { fetchCurrentlyPlaying, refreshAccessToken } from "@/lib/spotify";
import { buildHomeInsights } from "@/lib/home-insights";
import { HomeDashboardBuilder } from "@/components/HomeDashboardBuilder";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildDailyTimeline(entries: Awaited<ReturnType<typeof readHistoryEntries>>) {
  const byDay = new Map<string, { ms: number; plays: number }>();
  for (const entry of entries) {
    const key = entry.ts.slice(0, 10);
    const current = byDay.get(key) ?? { ms: 0, plays: 0 };
    current.ms += entry.ms_played;
    current.plays += 1;
    byDay.set(key, current);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date: date.slice(5), hours: Number((value.ms / 3600000).toFixed(2)), plays: value.plays }));
}

function buildMonthlyTimeline(entries: Awaited<ReturnType<typeof readHistoryEntries>>) {
  const byMonth = new Map<string, { ms: number; plays: number }>();
  for (const entry of entries) {
    const key = entry.ts.slice(0, 7);
    const current = byMonth.get(key) ?? { ms: 0, plays: 0 };
    current.ms += entry.ms_played;
    current.plays += 1;
    byMonth.set(key, current);
  }
  return Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({ month, hours: Number((value.ms / 3600000).toFixed(1)), plays: value.plays }));
}

function buildArtistRankTimeline(entries: Awaited<ReturnType<typeof readHistoryEntries>>, topArtists: string[]) {
  const dayArtistMs = new Map<string, Map<string, number>>();
  for (const entry of entries) {
    const artist = (entry.master_metadata_album_artist_name ?? "").trim() || "Unknown artist";
    const day = entry.ts.slice(0, 10);
    if (!dayArtistMs.has(day)) dayArtistMs.set(day, new Map());
    const artistMap = dayArtistMs.get(day)!;
    artistMap.set(artist, (artistMap.get(artist) ?? 0) + entry.ms_played);
  }

  return Array.from(dayArtistMs.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, artistMap]): { date: string; [key: string]: string | number | null } => {
      const ranked = Array.from(artistMap.entries()).sort((a, b) => b[1] - a[1]).map(([artist]) => artist);
      const row: { date: string; [key: string]: string | number | null } = { date: day.slice(5) };
      for (const artist of topArtists) {
        const rank = ranked.indexOf(artist);
        row[artist] = rank >= 0 ? rank + 1 : null;
      }
      return row;
    });
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

  const dailyTimeline = buildDailyTimeline(analyticsEntries);
  const monthlyTimeline = buildMonthlyTimeline(analyticsEntries);
  const topArtistNames = artistStats.slice(0, 4).map((artist) => artist.name);
  const artistRankTimeline = buildArtistRankTimeline(analyticsEntries, topArtistNames);
  const genreSplit = genreStats.slice(0, 8).map((genre) => ({ name: genre.name, hours: Number(genre.totalHours.toFixed(2)) }));
  const homeInsights = buildHomeInsights(analyticsEntries, allEntries);

  const stats = [
    { id: "plays", label: "Plays", value: String(analyticsEntries.length) },
    { id: "listening", label: `Listening (${unitLabel})`, value: formatEstimatedDuration(totalSongHours, displayUnit, { hoursDecimals: 1 }) },
    { id: "avg", label: "Avg Play Length", value: `${avgMinutes.toFixed(1)}m` },
    { id: "songs", label: "Unique Songs", value: String(songStats.length) },
    { id: "albums", label: "Unique Albums", value: String(albumStats.length) },
    { id: "artists", label: "Unique Artists", value: String(artistStats.length) },
    { id: "genres", label: "Unique Genres", value: String(genreStats.length) },
    { id: "album-time", label: `Albums (${unitLabel})`, value: formatEstimatedDuration(totalAlbumHours, displayUnit, { hoursDecimals: 1 }) },
    { id: "artist-time", label: `Artists (${unitLabel})`, value: formatEstimatedDuration(totalArtistHours, displayUnit, { hoursDecimals: 1 }) },
    { id: "genre-time", label: `Genres (${unitLabel})`, value: formatEstimatedDuration(totalGenreHours, displayUnit, { hoursDecimals: 1 }) },
    { id: "autosync", label: "Auto Sync", value: autoSyncText },
  ];

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

      <HomeDashboardBuilder
        stats={stats}
        timeline={dailyTimeline}
        genres={genreSplit}
        monthly={monthlyTimeline}
        artistRanks={artistRankTimeline}
        insights={homeInsights}
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
