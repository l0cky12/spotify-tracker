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

export default async function ArtistsPage({ searchParams }: PageProps) {
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
  const artists = buildCollectionStats(entries, "artists", range).slice(0, 50);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <h1 className="mb-4 text-3xl font-bold">Artists</h1>
      <Nav />
      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">Range: {range.label}</p>
      <div className="mt-6 space-y-4">
        {artists.length ? (
          artists.map((artist) => (
            <article key={artist.id} className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/artists/${encodeURIComponent(artist.id)}?${rangeQuery}`}
                    className="truncate text-lg font-semibold hover:text-[var(--accent)] hover:underline"
                  >
                    #{artist.currentRank} {artist.name}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    Listened: {formatEstimatedDuration(artist.totalHours, displayUnit)} • Plays: {artist.playCount} • Avg length: {artist.avgMinutes.toFixed(1)}m
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
            No artist data yet. Import Spotify JSON in Settings.
          </article>
        )}
      </div>
    </main>
  );
}
