import { NextRequest, NextResponse } from "next/server";
import { readSnapshots, writeSnapshots } from "@/lib/storage";
import { Snapshot } from "@/lib/types";

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeTrack(value: unknown, idx: number) {
  const obj = asObject(value);
  if (!obj) return null;

  const id = asString(obj.id, `track-${idx}`);
  const name = asString(obj.name, "Unknown track");
  const artistName = asString(obj.artistName, "Unknown artist");
  const albumId = asString(obj.albumId, `album-${idx}`);
  const albumName = asString(obj.albumName, "Unknown album");
  const imageUrl = asString(obj.imageUrl, "");
  const rank = Math.max(1, Math.floor(asNumber(obj.rank, idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, artistName, albumId, albumName, imageUrl, rank, score };
}

function normalizeArtist(value: unknown, idx: number) {
  const obj = asObject(value);
  if (!obj) return null;

  const id = asString(obj.id, `artist-${idx}`);
  const name = asString(obj.name, "Unknown artist");
  const imageUrl = asString(obj.imageUrl, "");
  const rank = Math.max(1, Math.floor(asNumber(obj.rank, idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, imageUrl, rank, score };
}

function normalizeAlbum(value: unknown, idx: number) {
  const obj = asObject(value);
  if (!obj) return null;

  const id = asString(obj.id, `album-${idx}`);
  const name = asString(obj.name, "Unknown album");
  const artistName = asString(obj.artistName, "Unknown artist");
  const imageUrl = asString(obj.imageUrl, "");
  const rank = Math.max(1, Math.floor(asNumber(obj.rank, idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, artistName, imageUrl, rank, score };
}

function normalizeGenre(value: unknown, idx: number) {
  const obj = asObject(value);
  if (!obj) return null;

  const id = asString(obj.id, `genre-${idx}`);
  const name = asString(obj.name, "Unknown genre");
  const rank = Math.max(1, Math.floor(asNumber(obj.rank, idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, rank, score };
}

function normalizeSnapshot(value: unknown, idx: number): Snapshot | null {
  const obj = asObject(value);
  if (!obj) return null;

  const capturedAtRaw = asString(obj.capturedAt);
  const capturedAtDate = new Date(capturedAtRaw);
  const capturedAt = Number.isNaN(capturedAtDate.getTime())
    ? new Date(Date.now() + idx).toISOString()
    : capturedAtDate.toISOString();

  const tracks = Array.isArray(obj.tracks)
    ? obj.tracks.map((item, i) => normalizeTrack(item, i)).filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  const artists = Array.isArray(obj.artists)
    ? obj.artists.map((item, i) => normalizeArtist(item, i)).filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  const albums = Array.isArray(obj.albums)
    ? obj.albums.map((item, i) => normalizeAlbum(item, i)).filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  const genres = Array.isArray(obj.genres)
    ? obj.genres.map((item, i) => normalizeGenre(item, i)).filter((item): item is NonNullable<typeof item> => item !== null)
    : undefined;

  if (!tracks.length && !artists.length && !albums.length) {
    return null;
  }

  return { capturedAt, tracks, artists, albums, genres };
}

function normalizeImportedPayload(raw: unknown): Snapshot[] {
  if (Array.isArray(raw)) {
    return raw.map((entry, idx) => normalizeSnapshot(entry, idx)).filter((entry): entry is Snapshot => entry !== null);
  }

  const obj = asObject(raw);
  if (obj && Array.isArray(obj.snapshots)) {
    return obj.snapshots
      .map((entry, idx) => normalizeSnapshot(entry, idx))
      .filter((entry): entry is Snapshot => entry !== null);
  }

  const single = normalizeSnapshot(raw, 0);
  if (single) return [single];

  throw new Error("Invalid JSON format. Expected snapshot object, snapshot array, or { snapshots: [...] }.");
}

function isFileLike(value: unknown): value is { text: () => Promise<string> } {
  return !!value && typeof value === "object" && typeof (value as { text?: unknown }).text === "function";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("snapshotFile");
    const modeRaw = formData.get("mode");
    const redirectToRaw = formData.get("redirectTo");

    if (!isFileLike(file)) {
      return NextResponse.redirect(new URL("/settings/theme?import=failed&reason=no-file", request.url), 303);
    }

    const mode = modeRaw === "replace" ? "replace" : "merge";
    const redirectTo =
      typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") ? redirectToRaw : "/settings/theme";

    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.redirect(new URL(`${redirectTo}?import=failed&reason=invalid-json`, request.url), 303);
    }

    const imported = normalizeImportedPayload(parsed);
    if (!imported.length) {
      return NextResponse.redirect(new URL(`${redirectTo}?import=failed&reason=no-valid-snapshots`, request.url), 303);
    }

    const current = await readSnapshots();
    const merged = mode === "replace" ? imported : [...current, ...imported];

    const deduped = Array.from(
      merged
        .reduce((map, snapshot) => {
          const key = snapshot.capturedAt;
          if (!map.has(key)) {
            map.set(key, snapshot);
          }
          return map;
        }, new Map<string, Snapshot>())
        .values(),
    );

    await writeSnapshots(deduped);

    return NextResponse.redirect(
      new URL(`${redirectTo}?import=ok&count=${imported.length}&mode=${mode}`, request.url),
      303,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 120) : "unknown";
    const safeReason = encodeURIComponent(reason);
    return NextResponse.redirect(new URL(`/settings/theme?import=failed&reason=${safeReason}`, request.url), 303);
  }
}
