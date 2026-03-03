import { cookies } from "next/headers";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { RangeFilter } from "@/components/RangeFilter";
import { TrendChart } from "@/components/TrendChart";
import { DISPLAY_UNIT_COOKIE, formatEstimatedDuration, parseDisplayUnit } from "@/lib/display-unit";
import { buildCollectionStats } from "@/lib/stats";
import { readHistoryEntries } from "@/lib/storage";
import { resolveTimeRange } from "@/lib/time-range";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlbumsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const displayUnit = parseDisplayUnit(cookieStore.get(DISPLAY_UNIT_COOKIE)?.value);
  const params = (await searchParams) ?? {};
  const range = resolveTimeRange({
    range: firstParam(params.range),
    from: firstParam(params.from),
    to: firstParam(params.to),
  });
  const query = new URLSearchParams();
  query.set("range", range.preset);
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const rangeQuery = query.toString();

  const entries = await readHistoryEntries();
  const albums = buildCollectionStats(entries, "albums", range).slice(0, 50);

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />
      <header className="ui-panel mb-4 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Library</p>
        <h1 className="mt-2 text-3xl font-bold">Albums</h1>
      </header>
      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">Range: {range.label}</p>
      <div className="mt-6 space-y-4">
        {albums.length ? (
          albums.map((album) => (
            <article key={album.id} className="ui-panel p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/albums/${encodeURIComponent(album.id)}?${rangeQuery}`}
                    className="truncate text-lg font-semibold hover:text-[var(--accent)]"
                  >
                    #{album.currentRank} {album.name}
                  </Link>
                  <p className="text-sm text-[var(--muted)]">{album.subtitle}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Listened: {formatEstimatedDuration(album.totalHours, displayUnit)} • Plays: {album.playCount} • Avg length: {album.avgMinutes.toFixed(1)}m
                  </p>
                </div>
                <div className="w-full md:w-72">
                  <TrendChart points={album.trend} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="ui-panel p-4 text-sm text-[var(--muted)]">
            No album data yet. Import Spotify JSON in Settings.
          </article>
        )}
      </div>
    </main>
  );
}
