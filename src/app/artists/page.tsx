import { Nav } from "@/components/Nav";
import { RangeFilter } from "@/components/RangeFilter";
import { TrendChart } from "@/components/TrendChart";
import { buildCollectionStats } from "@/lib/stats";
import { readSnapshots } from "@/lib/storage";
import { resolveTimeRange } from "@/lib/time-range";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const range = resolveTimeRange({
    range: firstParam(params.range),
    from: firstParam(params.from),
    to: firstParam(params.to),
  });

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
    { range },
  ).slice(0, 20);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <h1 className="mb-4 text-3xl font-bold">Artists</h1>
      <Nav />
      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">
        Range: {range.label}
      </p>
      <div className="mt-6 space-y-4">
        {artists.length ? (
          artists.map((artist) => (
            <article key={artist.id} className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <img src={artist.imageUrl} alt={artist.name} className="h-16 w-16 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">#{artist.currentRank} {artist.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Estimated listened: {artist.totalHours.toFixed(2)}h • Appearances: {artist.appearances} • Avg score: {artist.avgScore}
                  </p>
                </div>
                <div className="w-full md:w-72">
                  <TrendChart points={artist.trend} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            No artist data yet. Run Sync now on the dashboard.
          </article>
        )}
      </div>
    </main>
  );
}
