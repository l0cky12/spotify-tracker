import { HistoryEntry } from "@/lib/types";

type MonthShift = {
  month: string;
  topGenre: string;
  topArtist: string;
  hours: number;
};

type SeasonShift = {
  season: string;
  topGenre: string;
  topArtist: string;
  hours: number;
};

type HiddenGem = {
  artist: string;
  plays: number;
  firstListen: string;
  currentRank: number;
};

type ComfortSong = {
  song: string;
  artist: string;
  stressPlays: number;
  totalPlays: number;
};

export type TasteAnalytics = {
  fingerprint: {
    profile: string;
    topGenres: string[];
    topArtists: string[];
  };
  tasteEvolution: MonthShift[];
  eraAnalysis: Array<{ era: string; plays: number; share: string }>;
  seasonalShifts: SeasonShift[];
  hiddenGems: HiddenGem[];
  comfortSongs: ComfortSong[];
  personalityType: {
    type: string;
    description: string;
  };
};

function normalize(value: string | null | undefined, fallback: string): string {
  const out = (value ?? "").trim();
  return out.length ? out : fallback;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function genreForEntry(entry: HistoryEntry): string {
  const inferred = normalize(entry.inferred_genre, "");
  if (inferred) return inferred;
  const album = normalize(entry.master_metadata_album_album_name, "Unknown album").toLowerCase();
  const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist").toLowerCase();
  if (album.includes("greatest hits") || album.includes("best of")) return "Compilation";
  if (artist.includes("dj") || album.includes("mix") || album.includes("remix")) return "Electronic / Mix";
  if (album.includes("live")) return "Live";
  return "Other";
}

function decadeFromEntry(entry: HistoryEntry, listenYear: number): string {
  const text = `${normalize(entry.master_metadata_track_name, "")} ${normalize(entry.master_metadata_album_album_name, "")}`;
  const match = text.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  const year = match ? Number(match[1]) : listenYear;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function seasonKey(monthIndex: number): string {
  if ([11, 0, 1].includes(monthIndex)) return "Winter";
  if ([2, 3, 4].includes(monthIndex)) return "Spring";
  if ([5, 6, 7].includes(monthIndex)) return "Summer";
  return "Fall";
}

export function buildTasteAnalytics(entries: HistoryEntry[]): TasteAnalytics {
  const valid = entries
    .filter((entry) => entry.ms_played >= 30_000)
    .map((entry) => ({ entry, date: parseDate(entry.ts) }))
    .filter((item): item is { entry: HistoryEntry; date: Date } => Boolean(item.date));

  const artistPlays = new Map<string, number>();
  const genrePlays = new Map<string, number>();
  const eraPlays = new Map<string, number>();
  const monthGenre = new Map<string, Map<string, number>>();
  const monthArtist = new Map<string, Map<string, number>>();
  const seasonGenre = new Map<string, Map<string, number>>();
  const seasonArtist = new Map<string, Map<string, number>>();

  const artistFirstListen = new Map<string, string>();
  const artistTotalPlays = new Map<string, number>();

  const songStress = new Map<string, { song: string; artist: string; stress: number; total: number }>();

  let minTs = Number.POSITIVE_INFINITY;
  let maxTs = Number.NEGATIVE_INFINITY;

  for (const { entry, date } of valid) {
    const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist");
    const song = normalize(entry.master_metadata_track_name, "Unknown track");
    const genre = genreForEntry(entry);

    artistPlays.set(artist, (artistPlays.get(artist) ?? 0) + 1);
    genrePlays.set(genre, (genrePlays.get(genre) ?? 0) + 1);
    eraPlays.set(decadeFromEntry(entry, date.getFullYear()), (eraPlays.get(decadeFromEntry(entry, date.getFullYear())) ?? 0) + 1);

    const mKey = monthKey(date);
    if (!monthGenre.has(mKey)) monthGenre.set(mKey, new Map());
    if (!monthArtist.has(mKey)) monthArtist.set(mKey, new Map());
    monthGenre.get(mKey)!.set(genre, (monthGenre.get(mKey)!.get(genre) ?? 0) + entry.ms_played);
    monthArtist.get(mKey)!.set(artist, (monthArtist.get(mKey)!.get(artist) ?? 0) + entry.ms_played);

    const sKey = seasonKey(date.getMonth());
    if (!seasonGenre.has(sKey)) seasonGenre.set(sKey, new Map());
    if (!seasonArtist.has(sKey)) seasonArtist.set(sKey, new Map());
    seasonGenre.get(sKey)!.set(genre, (seasonGenre.get(sKey)!.get(genre) ?? 0) + entry.ms_played);
    seasonArtist.get(sKey)!.set(artist, (seasonArtist.get(sKey)!.get(artist) ?? 0) + entry.ms_played);

    artistTotalPlays.set(artist, (artistTotalPlays.get(artist) ?? 0) + 1);
    if (!artistFirstListen.has(artist) || entry.ts < artistFirstListen.get(artist)!) {
      artistFirstListen.set(artist, entry.ts);
    }

    const ts = date.getTime();
    minTs = Math.min(minTs, ts);
    maxTs = Math.max(maxTs, ts);

    const stressWindow =
      (date.getDay() >= 1 && date.getDay() <= 5 && date.getHours() >= 22) ||
      (date.getDay() >= 1 && date.getDay() <= 5 && date.getHours() <= 2) ||
      (date.getDay() >= 1 && date.getDay() <= 5 && date.getHours() >= 7 && date.getHours() <= 9);

    const songKey = `${song}::${artist}`;
    const current = songStress.get(songKey) ?? { song, artist, stress: 0, total: 0 };
    current.total += 1;
    if (stressWindow) current.stress += 1;
    songStress.set(songKey, current);
  }

  const topGenres = Array.from(genrePlays.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const topArtistsSorted = Array.from(artistPlays.entries()).sort((a, b) => b[1] - a[1]);
  const topArtists = topArtistsSorted.slice(0, 5).map(([name]) => name);

  const diversity = genrePlays.size;
  const profile =
    diversity >= 7
      ? "Broad taste with high genre exploration"
      : diversity >= 4
        ? "Balanced taste with a few dominant genres"
        : "Focused taste around a core sound";

  const tasteEvolution = Array.from(monthGenre.keys())
    .sort((a, b) => a.localeCompare(b))
    .slice(-12)
    .map((month) => {
      const topGenre = Array.from(monthGenre.get(month)?.entries() ?? []).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";
      const topArtist = Array.from(monthArtist.get(month)?.entries() ?? []).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown artist";
      const totalMs = Array.from(monthGenre.get(month)?.values() ?? []).reduce((sum, value) => sum + value, 0);
      return { month, topGenre, topArtist, hours: Number((totalMs / 3600000).toFixed(1)) };
    });

  const totalEraPlays = Array.from(eraPlays.values()).reduce((sum, value) => sum + value, 0) || 1;
  const eraAnalysis = Array.from(eraPlays.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([era, plays]) => ({ era, plays, share: `${Math.round((plays / totalEraPlays) * 100)}%` }));

  const seasonalShifts = ["Winter", "Spring", "Summer", "Fall"].map((season) => {
    const gTop = Array.from(seasonGenre.get(season)?.entries() ?? []).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";
    const aTop = Array.from(seasonArtist.get(season)?.entries() ?? []).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown artist";
    const ms = Array.from(seasonGenre.get(season)?.values() ?? []).reduce((sum, value) => sum + value, 0);
    return { season, topGenre: gTop, topArtist: aTop, hours: Number((ms / 3600000).toFixed(1)) };
  });

  const timelineSpan = Math.max(1, maxTs - minTs);
  const earlyCutoff = minTs + timelineSpan * 0.35;

  const hiddenGems = topArtistsSorted
    .map(([artist, plays], index) => ({
      artist,
      plays,
      firstListen: artistFirstListen.get(artist) ?? "",
      currentRank: index + 1,
    }))
    .filter((item) => {
      const ts = parseDate(item.firstListen)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ts <= earlyCutoff && item.currentRank > 5 && item.currentRank <= 30 && item.plays >= 5;
    })
    .slice(0, 10);

  const comfortSongs = Array.from(songStress.values())
    .filter((item) => item.stress >= 3)
    .sort((a, b) => b.stress - a.stress || b.total - a.total)
    .slice(0, 10)
    .map((item) => ({ song: item.song, artist: item.artist, stressPlays: item.stress, totalPlays: item.total }));

  const top10Share = topArtistsSorted.slice(0, 10).reduce((sum, [, plays]) => sum + plays, 0) / (valid.length || 1);
  const personalityType =
    top10Share > 0.75
      ? {
          type: "The Loyalist",
          description: "You build deep long-term connections with a core set of artists.",
        }
      : diversity >= 7
        ? {
            type: "The Explorer",
            description: "You consistently branch out across genres and scenes.",
          }
        : comfortSongs.length >= 4
          ? {
              type: "The Comfort Listener",
              description: "You rely on familiar songs to regulate mood and stress.",
            }
          : {
              type: "The Mood Shifter",
              description: "Your listening shifts between styles and contexts over time.",
            };

  return {
    fingerprint: {
      profile,
      topGenres,
      topArtists,
    },
    tasteEvolution,
    eraAnalysis,
    seasonalShifts,
    hiddenGems,
    comfortSongs,
    personalityType,
  };
}
