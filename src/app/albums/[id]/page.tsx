import { cookies } from "next/headers";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { RangeFilter } from "@/components/RangeFilter";
import { TrendChart } from "@/components/TrendChart";
import { buildAlbumListenWindow, buildAlbumRelatedTracks } from "@/lib/detail-stats";
import { resolveEntityMedia } from "@/lib/spotify";
import { DISPLAY_UNIT_COOKIE, formatEstimatedDuration, parseDisplayUnit } from "@/lib/display-unit";
import { buildCollectionStats } from "@/lib/stats";
import { readHistoryEntries } from "@/lib/storage";
import { resolveTimeRange } from "@/lib/time-range";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlbumDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const albumId = decodeURIComponent(id);
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

  const entries = await readHistoryEntries();
  const albums = buildCollectionStats(entries, "albums", range);

  const album = albums.find((entry) => entry.id === albumId);
  const relatedTracks = buildAlbumRelatedTracks(entries, range, albumId);
  const listenWindow = buildAlbumListenWindow(entries, range, albumId);
  const media = album ? await resolveEntityMedia({ kind: "albums", name: album.name, subtitle: album.subtitle }) : null;

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />
      <header className="ui-panel mb-4 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Detail</p>
        <h1 className="mt-2 text-3xl font-bold">Album Stats</h1>
      </header>
      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">Range: {range.label}</p>

      {!album ? (
        <article className="ui-panel mt-6 p-5 text-sm text-[var(--muted)]">
          Album not found in this date range.
          <div className="mt-3">
            <Link href={`/albums?${rangeQuery}`} className="text-[var(--accent)] hover:underline">
              Back to albums
            </Link>
          </div>
        </article>
      ) : (
        <>
          <article className="ui-panel mt-6 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {media?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.imageUrl} alt={album.name} className="h-24 w-24 rounded-xl object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[var(--panel-strong)] text-xs text-[var(--muted)]">No Art</div>
              )}
              <div>
                <p className="text-2xl font-semibold">{album.name}</p>
                <p className="text-sm text-[var(--muted)]">{album.subtitle}</p>
                {media?.info ? <p className="mt-1 text-xs text-[var(--muted)]">{media.info}</p> : null}
                {media?.spotifyUrl ? (
                  <a href={media.spotifyUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline">
                    Open on Spotify
                  </a>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Stat label="Listened" value={formatEstimatedDuration(album.totalHours, displayUnit)} />
              <Stat label="Play count" value={String(album.playCount)} />
              <Stat label="Avg play length" value={`${album.avgMinutes.toFixed(1)}m`} />
              <Stat label="First listen" value={formatListenDate(listenWindow.firstListen)} />
              <Stat label="Last listen" value={formatListenDate(listenWindow.lastListen)} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">Listening trend</p>
              <TrendChart points={album.trend} />
            </div>
          </article>

          <section className="ui-panel mt-6 p-5">
            <h2 className="text-lg font-semibold">Top 10 songs from this album</h2>
            <div className="mt-4 space-y-2">
              {relatedTracks.slice(0, 10).map((track) => (
                <div key={track.id} className="ui-soft-panel flex items-center justify-between px-3 py-2 text-sm">
                  <span className="truncate">{track.name}</span>
                  <span className="text-[var(--muted)]">{formatEstimatedDuration(track.hours, displayUnit)}</span>
                </div>
              ))}
              {!relatedTracks.length ? <p className="text-sm text-[var(--muted)]">No related tracks found.</p> : null}
            </div>
          </section>

          <div className="mt-6">
            <Link href={`/albums?${rangeQuery}`} className="text-sm text-[var(--accent)] hover:underline">
              Back to albums
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-soft-panel p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </article>
  );
}

function formatListenDate(value?: string): string {
  if (!value) return "No data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No data";
  return date.toLocaleString();
}
