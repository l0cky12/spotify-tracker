import { Nav } from "@/components/Nav";
import { TrendChart } from "@/components/TrendChart";
import { buildCollectionStats } from "@/lib/stats";
import { readSnapshots } from "@/lib/storage";

export default async function ArtistsPage() {
  const snapshots = await readSnapshots();
  const artists = buildCollectionStats(
    snapshots,
    (s) => s.artists,
    (i) => i.id,
    (i) => i.name,
    (i) => i.imageUrl,
    () => undefined,
    (i) => i.rank,
    (i) => i.score,
  ).slice(0, 20);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <h1 className="mb-4 text-3xl font-bold">Artists</h1>
      <Nav />
      <div className="mt-6 space-y-4">
        {artists.map((artist) => (
          <article key={artist.id} className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <img src={artist.imageUrl} alt={artist.name} className="h-16 w-16 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">#{artist.currentRank} {artist.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  Appearances: {artist.appearances} • Avg score: {artist.avgScore}
                </p>
              </div>
              <div className="w-full md:w-72">
                <TrendChart points={artist.trend} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
