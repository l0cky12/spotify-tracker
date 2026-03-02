import { CollectionStats, Snapshot } from "./types";
import { TimeRange } from "./time-range";

export function latestSnapshot(snapshots: Snapshot[]): Snapshot | undefined {
  return snapshots[snapshots.length - 1];
}

type ItemGetter<T> = (snapshot: Snapshot) => T[];
type IdGetter<T> = (item: T) => string;
type NameGetter<T> = (item: T) => string;
type ImageGetter<T> = (item: T) => string;
type SubGetter<T> = (item: T) => string | undefined;
type RankGetter<T> = (item: T) => number;
type ScoreGetter<T> = (item: T) => number;

function parseSnapshotDate(value: string): Date | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function snapshotsInRange(snapshots: Snapshot[], range?: TimeRange): Snapshot[] {
  if (!range) return snapshots;
  return snapshots.filter((snapshot) => {
    const capturedAt = parseSnapshotDate(snapshot.capturedAt);
    if (!capturedAt) return false;
    return capturedAt >= range.start && capturedAt <= range.end;
  });
}

export function buildCollectionStats<T>(
  snapshots: Snapshot[],
  getItems: ItemGetter<T>,
  getId: IdGetter<T>,
  getName: NameGetter<T>,
  getImage: ImageGetter<T>,
  getSubtitle: SubGetter<T>,
  getRank: RankGetter<T>,
  getScore: ScoreGetter<T>,
  options?: {
    range?: TimeRange;
    estimatedHoursPerDay?: number;
  },
): CollectionStats[] {
  const range = options?.range;
  const envHours = Number(process.env.ESTIMATED_LISTENING_HOURS_PER_DAY ?? "2");
  const estimatedHoursPerDay = options?.estimatedHoursPerDay ?? (Number.isFinite(envHours) && envHours > 0 ? envHours : 2);
  const windowedSnapshots = snapshotsInRange(snapshots, range);

  const latest = latestSnapshot(windowedSnapshots);
  if (!latest) return [];

  const currentRanks = new Map<string, number>();
  for (const item of getItems(latest)) {
    currentRanks.set(getId(item), getRank(item));
  }

  const store = new Map<string, CollectionStats>();

  for (let index = 0; index < windowedSnapshots.length; index += 1) {
    const snapshot = windowedSnapshots[index];
    const snapshotAt = parseSnapshotDate(snapshot.capturedAt);
    if (!snapshotAt) continue;
    const nextSnapshot = windowedSnapshots[index + 1];
    const nextAt =
      (nextSnapshot ? parseSnapshotDate(nextSnapshot.capturedAt) : undefined) ?? new Date();

    const clampedStart = range ? new Date(Math.max(snapshotAt.getTime(), range.start.getTime())) : snapshotAt;
    const clampedEnd = range ? new Date(Math.min(nextAt.getTime(), range.end.getTime())) : nextAt;
    const intervalHours = Math.max(0, (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60));
    const intervalListeningHours = intervalHours * (estimatedHoursPerDay / 24);

    const items = getItems(snapshot);
    const totalScore = items.reduce((sum, item) => sum + Math.max(getScore(item), 0), 0);

    for (const item of items) {
      const id = getId(item);
      const existing = store.get(id);
      const point = {
        capturedAt: snapshot.capturedAt,
        rank: getRank(item),
        score: getScore(item),
      };
      const share = totalScore > 0 ? Math.max(getScore(item), 0) / totalScore : 0;
      const itemHours = intervalListeningHours * share;

      if (!existing) {
        store.set(id, {
          id,
          name: getName(item),
          imageUrl: getImage(item),
          subtitle: getSubtitle(item),
          currentRank: currentRanks.get(id) ?? 999,
          appearances: 1,
          avgScore: getScore(item),
          totalHours: itemHours,
          trend: [point],
        });
        continue;
      }

      existing.appearances += 1;
      existing.avgScore += getScore(item);
      existing.totalHours += itemHours;
      existing.trend.push(point);
      existing.currentRank = currentRanks.get(id) ?? 999;
    }
  }

  return Array.from(store.values())
    .map((entry) => ({
      ...entry,
      avgScore: Number((entry.avgScore / entry.appearances).toFixed(2)),
      totalHours: Number(entry.totalHours.toFixed(2)),
      trend: entry.trend.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)),
    }))
    .sort((a, b) => b.totalHours - a.totalHours || a.currentRank - b.currentRank || b.avgScore - a.avgScore);
}
