import Link from "next/link";
import { Nav } from "@/components/Nav";
import { readHistoryEntries } from "@/lib/storage";
import { fetchUnheardRecommendations, RecommendedTrack } from "@/lib/spotify";

export const dynamic = "force-dynamic";

type RangePack = {
  title: string;
  subtitle: string;
  entries: Awaited<ReturnType<typeof readHistoryEntries>>;
  recommendations: RecommendedTrack[];
};

function normalize(value: string | null | undefined, fallback: string): string {
  const out = (value ?? "").trim();
  return out.length ? out : fallback;
}

function toTrackKey(trackName: string, artistName: string): string {
  return `${trackName.trim().toLowerCase()}::${artistName.trim().toLowerCase()}`;
}

function buildTopArtists(entries: Awaited<ReturnType<typeof readHistoryEntries>>, limit = 8): string[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (entry.ms_played < 30_000) continue;
    const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist");
    map.set(artist, (map.get(artist) ?? 0) + entry.ms_played);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function filterYear(entries: Awaited<ReturnType<typeof readHistoryEntries>>, now: Date) {
  const year = now.getFullYear();
  return entries.filter((entry) => new Date(entry.ts).getFullYear() === year);
}

function filterWeek(entries: Awaited<ReturnType<typeof readHistoryEntries>>, now: Date) {
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return entries.filter((entry) => {
    const date = new Date(entry.ts);
    return date >= start && date <= now;
  });
}

function filterYesterday(entries: Awaited<ReturnType<typeof readHistoryEntries>>, now: Date) {
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const year = y.getFullYear();
  const month = y.getMonth();
  const day = y.getDate();
  return entries.filter((entry) => {
    const date = new Date(entry.ts);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  });
}

async function buildRangeRecommendations(
  title: string,
  subtitle: string,
  entries: Awaited<ReturnType<typeof readHistoryEntries>>,
  excludeUris: Set<string>,
  excludeTrackKeys: Set<string>,
): Promise<RangePack> {
  const artistNames = buildTopArtists(entries);
  const recommendations = artistNames.length
    ? await fetchUnheardRecommendations({ artistNames, excludeUris, excludeTrackKeys, limit: 12 })
    : [];

  return {
    title,
    subtitle,
    entries,
    recommendations,
  };
}

export default async function RecommendationsPage() {
  const allEntries = await readHistoryEntries();
  const now = new Date();

  const excludeUris = new Set<string>();
  const excludeTrackKeys = new Set<string>();
  for (const entry of allEntries) {
    if (entry.spotify_track_uri?.trim()) excludeUris.add(entry.spotify_track_uri.trim());
    excludeTrackKeys.add(
      toTrackKey(
        normalize(entry.master_metadata_track_name, "Unknown track"),
        normalize(entry.master_metadata_album_artist_name, "Unknown artist"),
      ),
    );
  }

  const yearEntries = filterYear(allEntries, now);
  const weekEntries = filterWeek(allEntries, now);
  const yesterdayEntries = filterYesterday(allEntries, now);

  const packs = await Promise.all([
    buildRangeRecommendations("All Time", "Based on your complete listening history", allEntries, excludeUris, excludeTrackKeys),
    buildRangeRecommendations("This Year", "Based on your current-year listening", yearEntries, excludeUris, excludeTrackKeys),
    buildRangeRecommendations("This Week", "Based on your last 7 days", weekEntries, excludeUris, excludeTrackKeys),
    buildRangeRecommendations("Yesterday", "Based on songs you played yesterday", yesterdayEntries, excludeUris, excludeTrackKeys),
  ]);

  const quickPick = packs[0]?.recommendations?.[0];

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />

      <header className="ui-panel p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Recommendations</p>
        <h1 className="mt-2 text-3xl font-bold">Unheard Song Recommendations</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Recommendations are generated from your All Time, Year, Week, and Yesterday listening, while filtering songs you already listened to.
        </p>
        {quickPick ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Quick recommendation: <span className="font-semibold text-[var(--text)]">{quickPick.name}</span> by {quickPick.artist}
          </p>
        ) : null}
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {packs.map((pack) => (
          <article key={pack.title} className="ui-panel p-5">
            <h2 className="text-xl font-semibold">{pack.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{pack.subtitle}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Source plays: {pack.entries.length}</p>

            <div className="mt-4 space-y-2">
              {pack.recommendations.length ? (
                pack.recommendations.map((track, index) => (
                  <div key={`${track.uri || track.name}-${index}`} className="ui-soft-panel flex items-center gap-3 px-3 py-2">
                    {track.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.imageUrl} alt={track.album} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-[var(--panel-strong)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{track.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{track.artist} - {track.album}</p>
                      <p className="text-[11px] text-[var(--muted)]">Release: {track.releaseDate || "Unknown"}</p>
                    </div>
                    {track.spotifyUrl ? (
                      <a href={track.spotifyUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                        Open
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">No unseen recommendations found for this range yet.</p>
              )}
            </div>
          </article>
        ))}
      </section>

      <div className="mt-6">
        <Link href="/" className="ui-ghost-btn inline-flex px-4 py-2 text-sm">
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
