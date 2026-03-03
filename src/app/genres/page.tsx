import { cookies } from "next/headers";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { RangeFilter } from "@/components/RangeFilter";
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

export default async function GenresPage({ searchParams }: PageProps) {
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
  const genres = buildCollectionStats(entries, "genres", range).slice(0, 30);
  const totalHours = genres.reduce((sum, genre) => sum + genre.totalHours, 0);
  const totalPlays = genres.reduce((sum, genre) => sum + genre.playCount, 0);

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />
      <header className="ui-panel mb-4 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Library</p>
        <h1 className="mt-2 text-3xl font-bold">Genres</h1>
      </header>
      <RangeFilter selectedRange={range.preset} from={range.from} to={range.to} />
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">Range: {range.label}</p>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <InfoTile label="Tracked Genres" value={String(genres.length)} />
        <InfoTile label={`Listening (${displayUnit})`} value={formatEstimatedDuration(totalHours, displayUnit, { hoursDecimals: 1 })} />
        <InfoTile label="Total Plays" value={String(totalPlays)} />
      </section>

      <div className="mt-6 space-y-4">
        {genres.length ? (
          genres.map((genre) => (
            <article
              key={genre.id}
              className="group relative overflow-hidden rounded-2xl border border-[var(--stroke)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--panel-soft)_88%,transparent),color-mix(in_oklab,var(--panel)_82%,transparent))] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[var(--glow-a)] blur-2xl transition group-hover:scale-110" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--stroke)] bg-[var(--panel-strong)] text-2xl font-bold text-[var(--accent)]">
                  #
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/genres/${encodeURIComponent(genre.id)}?${rangeQuery}`}
                    className="truncate text-lg font-semibold hover:text-[var(--accent)]"
                  >
                    #{genre.currentRank} {genre.name}
                  </Link>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Listened: {formatEstimatedDuration(genre.totalHours, displayUnit)} - Plays: {genre.playCount} - Avg length: {genre.avgMinutes.toFixed(1)}m
                  </p>
                </div>
                <div className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--panel-strong)] p-3 md:w-72">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Genre Profile</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--accent)]">{genre.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Plays {genre.playCount} - Avg {genre.avgMinutes.toFixed(1)}m
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="ui-panel p-4 text-sm text-[var(--muted)]">
            No genre data inferred from this history range.
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
