import { Snapshot } from "./types";
import { TimeRange } from "./time-range";

export type RelatedTrackStat = {
  id: string;
  name: string;
  artistName: string;
  imageUrl: string;
  hours: number;
  appearances: number;
};

type IntervalRow = {
  snapshot: Snapshot;
  listeningHours: number;
};

function parseSnapshotDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEstimatedHoursPerDay(): number {
  const envHours = Number(process.env.ESTIMATED_LISTENING_HOURS_PER_DAY ?? "2");
  return Number.isFinite(envHours) && envHours > 0 ? envHours : 2;
}

function buildIntervals(snapshots: Snapshot[], range?: TimeRange): IntervalRow[] {
  const estimatedHoursPerDay = getEstimatedHoursPerDay();
  const rows: IntervalRow[] = [];

  for (let index = 0; index < snapshots.length; index += 1) {
    const snapshot = snapshots[index];
    const snapshotAt = parseSnapshotDate(snapshot.capturedAt);
    if (!snapshotAt) continue;
    if (range && (snapshotAt < range.start || snapshotAt > range.end)) continue;

    const nextSnapshot = snapshots[index + 1];
    const nextAt = (nextSnapshot ? parseSnapshotDate(nextSnapshot.capturedAt) : null) ?? new Date();
    const clampedStart = range ? new Date(Math.max(snapshotAt.getTime(), range.start.getTime())) : snapshotAt;
    const clampedEnd = range ? new Date(Math.min(nextAt.getTime(), range.end.getTime())) : nextAt;
    const intervalHours = Math.max(0, (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60));
    rows.push({
      snapshot,
      listeningHours: intervalHours * (estimatedHoursPerDay / 24),
    });
  }

  return rows;
}

function mergeTrackRow(
  store: Map<string, RelatedTrackStat>,
  track: Snapshot["tracks"][number],
  hours: number,
) {
  const existing = store.get(track.id);
  if (!existing) {
    store.set(track.id, {
      id: track.id,
      name: track.name,
      artistName: track.artistName,
      imageUrl: track.imageUrl,
      hours,
      appearances: 1,
    });
    return;
  }

  existing.hours += hours;
  existing.appearances += 1;
}

export function buildSongRelatedTracks(snapshots: Snapshot[], range: TimeRange | undefined, songId: string): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();

  for (const { snapshot, listeningHours } of buildIntervals(snapshots, range)) {
    const track = snapshot.tracks.find((item) => item.id === songId);
    if (!track || listeningHours <= 0) continue;

    const totalTrackScore = snapshot.tracks.reduce((sum, item) => sum + Math.max(item.score, 0), 0);
    const hours = totalTrackScore > 0 ? listeningHours * (Math.max(track.score, 0) / totalTrackScore) : 0;
    if (hours <= 0) continue;
    mergeTrackRow(store, track, hours);
  }

  return Array.from(store.values())
    .map((item) => ({ ...item, hours: Number(item.hours.toFixed(2)) }))
    .sort((a, b) => b.hours - a.hours || b.appearances - a.appearances);
}

export function buildAlbumRelatedTracks(snapshots: Snapshot[], range: TimeRange | undefined, albumId: string): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();

  for (const { snapshot, listeningHours } of buildIntervals(snapshots, range)) {
    if (listeningHours <= 0) continue;
    const totalTrackScore = snapshot.tracks.reduce((sum, item) => sum + Math.max(item.score, 0), 0);
    if (totalTrackScore <= 0) continue;

    for (const track of snapshot.tracks) {
      if (track.albumId !== albumId) continue;
      const hours = listeningHours * (Math.max(track.score, 0) / totalTrackScore);
      if (hours <= 0) continue;
      mergeTrackRow(store, track, hours);
    }
  }

  return Array.from(store.values())
    .map((item) => ({ ...item, hours: Number(item.hours.toFixed(2)) }))
    .sort((a, b) => b.hours - a.hours || b.appearances - a.appearances);
}

export function buildArtistRelatedTracks(
  snapshots: Snapshot[],
  range: TimeRange | undefined,
  artistId: string,
  artistName: string,
): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();
  const artistMatch = artistName.toLowerCase();

  for (const { snapshot, listeningHours } of buildIntervals(snapshots, range)) {
    const artist = snapshot.artists.find((item) => item.id === artistId);
    if (!artist || listeningHours <= 0) continue;
    const totalArtistScore = snapshot.artists.reduce((sum, item) => sum + Math.max(item.score, 0), 0);
    if (totalArtistScore <= 0) continue;

    const artistHours = listeningHours * (Math.max(artist.score, 0) / totalArtistScore);
    const matchingTracks = snapshot.tracks.filter((track) => track.artistName.toLowerCase().includes(artistMatch));
    const matchingScore = matchingTracks.reduce((sum, track) => sum + Math.max(track.score, 0), 0);
    if (!matchingTracks.length || matchingScore <= 0 || artistHours <= 0) continue;

    for (const track of matchingTracks) {
      const hours = artistHours * (Math.max(track.score, 0) / matchingScore);
      if (hours <= 0) continue;
      mergeTrackRow(store, track, hours);
    }
  }

  return Array.from(store.values())
    .map((item) => ({ ...item, hours: Number(item.hours.toFixed(2)) }))
    .sort((a, b) => b.hours - a.hours || b.appearances - a.appearances);
}

export function buildGenreRelatedTracks(
  snapshots: Snapshot[],
  range: TimeRange | undefined,
  genreId: string,
): RelatedTrackStat[] {
  const store = new Map<string, RelatedTrackStat>();

  for (const { snapshot, listeningHours } of buildIntervals(snapshots, range)) {
    const genres = snapshot.genres ?? [];
    const genre = genres.find((item) => item.id === genreId);
    if (!genre || listeningHours <= 0) continue;
    const totalGenreScore = genres.reduce((sum, item) => sum + Math.max(item.score, 0), 0);
    const totalTrackScore = snapshot.tracks.reduce((sum, item) => sum + Math.max(item.score, 0), 0);
    if (totalGenreScore <= 0 || totalTrackScore <= 0) continue;

    const genreHours = listeningHours * (Math.max(genre.score, 0) / totalGenreScore);
    for (const track of snapshot.tracks) {
      const hours = genreHours * (Math.max(track.score, 0) / totalTrackScore);
      if (hours <= 0) continue;
      mergeTrackRow(store, track, hours);
    }
  }

  return Array.from(store.values())
    .map((item) => ({ ...item, hours: Number(item.hours.toFixed(2)) }))
    .sort((a, b) => b.hours - a.hours || b.appearances - a.appearances);
}
