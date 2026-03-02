import Link from "next/link";
import { cookies } from "next/headers";
import { DashboardVisuals } from "@/components/DashboardVisuals";
import { Nav } from "@/components/Nav";
import {
  convertHoursForDisplay,
  DISPLAY_UNIT_COOKIE,
  displayUnitLabel,
  displayUnitSuffix,
  formatEstimatedDuration,
  parseDisplayUnit,
} from "@/lib/display-unit";
import { RangeFilter } from "@/components/RangeFilter";
import { buildCollectionStats, snapshotsInRange } from "@/lib/stats";
import { fetchCurrentlyPlaying, refreshAccessToken } from "@/lib/spotify";
import { readSnapshots } from "@/lib/storage";
import { resolveTimeRange } from "@/lib/time-range";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const errorParam = firstParam(params.error);
  const reasonParam = firstParam(params.reason);
  const syncedParam = firstParam(params.synced);
  const range = resolveTimeRange({
    range: firstParam(params.range),
    from: firstParam(params.from),
    to: firstParam(params.to),
  });

  const cookieStore = await cookies();
  const connected = cookieStore.has("spotify_refresh_token");
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
  const displayUnit = parseDisplayUnit(cookieStore.get(DISPLAY_UNIT_COOKIE)?.value);
  const unitLabel = displayUnitLabel(displayUnit);
  const unitSuffix = displayUnitSuffix(displayUnit);
  const toDisplay = (hours: number) => convertHoursForDisplay(hours, displayUnit);

  let currentlyPlaying: Awaited<ReturnType<typeof fetchCurrentlyPlaying>> = null;
  if (connected && refreshToken) {
    try {
      const accessToken = await refreshAccessToken(refreshToken);
      currentlyPlaying = await fetchCurrentlyPlaying(accessToken);
    } catch (error) {
      console.error("Failed to fetch currently playing track", error);
    }
  }

  const snapshots = await readSnapshots();
  const filteredSnapshots = snapshotsInRange(snapshots, range);
  const estimatedHoursPerDay = Number(process.env.ESTIMATED_LISTENING_HOURS_PER_DAY ?? "2");
  const query = new URLSearchParams();
  query.set("range", range.preset);
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const rangeQuery = query.toString();

  const songStats = buildCollectionStats(
    snapshots,
    (s) => s.tracks,
    (i) => i.id,
    (i) => i.name,
    (i) => i.imageUrl,
    (i) => i.artistName,
    (i) => i.rank,
    (i) => i.score,
    { range },
  );
  const albumStats = buildCollectionStats(
    snapshots,
    (s) => s.albums,
    (i) => i.id,
    (i) => i.name,
    (i) => i.imageUrl,
    (i) => i.artistName,
    (i) => i.rank,
    (i) => i.score,
    { range },
  );
  const artistStats = buildCollectionStats(
    snapshots,
    (s) => s.artists,
    (i) => i.id,
    (i) => i.name,
    (i) => i.imageUrl,
    () => undefined,
    (i) => i.rank,
    (i) => i.score,
    { range },
  );
  const genreStats = buildCollectionStats(
    snapshots,
    (s) => s.genres ?? [],
    (i) => i.id,
    (i) => i.name,
    () => "",
    () => undefined,
    (i) => i.rank,
    (i) => i.score,
    { range },
  );
  const safeHoursPerDay = Number.isFinite(estimatedHoursPerDay) && estimatedHoursPerDay > 0 ? estimatedHoursPerDay : 2;
  const timeline = filteredSnapshots.map((snapshot, index) => {
    const startAt = new Date(snapshot.capturedAt);
    const nextAt = filteredSnapshots[index + 1] ? new Date(filteredSnapshots[index + 1].capturedAt) : range.end;
    const intervalHours = Math.max(0, (nextAt.getTime() - startAt.getTime()) / (1000 * 60 * 60));
    const estimatedHours = intervalHours * (safeHoursPerDay / 24);
    return {
      date: startAt.toISOString().slice(5, 10),
      value: Number(toDisplay(estimatedHours).toFixed(2)),
    };
  });
  const domainSlices = [
    { name: "Songs", value: toDisplay(songStats.reduce((sum, item) => sum + item.totalHours, 0)) },
    { name: "Albums", value: toDisplay(albumStats.reduce((sum, item) => sum + item.totalHours, 0)) },
    { name: "Artists", value: toDisplay(artistStats.reduce((sum, item) => sum + item.totalHours, 0)) },
    { name: "Genres", value: toDisplay(genreStats.reduce((sum, item) => sum + item.totalHours, 0)) },
  ];
  const genreSlices = genreStats.slice(0, 6).map((item) => ({ name: item.name, value: toDisplay(item.totalHours) }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <header className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)]/90 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-[var(--text)]">Spotify Tracker</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Track your songs, albums, and artists with sync or JSON import.
        </p>
      </header>

      {!connected ? (
        <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <p className="mb-4 text-sm text-[var(--muted)]">
            Connect your Spotify account to start collecting snapshots.
          </p>
          <a
            href="/api/auth/login"
            className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-ink)] hover:brightness-110"
          >
            Connect Spotify
          </a>
        </section>
      ) : (
        <>
          <Nav />
          <section className="mt-4 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Now Playing</p>
            {currentlyPlaying ? (
              <div className="mt-3 flex items-center gap-3">
                {currentlyPlaying.imageUrl ? (
                  <img src={currentlyPlaying.imageUrl} alt={currentlyPlaying.albumName} className="h-14 w-14 rounded-md object-cover" />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{currentlyPlaying.trackName}</p>
                  <p className="truncate text-sm text-[var(--muted)]">{currentlyPlaying.artistName}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {currentlyPlaying.isPlaying ? "Playing now" : "Paused"} • {currentlyPlaying.albumName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">Nothing currently playing or playback is private.</p>
            )}
          </section>
          {syncedParam === "1" ? (
            <p className="mt-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Sync completed.
            </p>
          ) : null}
          {errorParam ? (
            <p className="mt-4 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {errorParam === "reconnect"
                ? "Spotify connection expired. Please connect Spotify again."
                : `Sync failed${reasonParam ? `: ${reasonParam}` : "."}`}
            </p>
          ) : null}
          <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
          <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">
            Range: {range.label}
          </p>

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <StatCard label="Data Points" value={String(filteredSnapshots.length)} />
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

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TopCard
              title={`Top Song (${unitLabel})`}
              primary={songStats[0]?.name ?? "No data"}
              secondary={songStats[0] ? formatEstimatedDuration(songStats[0].totalHours, displayUnit) : "Run Sync now"}
            />
            <TopCard
              title={`Top Album (${unitLabel})`}
              primary={albumStats[0]?.name ?? "No data"}
              secondary={albumStats[0] ? formatEstimatedDuration(albumStats[0].totalHours, displayUnit) : "Run Sync now"}
            />
            <TopCard
              title={`Top Artist (${unitLabel})`}
              primary={artistStats[0]?.name ?? "No data"}
              secondary={artistStats[0] ? formatEstimatedDuration(artistStats[0].totalHours, displayUnit) : "Run Sync now"}
            />
            <TopCard
              title={`Top Genre (${unitLabel})`}
              primary={genreStats[0]?.name ?? "No data"}
              secondary={genreStats[0] ? formatEstimatedDuration(genreStats[0].totalHours, displayUnit) : "Run Sync now"}
            />
          </section>
          <DashboardVisuals
            unitLabel={unitLabel}
            unitSuffix={unitSuffix}
            domainSlices={domainSlices}
            genreSlices={genreSlices}
            timeline={timeline}
          />

          <section className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
            <h2 className="text-lg font-semibold">Drill down</h2>
            {!filteredSnapshots.length && snapshots.length > 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                No synced/imported data found in this range. Try widening the date range or selecting All time.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/songs?${rangeQuery}`}
                className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
              >
                Songs page
              </Link>
              <Link
                href={`/albums?${rangeQuery}`}
                className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
              >
                Albums page
              </Link>
              <Link
                href={`/artists?${rangeQuery}`}
                className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
              >
                Artists page
              </Link>
              <Link
                href={`/genres?${rangeQuery}`}
                className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
              >
                Genres page
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
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
    <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <p className="mt-3 text-lg font-semibold">{primary}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{secondary}</p>
    </article>
  );
}
