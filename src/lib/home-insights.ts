import { HistoryEntry } from "@/lib/types";

type Audio = {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
};

export type HomeInsights = {
  streakCurrent: number;
  streakBest: number;
  timeOfDay: Array<{ name: string; plays: number; hours: number }>;
  weekdayWeekend: Array<{ name: string; plays: number; hours: number }>;
  artistObsession: { artist: string; share: number; score: number; label: string };
  discovery: { month: string; newArtists: number; newSongs: number };
  repeatScore: { score: number; replayRate: number; avgReplays: number };
  moodTrends: Array<{ month: string; energy: number; valence: number; danceability: number }>;
};

function normalize(value: string | null | undefined, fallback: string): string {
  const out = (value ?? "").trim();
  return out.length ? out : fallback;
}

function parseDate(ts: string): Date | null {
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? null : date;
}

function estimateAudio(entry: HistoryEntry): Audio {
  const text = `${normalize(entry.master_metadata_track_name, "")} ${normalize(entry.master_metadata_album_album_name, "")}`.toLowerCase();
  const artist = normalize(entry.master_metadata_album_artist_name, "").toLowerCase();

  let energy = 0.55;
  let danceability = 0.5;
  let valence = 0.52;
  let acousticness = 0.25;

  if (text.includes("remix") || text.includes("club") || artist.includes("dj")) {
    energy += 0.2;
    danceability += 0.2;
    acousticness -= 0.1;
  }
  if (text.includes("acoustic") || text.includes("live") || text.includes("piano")) {
    acousticness += 0.3;
    energy -= 0.18;
  }
  if (text.includes("dance") || text.includes("party")) {
    danceability += 0.15;
  }
  if (text.includes("sad") || text.includes("blue")) {
    valence -= 0.22;
  }
  if (text.includes("happy") || text.includes("sun")) {
    valence += 0.2;
  }

  return {
    energy: Math.max(0, Math.min(1, energy)),
    danceability: Math.max(0, Math.min(1, danceability)),
    valence: Math.max(0, Math.min(1, valence)),
    acousticness: Math.max(0, Math.min(1, acousticness)),
  };
}

function computeStreak(entries: HistoryEntry[]): { current: number; best: number } {
  const days = Array.from(
    new Set(
      entries
        .map((entry) => entry.ts.slice(0, 10))
        .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)),
    ),
  ).sort();

  if (!days.length) return { current: 0, best: 0 };

  let best = 1;
  let current = 1;

  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`).getTime();
    const next = new Date(`${days[i]}T00:00:00Z`).getTime();
    const diffDays = Math.round((next - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  const lastDay = days[days.length - 1];
  let currentTail = 1;
  for (let i = days.length - 2; i >= 0; i -= 1) {
    const a = new Date(`${days[i + 1]}T00:00:00Z`).getTime();
    const b = new Date(`${days[i]}T00:00:00Z`).getTime();
    const diff = Math.round((a - b) / (1000 * 60 * 60 * 24));
    if (diff === 1) currentTail += 1;
    else break;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  const currentValid = lastDay === todayKey || lastDay === yesterdayKey;

  return { current: currentValid ? currentTail : 0, best };
}

export function buildHomeInsights(filteredEntries: HistoryEntry[], allEntries: HistoryEntry[], now = new Date()): HomeInsights {
  const entries = filteredEntries.filter((entry) => entry.ms_played >= 30_000);

  const streak = computeStreak(entries);

  const dayParts = new Map<string, { plays: number; ms: number }>([
    ["Morning", { plays: 0, ms: 0 }],
    ["Afternoon", { plays: 0, ms: 0 }],
    ["Evening", { plays: 0, ms: 0 }],
    ["Night", { plays: 0, ms: 0 }],
  ]);

  const weekParts = new Map<string, { plays: number; ms: number }>([
    ["Weekday", { plays: 0, ms: 0 }],
    ["Weekend", { plays: 0, ms: 0 }],
  ]);

  const artistPlays = new Map<string, number>();
  const songPlays = new Map<string, number>();

  const moodByMonth = new Map<string, { energy: number; valence: number; danceability: number; count: number }>();

  for (const entry of entries) {
    const date = parseDate(entry.ts);
    if (!date) continue;

    const hour = date.getHours();
    const part = hour >= 5 && hour < 12 ? "Morning" : hour >= 12 && hour < 18 ? "Afternoon" : hour >= 18 && hour < 22 ? "Evening" : "Night";
    const partRow = dayParts.get(part)!;
    partRow.plays += 1;
    partRow.ms += entry.ms_played;

    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const weekKey = weekend ? "Weekend" : "Weekday";
    const weekRow = weekParts.get(weekKey)!;
    weekRow.plays += 1;
    weekRow.ms += entry.ms_played;

    const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist");
    artistPlays.set(artist, (artistPlays.get(artist) ?? 0) + 1);

    const song = `${normalize(entry.master_metadata_track_name, "Unknown track")}::${artist}`;
    songPlays.set(song, (songPlays.get(song) ?? 0) + 1);

    const month = entry.ts.slice(0, 7);
    const audio = estimateAudio(entry);
    const mood = moodByMonth.get(month) ?? { energy: 0, valence: 0, danceability: 0, count: 0 };
    mood.energy += audio.energy;
    mood.valence += audio.valence;
    mood.danceability += audio.danceability;
    mood.count += 1;
    moodByMonth.set(month, mood);
  }

  const sortedArtists = Array.from(artistPlays.entries()).sort((a, b) => b[1] - a[1]);
  const totalPlays = entries.length || 1;
  const topArtist = sortedArtists[0]?.[0] ?? "No data";
  const topArtistShare = (sortedArtists[0]?.[1] ?? 0) / totalPlays;
  const obsessionScore = Math.round(topArtistShare * 100);
  const obsessionLabel = obsessionScore >= 35 ? "High obsession" : obsessionScore >= 20 ? "Moderate obsession" : "Balanced variety";

  const uniqueSongs = songPlays.size || 1;
  const repeatRate = Math.max(0, (entries.length - uniqueSongs) / entries.length);
  const avgReplays = entries.length / uniqueSongs;
  const repeatScore = Math.round(Math.min(100, repeatRate * 100 + Math.max(0, avgReplays - 1) * 18));

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthEntries = allEntries.filter((entry) => entry.ts.slice(0, 7) === currentMonth);

  const firstArtistSeen = new Map<string, string>();
  const firstSongSeen = new Map<string, string>();
  for (const entry of allEntries) {
    const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist");
    const song = `${normalize(entry.master_metadata_track_name, "Unknown track")}::${artist}`;
    if (!firstArtistSeen.has(artist) || entry.ts < firstArtistSeen.get(artist)!) firstArtistSeen.set(artist, entry.ts);
    if (!firstSongSeen.has(song) || entry.ts < firstSongSeen.get(song)!) firstSongSeen.set(song, entry.ts);
  }

  const newArtists = new Set<string>();
  const newSongs = new Set<string>();
  for (const entry of currentMonthEntries) {
    const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist");
    const song = `${normalize(entry.master_metadata_track_name, "Unknown track")}::${artist}`;
    if ((firstArtistSeen.get(artist) ?? "")?.startsWith(currentMonth)) newArtists.add(artist);
    if ((firstSongSeen.get(song) ?? "")?.startsWith(currentMonth)) newSongs.add(song);
  }

  return {
    streakCurrent: streak.current,
    streakBest: streak.best,
    timeOfDay: Array.from(dayParts.entries()).map(([name, value]) => ({
      name,
      plays: value.plays,
      hours: Number((value.ms / 3600000).toFixed(1)),
    })),
    weekdayWeekend: Array.from(weekParts.entries()).map(([name, value]) => ({
      name,
      plays: value.plays,
      hours: Number((value.ms / 3600000).toFixed(1)),
    })),
    artistObsession: {
      artist: topArtist,
      share: Number((topArtistShare * 100).toFixed(1)),
      score: obsessionScore,
      label: obsessionLabel,
    },
    discovery: {
      month: currentMonth,
      newArtists: newArtists.size,
      newSongs: newSongs.size,
    },
    repeatScore: {
      score: repeatScore,
      replayRate: Number((repeatRate * 100).toFixed(1)),
      avgReplays: Number(avgReplays.toFixed(2)),
    },
    moodTrends: Array.from(moodByMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, value]) => ({
        month,
        energy: Number((value.energy / value.count).toFixed(2)),
        valence: Number((value.valence / value.count).toFixed(2)),
        danceability: Number((value.danceability / value.count).toFixed(2)),
      })),
  };
}
