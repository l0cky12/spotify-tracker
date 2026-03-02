import fs from "node:fs/promises";
import path from "node:path";
import { fetchArtistGenresByName } from "./spotify";
import { HistoryEntry } from "./types";

const cacheFile = path.join(process.cwd(), "data", "artist-genres.json");
const MAX_LOOKUPS_PER_IMPORT = 200;

type GenreCache = Record<string, string>;

function normalizeArtistKey(artist: string): string {
  return artist.trim().toLowerCase();
}

async function readGenreCache(): Promise<GenreCache> {
  try {
    const raw = await fs.readFile(cacheFile, "utf-8");
    const parsed = JSON.parse(raw) as GenreCache;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeGenreCache(cache: GenreCache): Promise<void> {
  await fs.mkdir(path.dirname(cacheFile), { recursive: true });
  await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2), "utf-8");
}

function pickTopArtists(entries: HistoryEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const artist = entry.master_metadata_album_artist_name?.trim();
    if (!artist) continue;
    counts.set(artist, (counts.get(artist) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([artist]) => artist);
}

export async function enrichHistoryGenres(entries: HistoryEntry[]): Promise<HistoryEntry[]> {
  if (!entries.length) return entries;

  const cache = await readGenreCache();
  const artists = pickTopArtists(entries);
  const uncachedArtists = artists.filter((artist) => !cache[normalizeArtistKey(artist)]).slice(0, MAX_LOOKUPS_PER_IMPORT);

  if (uncachedArtists.length) {
    try {
      const resolved = await fetchArtistGenresByName(uncachedArtists);
      for (const [artist, genre] of resolved.entries()) {
        cache[normalizeArtistKey(artist)] = genre;
      }
      await writeGenreCache(cache);
    } catch {
      // Keep import working even if enrichment fails.
    }
  }

  return entries.map((entry) => {
    const artist = entry.master_metadata_album_artist_name?.trim();
    if (!artist) return entry;
    const cachedGenre = cache[normalizeArtistKey(artist)];
    if (!cachedGenre) return entry;
    return { ...entry, inferred_genre: cachedGenre };
  });
}
