import { CollectionStats, HistoryEntry } from "./types";
import { TimeRange } from "./time-range";

export type StatsKind = "songs" | "albums" | "artists" | "genres";

type Aggregated = {
  id: string;
  name: string;
  subtitle?: string;
  totalMs: number;
  playCount: number;
  trendByDay: Map<string, number>;
};

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(ts: string): string {
  return ts.slice(0, 10);
}

function normalizeText(value: string | null | undefined, fallback: string): string {
  const out = (value ?? "").trim();
  return out.length ? out : fallback;
}

function getGenreName(entry: HistoryEntry): string {
  const album = normalizeText(entry.master_metadata_album_album_name, "Unknown album").toLowerCase();
  const artist = normalizeText(entry.master_metadata_album_artist_name, "Unknown artist").toLowerCase();

  if (album.includes("greatest hits") || album.includes("best of")) return "Compilation";
  if (artist.includes("dj") || album.includes("mix") || album.includes("remix")) return "Electronic / Mix";
  if (album.includes("live")) return "Live";
  return "Unknown";
}

export function entriesInRange(entries: HistoryEntry[], range?: TimeRange): HistoryEntry[] {
  if (!range) return entries;
  return entries.filter((entry) => {
    const date = parseDate(entry.ts);
    if (!date) return false;
    return date >= range.start && date <= range.end;
  });
}

function keyForKind(entry: HistoryEntry, kind: StatsKind): { id: string; name: string; subtitle?: string } {
  const track = normalizeText(entry.master_metadata_track_name, "Unknown track");
  const artist = normalizeText(entry.master_metadata_album_artist_name, "Unknown artist");
  const album = normalizeText(entry.master_metadata_album_album_name, "Unknown album");

  if (kind === "songs") {
    const id = entry.spotify_track_uri?.trim() || `${track}::${artist}`;
    return { id, name: track, subtitle: artist };
  }

  if (kind === "albums") {
    const id = `${album}::${artist}`;
    return { id, name: album, subtitle: artist };
  }

  if (kind === "artists") {
    return { id: artist, name: artist };
  }

  const genre = getGenreName(entry);
  return { id: genre.toLowerCase().replace(/\s+/g, "-"), name: genre };
}

export function buildCollectionStats(entries: HistoryEntry[], kind: StatsKind, range?: TimeRange): CollectionStats[] {
  const filtered = entriesInRange(entries, range).filter((entry) => entry.ms_played > 0);
  const map = new Map<string, Aggregated>();

  for (const entry of filtered) {
    const { id, name, subtitle } = keyForKind(entry, kind);
    const dateKey = dayKey(entry.ts);
    const existing = map.get(id);

    if (!existing) {
      const trendByDay = new Map<string, number>();
      trendByDay.set(dateKey, entry.ms_played);
      map.set(id, {
        id,
        name,
        subtitle,
        totalMs: entry.ms_played,
        playCount: 1,
        trendByDay,
      });
      continue;
    }

    existing.totalMs += entry.ms_played;
    existing.playCount += 1;
    existing.trendByDay.set(dateKey, (existing.trendByDay.get(dateKey) ?? 0) + entry.ms_played);
  }

  const sorted = Array.from(map.values()).sort((a, b) => b.totalMs - a.totalMs || b.playCount - a.playCount);

  return sorted.map((item, index) => {
    const trend = Array.from(item.trendByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, ms]) => ({ capturedAt: `${date}T00:00:00.000Z`, value: Number((ms / 3600000).toFixed(3)) }));

    const totalHours = item.totalMs / 3600000;
    const avgMinutes = item.totalMs / item.playCount / 60000;

    return {
      id: item.id,
      name: item.name,
      subtitle: item.subtitle,
      currentRank: index + 1,
      playCount: item.playCount,
      avgMinutes: Number(avgMinutes.toFixed(2)),
      totalHours: Number(totalHours.toFixed(3)),
      trend,
    };
  });
}
