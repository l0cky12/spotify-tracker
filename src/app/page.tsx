import Link from "next/link";
import { cookies } from "next/headers";
import { DashboardVisuals } from "@/components/DashboardVisuals";
import { Nav } from "@/components/Nav";
import { RangeFilter } from "@/components/RangeFilter";
import { buildCollectionStats } from "@/lib/stats";
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

  const snapshots = await readSnapshots();
  const estimatedHoursPerDay = Number(process.env.ESTIMATED_LISTENING_HOURS_PER_DAY ?? "2");

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
  const filteredSnapshots = snapshots.filter((snapshot) => {
    const capturedAt = new Date(snapshot.capturedAt);
    return capturedAt >= range.start && capturedAt <= range.end;
  });
  const timeline = filteredSnapshots.map((snapshot, index) => {
    const startAt = new Date(snapshot.capturedAt);
    const nextAt = filteredSnapshots[index + 1] ? new Date(filteredSnapshots[index + 1].capturedAt) : range.end;
    const intervalHours = Math.max(0, (nextAt.getTime() - startAt.getTime()) / (1000 * 60 * 60));
    const estimatedHours = intervalHours * (safeHoursPerDay / 24);
    return {
      date: startAt.toISOString().slice(5, 10),
      hours: Number(estimatedHours.toFixed(2)),
    };
  });
  const domainSlices = [
    { name: "Songs", value: songStats.reduce((sum, item) => sum + item.totalHours, 0) },
    { name: "Albums", value: albumStats.reduce((sum, item) => sum + item.totalHours, 0) },
    { name: "Artists", value: artistStats.reduce((sum, item) => sum + item.totalHours, 0) },
    { name: "Genres", value: genreStats.reduce((sum, item) => sum + item.totalHours, 0) },
  ];
  const genreSlices = genreStats.slice(0, 6).map((item) => ({ name: item.name, value: item.totalHours }));
  const bubbles = songStats.slice(0, 18).map((item) => ({
    name: item.name,
    hours: item.totalHours,
    appearances: item.appearances,
    score: item.avgScore,
    bubble: Math.max(20, Math.round(item.totalHours * 14)),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-[var(--text)]">Spotify Tracker</h1>
          <Link
            href="/settings/theme"
            className="inline-flex rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm font-semibold hover:brightness-110"
          >
            Settings
          </Link>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Track your songs, albums, and artists over time.
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
            <StatCard label="Snapshots" value={String(snapshots.length)} />
            <StatCard
              label="Songs (hours)"
              value={`${songStats.reduce((sum, item) => sum + item.totalHours, 0).toFixed(1)}h`}
            />
            <StatCard
              label="Albums (hours)"
              value={`${albumStats.reduce((sum, item) => sum + item.totalHours, 0).toFixed(1)}h`}
            />
            <StatCard
              label="Artists (hours)"
              value={`${artistStats.reduce((sum, item) => sum + item.totalHours, 0).toFixed(1)}h`}
            />
            <StatCard
              label="Genres (hours)"
              value={`${genreStats.reduce((sum, item) => sum + item.totalHours, 0).toFixed(1)}h`}
            />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TopCard
              title="Top Song (hours)"
              primary={songStats[0]?.name ?? "No data"}
              secondary={songStats[0] ? `${songStats[0].totalHours.toFixed(2)}h` : "Run Sync now"}
            />
            <TopCard
              title="Top Album (hours)"
              primary={albumStats[0]?.name ?? "No data"}
              secondary={albumStats[0] ? `${albumStats[0].totalHours.toFixed(2)}h` : "Run Sync now"}
            />
            <TopCard
              title="Top Artist (hours)"
              primary={artistStats[0]?.name ?? "No data"}
              secondary={artistStats[0] ? `${artistStats[0].totalHours.toFixed(2)}h` : "Run Sync now"}
            />
            <TopCard
              title="Top Genre (hours)"
              primary={genreStats[0]?.name ?? "No data"}
              secondary={genreStats[0] ? `${genreStats[0].totalHours.toFixed(2)}h` : "Run Sync now"}
            />
          </section>
          <DashboardVisuals
            domainSlices={domainSlices}
            genreSlices={genreSlices}
            bubbles={bubbles}
            timeline={timeline}
          />

          <section className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
            <h2 className="text-lg font-semibold">Drill down</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/songs"
                className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
              >
                Songs page
              </Link>
              <Link
                href="/albums"
                className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
              >
                Albums page
              </Link>
              <Link
                href="/artists"
                className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
              >
                Artists page
              </Link>
              <Link
                href="/genres"
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
