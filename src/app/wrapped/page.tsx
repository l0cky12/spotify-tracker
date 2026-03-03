import Link from "next/link";
import { Nav } from "@/components/Nav";
import { buildCollectionStats } from "@/lib/stats";
import { readHistoryEntries } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function WrappedPage() {
  const entries = await readHistoryEntries();
  const year = new Date().getFullYear();
  const yearEntries = entries.filter((entry) => entry.ts.startsWith(String(year)));

  const songs = buildCollectionStats(yearEntries, "songs");
  const albums = buildCollectionStats(yearEntries, "albums");
  const artists = buildCollectionStats(yearEntries, "artists");
  const genres = buildCollectionStats(yearEntries, "genres");

  const totalHours = yearEntries.reduce((sum, entry) => sum + entry.ms_played, 0) / 3600000;
  const totalPlays = yearEntries.length;

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />
      <header className="ui-panel p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Wrapped-Style Summary</p>
        <h1 className="mt-2 text-3xl font-bold">Your {year} Listening Wrapped</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">A snapshot of your year: top tracks, artists, genres, and listening totals.</p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile label="Total Plays" value={String(totalPlays)} />
        <Tile label="Total Listening" value={`${totalHours.toFixed(1)}h`} />
        <Tile label="Top Song" value={songs[0]?.name ?? "No data"} />
        <Tile label="Top Artist" value={artists[0]?.name ?? "No data"} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <List title="Top Songs" items={songs.slice(0, 10).map((item) => item.name)} />
        <List title="Top Albums" items={albums.slice(0, 10).map((item) => item.name)} />
        <List title="Top Genres" items={genres.slice(0, 10).map((item) => item.name)} />
      </section>

      <div className="mt-6">
        <Link href="/" className="ui-ghost-btn inline-flex px-4 py-2 text-sm">
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-panel p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </article>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="ui-panel p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <p key={`${item}-${index}`} className="ui-soft-panel truncate px-3 py-2 text-sm">
              #{index + 1} {item}
            </p>
          ))
        ) : (
          <p className="text-sm text-[var(--muted)]">No data yet.</p>
        )}
      </div>
    </article>
  );
}
