import { cookies } from "next/headers";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { RangeFilter } from "@/components/RangeFilter";
import { TrendChart } from "@/components/TrendChart";
import { buildArtistRelatedTracks } from "@/lib/detail-stats";
import { DISPLAY_UNIT_COOKIE, formatEstimatedDuration, parseDisplayUnit } from "@/lib/display-unit";
import { buildCollectionStats } from "@/lib/stats";
import { readSnapshots } from "@/lib/storage";
import { resolveTimeRange } from "@/lib/time-range";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ArtistDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const artistId = decodeURIComponent(id);
  const cookieStore = await cookies();
  const displayUnit = parseDisplayUnit(cookieStore.get(DISPLAY_UNIT_COOKIE)?.value);
  const parsed = (await searchParams) ?? {};
  const range = resolveTimeRange({
    range: firstParam(parsed.range),
    from: firstParam(parsed.from),
    to: firstParam(parsed.to),
  });

  const query = new URLSearchParams();
  query.set("range", range.preset);
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const rangeQuery = query.toString();

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
  );

  const artist = artists.find((entry) => entry.id === artistId);
  const relatedTracks = artist
    ? buildArtistRelatedTracks(snapshots, range, artistId, artist.name)
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <Nav />
      <h1 className="mb-4 text-3xl font-bold">Artist Stats</h1>
      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">Range: {range.label}</p>

      {!artist ? (
        <article className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          Artist not found in this date range.
          <div className="mt-3">
            <Link href={`/artists?${rangeQuery}`} className="text-[var(--accent)] hover:underline">
              Back to artists
            </Link>
          </div>
        </article>
      ) : (
        <>
          <article className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <img src={artist.imageUrl} alt={artist.name} className="h-20 w-20 object-cover" />
              <div>
                <p className="text-2xl font-semibold">{artist.name}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Stat label="Estimated listened" value={formatEstimatedDuration(artist.totalHours, displayUnit)} />
              <Stat label="Appearances" value={String(artist.appearances)} />
              <Stat label="Average score" value={artist.avgScore.toFixed(2)} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">Rank trend</p>
              <TrendChart points={artist.trend} />
            </div>
          </article>

          <section className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
            <h2 className="text-lg font-semibold">Likely tracks for this artist</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Estimated contribution from tracked songs matching this artist name.</p>
            <div className="mt-4 space-y-2">
              {relatedTracks.slice(0, 30).map((track) => (
                <div key={track.id} className="flex items-center justify-between rounded-lg bg-[var(--panel-soft)] px-3 py-2 text-sm">
                  <span className="truncate">{track.name}</span>
                  <span className="text-[var(--muted)]">{formatEstimatedDuration(track.hours, displayUnit)}</span>
                </div>
              ))}
              {!relatedTracks.length ? <p className="text-sm text-[var(--muted)]">No related tracks found.</p> : null}
            </div>
          </section>

          <div className="mt-6">
            <Link href={`/artists?${rangeQuery}`} className="text-sm text-[var(--accent)] hover:underline">
              Back to artists
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </article>
  );
}
