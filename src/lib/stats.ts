import { CollectionStats, Snapshot } from "./types";

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

export function buildCollectionStats<T>(
  snapshots: Snapshot[],
  getItems: ItemGetter<T>,
  getId: IdGetter<T>,
  getName: NameGetter<T>,
  getImage: ImageGetter<T>,
  getSubtitle: SubGetter<T>,
  getRank: RankGetter<T>,
  getScore: ScoreGetter<T>,
): CollectionStats[] {
  const latest = latestSnapshot(snapshots);
  if (!latest) return [];

  const currentRanks = new Map<string, number>();
  for (const item of getItems(latest)) {
    currentRanks.set(getId(item), getRank(item));
  }

  const store = new Map<string, CollectionStats>();

  for (const snapshot of snapshots) {
    for (const item of getItems(snapshot)) {
      const id = getId(item);
      const existing = store.get(id);
      const point = {
        capturedAt: snapshot.capturedAt,
        rank: getRank(item),
        score: getScore(item),
      };

      if (!existing) {
        store.set(id, {
          id,
          name: getName(item),
          imageUrl: getImage(item),
          subtitle: getSubtitle(item),
          currentRank: currentRanks.get(id) ?? 999,
          appearances: 1,
          avgScore: getScore(item),
          trend: [point],
        });
        continue;
      }

      existing.appearances += 1;
      existing.avgScore += getScore(item);
      existing.trend.push(point);
      existing.currentRank = currentRanks.get(id) ?? 999;
    }
  }

  return Array.from(store.values())
    .map((entry) => ({
      ...entry,
      avgScore: Number((entry.avgScore / entry.appearances).toFixed(2)),
      trend: entry.trend.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)),
    }))
    .sort((a, b) => a.currentRank - b.currentRank || b.avgScore - a.avgScore);
}
