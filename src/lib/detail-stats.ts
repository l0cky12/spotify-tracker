import { HistoryEntry } from "./types";
import { TimeRange } from "./time-range";
import { entriesInRange } from "./stats";

export type RelatedTrackStat = {
  id: string;
  name: string;
  artistName: string;
  imageUrl: string;
  hours: number;
  playCount: number;
};

function normalizeText(value: string | null | undefined, fallback: string): string {
  const out = (value ?? "").trim();
  return out.length ? out : fallback;
}

function trackId(entry: HistoryEntry): string {
  const track = normalizeText(entry.master_metadata_track_name, "Unknown track");
  const artist = normalizeText(entry.master_metadata_album_artist_name, "Unknown artist");
  return entry.spotify_track_uri?.trim() || `${track}::${artist}`;
}

function addTrack(store: Map<string, RelatedTrackStat>, entry: HistoryEntry) {
  const id = trackId(entry);
  const name = normalizeText(entry.master_metadata_track_name, "Unknown track");
  const artistName = normalizeText(entry.master_metadata_album_artist_name, "Unknown artist");
  const hours = entry.ms_played / 3600000;
  const current = store.get(id);

  if (!current) {
    store.set(id, {
      id,
      name,
      artistName,
      imageUrl: "",
      hours,
      playCount: 1,
    });
    return;
  }

  current.hours += hours;
  current.playCount += 1;
}

function sortStats(store: Map<string, RelatedTrackStat>): RelatedTrackStat[] {
  return Array.from(store.values())
    .map((item) => ({ ...item, hours: Number(item.hours.toFixed(3)) }))
    .sort((a, b) => b.hours - a.hours || b.playCount - a.playCount);
}

export function buildSongRelatedTracks(entries: HistoryEntry[], range: TimeRange | undefined, songId: string): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();
  for (const entry of entriesInRange(entries, range)) {
    if (trackId(entry) !== songId) continue;
    addTrack(store, entry);
  }
  return sortStats(store);
}

export function buildAlbumRelatedTracks(entries: HistoryEntry[], range: TimeRange | undefined, albumId: string): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();

  for (const entry of entriesInRange(entries, range)) {
    const album = normalizeText(entry.master_metadata_album_album_name, "Unknown album");
    const artist = normalizeText(entry.master_metadata_album_artist_name, "Unknown artist");
    const id = `${album}::${artist}`;
    if (id !== albumId) continue;
    addTrack(store, entry);
  }

  return sortStats(store);
}

export function buildArtistRelatedTracks(
  entries: HistoryEntry[],
  range: TimeRange | undefined,
  artistId: string,
): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();

  for (const entry of entriesInRange(entries, range)) {
    const artist = normalizeText(entry.master_metadata_album_artist_name, "Unknown artist");
    if (artist !== artistId) continue;
    addTrack(store, entry);
  }

  return sortStats(store);
}

function genreForEntry(entry: HistoryEntry): string {
  const album = normalizeText(entry.master_metadata_album_album_name, "Unknown album").toLowerCase();
  const artist = normalizeText(entry.master_metadata_album_artist_name, "Unknown artist").toLowerCase();
  if (album.includes("greatest hits") || album.includes("best of")) return "compilation";
  if (artist.includes("dj") || album.includes("mix") || album.includes("remix")) return "electronic-/-mix";
  if (album.includes("live")) return "live";
  return "unknown";
}

export function buildGenreRelatedTracks(
  entries: HistoryEntry[],
  range: TimeRange | undefined,
  genreId: string,
): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();

  for (const entry of entriesInRange(entries, range)) {
    if (genreForEntry(entry) !== genreId) continue;
    addTrack(store, entry);
  }

  return sortStats(store);
}
