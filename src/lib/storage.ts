import fs from "node:fs/promises";
import path from "node:path";
import { HistoryEntry } from "./types";

const dataDir = path.join(process.cwd(), "data");
const historyFile = path.join(dataDir, "history.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(historyFile);
  } catch {
    await fs.writeFile(historyFile, "[]", "utf-8");
  }
}

export async function readHistoryEntries(): Promise<HistoryEntry[]> {
  await ensureStore();
  const raw = await fs.readFile(historyFile, "utf-8");
  const parsed = JSON.parse(raw) as HistoryEntry[];
  return parsed
    .filter((entry) => typeof entry.ts === "string" && Number.isFinite(entry.ms_played))
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

export async function writeHistoryEntries(entries: HistoryEntry[]): Promise<void> {
  await ensureStore();
  const sorted = [...entries].sort((a, b) => a.ts.localeCompare(b.ts));
  await fs.writeFile(historyFile, JSON.stringify(sorted, null, 2), "utf-8");
}

export async function mergeHistoryEntries(imported: HistoryEntry[], replace = false): Promise<number> {
  const current = replace ? [] : await readHistoryEntries();
  const byKey = new Map<string, HistoryEntry>();

  for (const entry of current) {
    const key = `${entry.ts}::${entry.spotify_track_uri ?? ""}::${entry.master_metadata_track_name ?? ""}::${entry.ms_played}`;
    byKey.set(key, entry);
  }

  for (const entry of imported) {
    const key = `${entry.ts}::${entry.spotify_track_uri ?? ""}::${entry.master_metadata_track_name ?? ""}::${entry.ms_played}`;
    byKey.set(key, entry);
  }

  const merged = Array.from(byKey.values()).sort((a, b) => a.ts.localeCompare(b.ts));
  await writeHistoryEntries(merged);
  return merged.length;
}
