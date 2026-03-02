import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import { buildCollectionStats, latestSnapshot } from "@/lib/stats";
import { readSnapshots } from "@/lib/storage";

export default async function Home() {
  const cookieStore = await cookies();
  const connected = cookieStore.has("spotify_refresh_token");

  const snapshots = await readSnapshots();
  const latest = latestSnapshot(snapshots);

  const songStats = buildCollectionStats(
    snapshots,
    (s) => s.tracks,
    (i) => i.id,
    (i) => i.name,
    (i) => i.imageUrl,
    (i) => i.artistName,
    (i) => i.rank,
    (i) => i.score,
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
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text)]">Spotify Tracker</h1>
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

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Snapshots" value={String(snapshots.length)} />
            <StatCard label="Tracked Songs" value={String(songStats.length)} />
            <StatCard label="Tracked Albums" value={String(albumStats.length)} />
            <StatCard label="Tracked Artists" value={String(artistStats.length)} />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <TopCard
              title="Top Song (current)"
              primary={latest?.tracks[0]?.name ?? "No data"}
              secondary={latest?.tracks[0]?.artistName ?? "Run Sync now"}
            />
            <TopCard
              title="Top Album (current)"
              primary={latest?.albums[0]?.name ?? "No data"}
              secondary={latest?.albums[0]?.artistName ?? "Run Sync now"}
            />
            <TopCard
              title="Top Artist (current)"
              primary={latest?.artists[0]?.name ?? "No data"}
              secondary={snapshots.length ? "From latest snapshot" : "Run Sync now"}
            />
          </section>

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
