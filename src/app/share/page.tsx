import { cookies } from "next/headers";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { PdfExportButton } from "@/components/PdfExportButton";
import { DISPLAY_UNIT_COOKIE, formatEstimatedDuration, parseDisplayUnit } from "@/lib/display-unit";
import { buildCollectionStats, entriesInRange } from "@/lib/stats";
import { readHistoryEntries } from "@/lib/storage";
import { resolveTimeRange } from "@/lib/time-range";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SharePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const range = resolveTimeRange({
    range: firstParam(params.range),
    from: firstParam(params.from),
    to: firstParam(params.to),
  });
  const exportPdf = firstParam(params.export) === "pdf";

  const cookieStore = await cookies();
  const displayUnit = parseDisplayUnit(cookieStore.get(DISPLAY_UNIT_COOKIE)?.value);

  const entries = await readHistoryEntries();
  const filteredEntries = entriesInRange(entries, range);
  const analyticsEntries = filteredEntries.filter((entry) => entry.ms_played >= 30_000);

  const songs = buildCollectionStats(entries, "songs", range);
  const albums = buildCollectionStats(entries, "albums", range);
  const artists = buildCollectionStats(entries, "artists", range);

  const totalSongHours = songs.reduce((sum, item) => sum + item.totalHours, 0);

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />
      <section className="ui-panel p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Share</p>
        <h1 className="mt-2 text-2xl font-bold">Share Your Spotify Tracker Stats</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Use this page for sharing and exporting a PDF snapshot of your listening metrics.</p>

        <div className="mt-4 flex flex-wrap gap-3 print:hidden">
          <Link href="/" className="ui-primary-btn px-4 py-2 text-sm">
            Back To Dashboard
          </Link>
          <PdfExportButton autoStart={exportPdf} />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ShareTile label="Range" value={range.label} />
        <ShareTile label="Plays" value={String(analyticsEntries.length)} />
        <ShareTile label={`Listening (${displayUnit})`} value={formatEstimatedDuration(totalSongHours, displayUnit, { hoursDecimals: 1 })} />
        <ShareTile label="Top Song" value={songs[0]?.name ?? "No data"} />
        <ShareTile label="Top Album" value={albums[0]?.name ?? "No data"} />
        <ShareTile label="Top Artist" value={artists[0]?.name ?? "No data"} />
        <ShareTile label="Unique Songs" value={String(songs.length)} />
        <ShareTile label="Unique Artists" value={String(artists.length)} />
      </section>
    </main>
  );
}

function ShareTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </article>
  );
}
