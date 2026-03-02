import { Nav } from "@/components/Nav";
import { TrendChart } from "@/components/TrendChart";
import { buildCollectionStats } from "@/lib/stats";
import { readSnapshots } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function SongsPage() {
  const snapshots = await readSnapshots();
  const songs = buildCollectionStats(
    snapshots,
    (s) => s.tracks,
    (i) => i.id,
    (i) => i.name,
    (i) => i.imageUrl,
    (i) => i.artistName,
    (i) => i.rank,
    (i) => i.score,
  ).slice(0, 20);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <h1 className="mb-4 text-3xl font-bold">Songs</h1>
      <Nav />
      <div className="mt-6 space-y-4">
        {songs.length ? (
          songs.map((song) => (
            <article key={song.id} className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <img src={song.imageUrl} alt={song.name} className="h-16 w-16 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">#{song.currentRank} {song.name}</p>
                  <p className="text-sm text-[var(--muted)]">{song.subtitle}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Appearances: {song.appearances} • Avg score: {song.avgScore}
                  </p>
                </div>
                <div className="w-full md:w-72">
                  <TrendChart points={song.trend} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            No song data yet. Run Sync now on the dashboard.
          </article>
        )}
      </div>
    </main>
  );
}
