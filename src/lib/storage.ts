import fs from "node:fs/promises";
import path from "node:path";
import { Snapshot } from "./types";

const dataDir = path.join(process.cwd(), "data");
const snapshotFile = path.join(dataDir, "snapshots.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(snapshotFile);
  } catch {
    await fs.writeFile(snapshotFile, "[]", "utf-8");
  }
}

export async function readSnapshots(): Promise<Snapshot[]> {
  await ensureStore();
  const raw = await fs.readFile(snapshotFile, "utf-8");
  const parsed = JSON.parse(raw) as Snapshot[];
  return parsed.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export async function appendSnapshot(snapshot: Snapshot): Promise<void> {
  const snapshots = await readSnapshots();
  snapshots.push(snapshot);
  await fs.writeFile(snapshotFile, JSON.stringify(snapshots, null, 2), "utf-8");
}
