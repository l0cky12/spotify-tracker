import { NextRequest, NextResponse } from "next/server";
import { readSnapshots, writeSnapshots } from "@/lib/storage";
import { Snapshot } from "@/lib/types";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTrackStat(value: unknown): boolean {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.artistName) &&
    isString(value.albumId) &&
    isString(value.albumName) &&
    isString(value.imageUrl) &&
    isNumber(value.rank) &&
    isNumber(value.score)
  );
}

function isArtistStat(value: unknown): boolean {
  if (!isObject(value)) return false;
  return isString(value.id) && isString(value.name) && isString(value.imageUrl) && isNumber(value.rank) && isNumber(value.score);
}

function isAlbumStat(value: unknown): boolean {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.artistName) &&
    isString(value.imageUrl) &&
    isNumber(value.rank) &&
    isNumber(value.score)
  );
}

function isGenreStat(value: unknown): boolean {
  if (!isObject(value)) return false;
  return isString(value.id) && isString(value.name) && isNumber(value.rank) && isNumber(value.score);
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!isObject(value)) return false;
  const capturedAt = value.capturedAt;
  const tracks = value.tracks;
  const artists = value.artists;
  const albums = value.albums;
  const genres = value.genres;

  if (!isString(capturedAt) || Number.isNaN(new Date(capturedAt).getTime())) return false;
  if (!Array.isArray(tracks) || !tracks.every(isTrackStat)) return false;
  if (!Array.isArray(artists) || !artists.every(isArtistStat)) return false;
  if (!Array.isArray(albums) || !albums.every(isAlbumStat)) return false;
  if (genres !== undefined && (!Array.isArray(genres) || !genres.every(isGenreStat))) return false;

  return true;
}

function normalizeImportedPayload(raw: unknown): Snapshot[] {
  if (Array.isArray(raw) && raw.every(isSnapshot)) {
    return raw;
  }

  if (isObject(raw) && Array.isArray(raw.snapshots) && raw.snapshots.every(isSnapshot)) {
    return raw.snapshots;
  }

  throw new Error("Invalid JSON format. Expected an array of snapshots or { snapshots: [...] }.");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("snapshotFile");
    const modeRaw = formData.get("mode");
    const redirectToRaw = formData.get("redirectTo");

    if (!(file instanceof File)) {
      const fail = NextResponse.redirect(new URL("/settings/theme?import=failed&reason=no-file", request.url), 303);
      return fail;
    }

    const mode = modeRaw === "replace" ? "replace" : "merge";
    const redirectTo =
      typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") ? redirectToRaw : "/settings/theme";

    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const imported = normalizeImportedPayload(parsed);

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

    const response = NextResponse.redirect(
      new URL(`${redirectTo}?import=ok&count=${imported.length}&mode=${mode}`, request.url),
      303,
    );
    return response;
  } catch (error) {
    const reason =
      error instanceof Error ? encodeURIComponent(error.message.slice(0, 120)) : "unknown";
    return NextResponse.redirect(new URL(`/settings/theme?import=failed&reason=${reason}`, request.url), 303);
  }
}
