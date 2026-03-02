import { Nav } from "@/components/Nav";
import { TrendChart } from "@/components/TrendChart";
import { buildCollectionStats } from "@/lib/stats";
import { readSnapshots } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function GenresPage() {
  const snapshots = await readSnapshots();
  const genres = buildCollectionStats(
    snapshots,
    (s) => s.genres ?? [],
    (i) => i.id,
    (i) => i.name,
    () => "",
    () => undefined,
    (i) => i.rank,
    (i) => i.score,
  ).slice(0, 30);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <h1 className="mb-4 text-3xl font-bold">Genres</h1>
      <Nav />
      <div className="mt-6 space-y-4">
        {genres.length ? (
          genres.map((genre) => (
            <article key={genre.id} className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--panel-soft)] text-2xl font-bold text-[var(--accent)]">
                  #
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">#{genre.currentRank} {genre.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Appearances: {genre.appearances} • Avg score: {genre.avgScore}
                  </p>
                </div>
                <div className="w-full md:w-72">
                  <TrendChart points={genre.trend} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            No genre data yet. Run Sync now to capture your top artist genres.
          </article>
        )}
      </div>
    </main>
  );
}
