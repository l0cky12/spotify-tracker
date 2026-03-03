import Link from "next/link";
import { Nav } from "@/components/Nav";
import { buildCollectionStats } from "@/lib/stats";
import { readHistoryEntries } from "@/lib/storage";
import { buildTasteAnalytics } from "@/lib/taste-analytics";

export const dynamic = "force-dynamic";

export default async function WrappedPage() {
  const entries = await readHistoryEntries();
  const year = new Date().getFullYear();
  const yearEntries = entries.filter((entry) => entry.ts.startsWith(String(year)));

  const songs = buildCollectionStats(yearEntries, "songs");
  const albums = buildCollectionStats(yearEntries, "albums");
  const artists = buildCollectionStats(yearEntries, "artists");
  const genres = buildCollectionStats(yearEntries, "genres");
  const taste = buildTasteAnalytics(entries);

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

      <section className="ui-panel mt-6 p-5">
        <h2 className="text-xl font-semibold">Music Fingerprint</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{taste.fingerprint.profile}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Top Genres: {taste.fingerprint.topGenres.join(", ") || "No data"}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Top Artists: {taste.fingerprint.topArtists.join(", ") || "No data"}</p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="ui-panel p-5">
          <h3 className="text-lg font-semibold">Taste Evolution (Month To Month)</h3>
          <div className="mt-3 space-y-2">
            {taste.tasteEvolution.length ? (
              taste.tasteEvolution.map((row) => (
                <div key={row.month} className="ui-soft-panel flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{row.month}</span>
                  <span className="text-[var(--muted)]">{row.topGenre} / {row.topArtist} / {row.hours}h</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No monthly data.</p>
            )}
          </div>
        </article>

        <article className="ui-panel p-5">
          <h3 className="text-lg font-semibold">Era Analysis (Decades)</h3>
          <div className="mt-3 space-y-2">
            {taste.eraAnalysis.length ? (
              taste.eraAnalysis.map((era) => (
                <div key={era.era} className="ui-soft-panel flex items-center justify-between px-3 py-2 text-sm">
                  <span>{era.era}</span>
                  <span className="text-[var(--muted)]">{era.plays} plays ({era.share})</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No era data.</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="ui-panel p-5">
          <h3 className="text-lg font-semibold">Seasonal Taste Shifts</h3>
          <div className="mt-3 space-y-2">
            {taste.seasonalShifts.map((season) => (
              <div key={season.season} className="ui-soft-panel px-3 py-2 text-sm">
                <p className="font-medium">{season.season}</p>
                <p className="text-[var(--muted)]">{season.topGenre} / {season.topArtist}</p>
                <p className="text-[var(--muted)]">{season.hours}h</p>
              </div>
            ))}
          </div>
        </article>

        <article className="ui-panel p-5">
          <h3 className="text-lg font-semibold">Hidden Gem Detector</h3>
          <div className="mt-3 space-y-2">
            {taste.hiddenGems.length ? (
              taste.hiddenGems.map((gem) => (
                <div key={gem.artist} className="ui-soft-panel px-3 py-2 text-sm">
                  <p className="font-medium">{gem.artist}</p>
                  <p className="text-[var(--muted)]">Rank #{gem.currentRank} / {gem.plays} plays</p>
                  <p className="text-[var(--muted)]">First listen: {new Date(gem.firstListen).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No hidden gems found yet.</p>
            )}
          </div>
        </article>

        <article className="ui-panel p-5">
          <h3 className="text-lg font-semibold">Comfort Song Detector</h3>
          <div className="mt-3 space-y-2">
            {taste.comfortSongs.length ? (
              taste.comfortSongs.map((song) => (
                <div key={`${song.song}-${song.artist}`} className="ui-soft-panel px-3 py-2 text-sm">
                  <p className="font-medium">{song.song}</p>
                  <p className="text-[var(--muted)]">{song.artist}</p>
                  <p className="text-[var(--muted)]">Stress plays: {song.stressPlays} / Total plays: {song.totalPlays}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No comfort songs detected yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="ui-panel mt-6 p-5">
        <h3 className="text-lg font-semibold">Listening Personality Type</h3>
        <p className="mt-2 text-base font-semibold text-[var(--accent)]">{taste.personalityType.type}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{taste.personalityType.description}</p>
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
