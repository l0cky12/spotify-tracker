import { HistoryEntry } from "@/lib/types";

type AudioProfile = {
  energy: number;
  danceability: number;
  valence: number;
  tempo: number;
  acousticness: number;
};

type TrackAgg = {
  id: string;
  uri: string;
  name: string;
  artist: string;
  album: string;
  genre: string;
  totalMs: number;
  playCount: number;
  firstPlayed: string;
  lastPlayed: string;
  audio: AudioProfile;
};

type ArtistProfile = {
  artist: string;
  audio: AudioProfile;
  totalMs: number;
};

export type PlaylistMix = {
  id: string;
  title: string;
  description: string;
  tracks: TrackAgg[];
  usableUriCount: number;
  health: { score: number; label: string; note: string };
  vibe: AudioProfile;
};

export type PlaylistInsights = {
  mixes: PlaylistMix[];
  averageVibe: AudioProfile;
  vibeSummary: string;
  topSongProfiles: Array<{ name: string; artist: string; audio: AudioProfile }>;
  topArtistProfiles: ArtistProfile[];
  moodClusters: Array<{ name: string; count: number }>;
};

function normalize(value: string | null | undefined, fallback: string): string {
  const out = (value ?? "").trim();
  return out.length ? out : fallback;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function genreForEntry(entry: HistoryEntry): string {
  const inferred = normalize(entry.inferred_genre, "");
  if (inferred) return inferred;
  const album = normalize(entry.master_metadata_album_album_name, "unknown album").toLowerCase();
  const artist = normalize(entry.master_metadata_album_artist_name, "unknown artist").toLowerCase();
  if (album.includes("greatest hits") || album.includes("best of")) return "Compilation";
  if (artist.includes("dj") || album.includes("mix") || album.includes("remix")) return "Electronic / Mix";
  if (album.includes("live")) return "Live";
  return "Other";
}

function estimateAudio(entry: HistoryEntry): AudioProfile {
  const text = `${normalize(entry.master_metadata_track_name, "")} ${normalize(entry.master_metadata_album_album_name, "")} ${normalize(entry.master_metadata_album_artist_name, "")}`.toLowerCase();
  const genre = genreForEntry(entry).toLowerCase();

  let energy = 0.55;
  let danceability = 0.5;
  let valence = 0.52;
  let acousticness = 0.25;
  let tempo = 118;

  if (genre.includes("electronic") || text.includes("remix") || text.includes("club")) {
    energy += 0.2;
    danceability += 0.2;
    tempo += 18;
    acousticness -= 0.1;
  }
  if (text.includes("acoustic") || genre.includes("live") || text.includes("piano")) {
    acousticness += 0.35;
    energy -= 0.18;
    tempo -= 12;
  }
  if (text.includes("dance") || text.includes("party")) {
    danceability += 0.18;
    energy += 0.1;
  }
  if (text.includes("sad") || text.includes("blue") || text.includes("tears")) {
    valence -= 0.24;
  }
  if (text.includes("happy") || text.includes("love") || text.includes("sun")) {
    valence += 0.2;
  }

  return {
    energy: clamp01(energy),
    danceability: clamp01(danceability),
    valence: clamp01(valence),
    tempo: Math.max(60, Math.min(180, tempo)),
    acousticness: clamp01(acousticness),
  };
}

function weightedAverage(items: Array<{ audio: AudioProfile; weight: number }>): AudioProfile {
  const total = items.reduce((sum, item) => sum + item.weight, 0) || 1;
  const acc = items.reduce(
    (sum, item) => ({
      energy: sum.energy + item.audio.energy * item.weight,
      danceability: sum.danceability + item.audio.danceability * item.weight,
      valence: sum.valence + item.audio.valence * item.weight,
      tempo: sum.tempo + item.audio.tempo * item.weight,
      acousticness: sum.acousticness + item.audio.acousticness * item.weight,
    }),
    { energy: 0, danceability: 0, valence: 0, tempo: 0, acousticness: 0 },
  );

  return {
    energy: Number((acc.energy / total).toFixed(2)),
    danceability: Number((acc.danceability / total).toFixed(2)),
    valence: Number((acc.valence / total).toFixed(2)),
    tempo: Number((acc.tempo / total).toFixed(0)),
    acousticness: Number((acc.acousticness / total).toFixed(2)),
  };
}

function trackId(entry: HistoryEntry): string {
  const track = normalize(entry.master_metadata_track_name, "Unknown track");
  const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist");
  return entry.spotify_track_uri?.trim() || `${track}::${artist}`;
}

function aggregateTracks(entries: HistoryEntry[]): TrackAgg[] {
  const map = new Map<string, TrackAgg>();

  for (const entry of entries) {
    if (entry.ms_played < 30_000) continue;
    const id = trackId(entry);
    const name = normalize(entry.master_metadata_track_name, "Unknown track");
    const artist = normalize(entry.master_metadata_album_artist_name, "Unknown artist");
    const album = normalize(entry.master_metadata_album_album_name, "Unknown album");
    const genre = genreForEntry(entry);
    const uri = entry.spotify_track_uri?.trim() || "";
    const profile = estimateAudio(entry);

    const current = map.get(id);
    if (!current) {
      map.set(id, {
        id,
        uri,
        name,
        artist,
        album,
        genre,
        totalMs: entry.ms_played,
        playCount: 1,
        firstPlayed: entry.ts,
        lastPlayed: entry.ts,
        audio: profile,
      });
      continue;
    }

    const totalWeight = current.totalMs + entry.ms_played;
    current.audio = {
      energy: Number(((current.audio.energy * current.totalMs + profile.energy * entry.ms_played) / totalWeight).toFixed(2)),
      danceability: Number(((current.audio.danceability * current.totalMs + profile.danceability * entry.ms_played) / totalWeight).toFixed(2)),
      valence: Number(((current.audio.valence * current.totalMs + profile.valence * entry.ms_played) / totalWeight).toFixed(2)),
      tempo: Number(((current.audio.tempo * current.totalMs + profile.tempo * entry.ms_played) / totalWeight).toFixed(0)),
      acousticness: Number(((current.audio.acousticness * current.totalMs + profile.acousticness * entry.ms_played) / totalWeight).toFixed(2)),
    };

    current.totalMs += entry.ms_played;
    current.playCount += 1;
    if (entry.ts < current.firstPlayed) current.firstPlayed = entry.ts;
    if (entry.ts > current.lastPlayed) current.lastPlayed = entry.ts;
    if (!current.uri && uri) current.uri = uri;
  }

  return Array.from(map.values()).sort((a, b) => b.totalMs - a.totalMs || b.playCount - a.playCount);
}

function playlistHealth(tracks: TrackAgg[]): { score: number; label: string; note: string } {
  if (!tracks.length) return { score: 0, label: "No Data", note: "No tracks available." };
  const top = tracks.slice(0, 30);
  const artistSet = new Set(top.map((track) => track.artist));
  const genreSet = new Set(top.map((track) => track.genre));
  const total = top.reduce((sum, track) => sum + track.totalMs, 0) || 1;
  const topTrackShare = (top[0]?.totalMs ?? 0) / total;

  const diversityScore = Math.min(1, artistSet.size / Math.max(8, top.length * 0.45));
  const genreScore = Math.min(1, genreSet.size / 6);
  const repetitionPenalty = Math.max(0, 1 - topTrackShare * 2.2);

  const score = Math.round((diversityScore * 0.45 + genreScore * 0.3 + repetitionPenalty * 0.25) * 100);

  if (score >= 75) return { score, label: "Very Diverse", note: "Wide artist and genre spread." };
  if (score >= 50) return { score, label: "Balanced", note: "Good mix with some repeats." };
  if (genreSet.size <= 2) return { score, label: "Too Narrow", note: "Try adding more genres." };
  return { score, label: "Too Repetitive", note: "Top tracks dominate this mix." };
}

function vibeSummary(profile: AudioProfile): string {
  const energy = profile.energy >= 0.62 ? "high energy" : profile.energy <= 0.4 ? "low energy" : "mid energy";
  const acoustic = profile.acousticness >= 0.55 ? "high acoustic" : profile.acousticness <= 0.25 ? "low acoustic" : "mid acoustic";
  return `Your music is ${energy} and ${acoustic}.`;
}

function clusterName(audio: AudioProfile): string {
  if (audio.energy > 0.65 && audio.valence > 0.55) return "Hype / Uplifting";
  if (audio.energy > 0.6 && audio.valence <= 0.55) return "Intense / Moody";
  if (audio.energy <= 0.6 && audio.valence > 0.55) return "Chill / Bright";
  return "Reflective / Melancholy";
}

function dedupeById(list: TrackAgg[]): TrackAgg[] {
  const seen = new Set<string>();
  const out: TrackAgg[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function buildPlaylistInsights(entries: HistoryEntry[], now = new Date()): PlaylistInsights {
  const tracks = aggregateTracks(entries);
  const nowMs = now.getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const thisMonth = tracks
    .filter((track) => track.lastPlayed >= monthStart)
    .sort((a, b) => b.playCount - a.playCount || b.totalMs - a.totalMs)
    .slice(0, 30);

  const underrated = tracks
    .filter((track) => track.playCount >= 2 && track.playCount <= 6)
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 30);

  const forgotten = tracks
    .filter((track) => nowMs - new Date(track.lastPlayed).getTime() > 1000 * 60 * 60 * 24 * 90)
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 30);

  const rediscovery = dedupeById([...forgotten.slice(0, 15), ...underrated.slice(0, 15)]).slice(0, 30);

  const topGenre = (() => {
    const byGenre = new Map<string, number>();
    for (const track of tracks) byGenre.set(track.genre, (byGenre.get(track.genre) ?? 0) + track.totalMs);
    return Array.from(byGenre.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  })();

  const genreAuto = tracks.filter((track) => track.genre === topGenre).slice(0, 30);

  const moodBuilder = tracks
    .filter((track) => track.audio.energy >= 0.55 && track.audio.valence >= 0.5)
    .sort((a, b) => b.audio.danceability - a.audio.danceability)
    .slice(0, 30);

  const mixesBase = [
    {
      id: "most-played-month",
      title: "Most Played This Month",
      description: "Auto-generated from tracks you replayed most in the current month.",
      tracks: thisMonth,
    },
    {
      id: "underrated-favorites",
      title: "Underrated Favorites",
      description: "Strong repeat tracks that are not your obvious top-10 staples.",
      tracks: underrated,
    },
    {
      id: "forgotten-songs",
      title: "Forgotten Songs",
      description: "Tracks you used to play, but have not heard in a while.",
      tracks: forgotten,
    },
    {
      id: "rediscovery",
      title: "Rediscovery Playlist",
      description: "A blend of forgotten and underrated songs for fresh replay sessions.",
      tracks: rediscovery,
    },
    {
      id: "genre-auto",
      title: "Genre-Based Auto Playlist",
      description: `Built from your dominant genre${topGenre ? `: ${topGenre}` : ""}.`,
      tracks: genreAuto,
    },
    {
      id: "mood-builder",
      title: "Mood Playlist Builder",
      description: "Generated from your upbeat/high-energy listening profile.",
      tracks: moodBuilder,
    },
  ];

  const mixes: PlaylistMix[] = mixesBase.map((mix) => ({
    ...mix,
    tracks: mix.tracks,
    usableUriCount: mix.tracks.filter((track) => Boolean(track.uri)).length,
    health: playlistHealth(mix.tracks),
    vibe: weightedAverage(mix.tracks.map((track) => ({ audio: track.audio, weight: track.totalMs }))),
  }));

  const averageVibe = weightedAverage(tracks.map((track) => ({ audio: track.audio, weight: track.totalMs })));

  const artistMap = new Map<string, { totalMs: number; audioItems: Array<{ audio: AudioProfile; weight: number }> }>();
  for (const track of tracks) {
    const current = artistMap.get(track.artist);
    if (!current) {
      artistMap.set(track.artist, { totalMs: track.totalMs, audioItems: [{ audio: track.audio, weight: track.totalMs }] });
      continue;
    }
    current.totalMs += track.totalMs;
    current.audioItems.push({ audio: track.audio, weight: track.totalMs });
  }

  const topArtistProfiles: ArtistProfile[] = Array.from(artistMap.entries())
    .map(([artist, value]) => ({
      artist,
      totalMs: value.totalMs,
      audio: weightedAverage(value.audioItems),
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 8);

  const moodClusterMap = new Map<string, number>();
  for (const track of tracks) {
    const cluster = clusterName(track.audio);
    moodClusterMap.set(cluster, (moodClusterMap.get(cluster) ?? 0) + 1);
  }

  return {
    mixes,
    averageVibe,
    vibeSummary: vibeSummary(averageVibe),
    topSongProfiles: tracks.slice(0, 10).map((track) => ({ name: track.name, artist: track.artist, audio: track.audio })),
    topArtistProfiles,
    moodClusters: Array.from(moodClusterMap.entries()).map(([name, count]) => ({ name, count })),
  };
}
