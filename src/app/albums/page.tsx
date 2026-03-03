import { cookies } from "next/headers";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { RangeFilter } from "@/components/RangeFilter";
import { DISPLAY_UNIT_COOKIE, formatEstimatedDuration, parseDisplayUnit } from "@/lib/display-unit";
import { resolveEntityMedia } from "@/lib/spotify";
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
  const totalHours = albums.reduce((sum, album) => sum + album.totalHours, 0);
  const totalPlays = albums.reduce((sum, album) => sum + album.playCount, 0);
  const mediaRows = await Promise.all(
    albums.map(async (album) => [album.id, await resolveEntityMedia({ kind: "albums", name: album.name, subtitle: album.subtitle })] as const),
  );
  const mediaById = new Map(mediaRows);

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />
      <header className="ui-panel mb-4 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Library</p>
        <h1 className="mt-2 text-3xl font-bold">Albums</h1>
      </header>
      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">Range: {range.label}</p>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <InfoTile label="Tracked Albums" value={String(albums.length)} />
        <InfoTile label={`Listening (${displayUnit})`} value={formatEstimatedDuration(totalHours, displayUnit, { hoursDecimals: 1 })} />
        <InfoTile label="Total Plays" value={String(totalPlays)} />
      </section>

      <div className="mt-6 space-y-4">
        {albums.length ? (
          albums.map((album) => (
            <article
              key={album.id}
              className="group relative overflow-hidden rounded-2xl border border-[var(--stroke)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--panel-soft)_88%,transparent),color-mix(in_oklab,var(--panel)_82%,transparent))] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[var(--glow-a)] blur-2xl transition group-hover:scale-110" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/albums/${encodeURIComponent(album.id)}?${rangeQuery}`}
                    className="truncate text-lg font-semibold hover:text-[var(--accent)]"
                  >
                    #{album.currentRank} {album.name}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--muted)]">{album.subtitle}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Listened: {formatEstimatedDuration(album.totalHours, displayUnit)} - Plays: {album.playCount} - Avg length: {album.avgMinutes.toFixed(1)}m
                  </p>
                </div>
                <MediaPreview
                  title={album.name}
                  imageUrl={mediaById.get(album.id)?.imageUrl}
                  linkUrl={mediaById.get(album.id)?.spotifyUrl}
                  info={mediaById.get(album.id)?.info}
                />
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  );
}

function MediaPreview({
  title,
  imageUrl,
  linkUrl,
  info,
}: {
  title: string;
  imageUrl?: string;
  linkUrl?: string;
  info?: string;
}) {
  return (
    <div className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--panel-strong)] p-2 md:w-72">
      <div className="flex items-center gap-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--panel)] text-xs text-[var(--muted)]">No Art</div>
        )}
        <div className="min-w-0">
          {linkUrl ? (
            <a href={linkUrl} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold hover:text-[var(--accent)]">
              Open on Spotify
            </a>
          ) : (
            <p className="truncate text-sm font-semibold text-[var(--muted)]">No Spotify link</p>
          )}
          <p className="mt-1 text-xs text-[var(--muted)]">{info || "Album artwork and release info when available."}</p>
        </div>
      </div>
    </div>
  );
}
