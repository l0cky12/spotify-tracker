import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
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

function firstString(obj: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function firstNumber(obj: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return fallback;
}

function arrayFromField(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const obj = asObject(value);
  if (obj && Array.isArray(obj.items)) return obj.items;
  return [];
}

function firstArray(obj: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const arr = arrayFromField(obj[key]);
    if (arr.length) return arr;
  }
  return [];
}

function normalizeTrack(value: unknown, idx: number) {
  const obj = asObject(value);
  if (!obj) return null;

  const artistsRaw = obj.artists;
  const artistName =
    typeof obj.artistName === "string"
      ? obj.artistName
      : typeof obj.artist === "string"
        ? obj.artist
        : Array.isArray(artistsRaw)
          ? artistsRaw
              .map((artist) => {
                if (typeof artist === "string") return artist;
                const artistObj = asObject(artist);
                return artistObj ? asString(artistObj.name) : "";
              })
              .filter(Boolean)
              .join(", ")
          : "Unknown artist";
  const albumObj = asObject(obj.album);
  const albumImages = albumObj?.images;
  const albumImage = Array.isArray(albumImages)
    ? asString((asObject(albumImages[0]) ?? {}).url)
    : "";

  const id = firstString(obj, ["id", "trackId", "uri"], `track-${idx}`);
  const name = firstString(obj, ["name", "trackName", "title"], "Unknown track");
  const albumId = firstString(obj, ["albumId"], asString(albumObj?.id, `album-${idx}`));
  const albumName = firstString(obj, ["albumName", "album"], asString(albumObj?.name, "Unknown album"));
  const imageUrl = firstString(obj, ["imageUrl", "coverUrl"], albumImage);
  const rank = Math.max(1, Math.floor(firstNumber(obj, ["rank", "position", "index"], idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, artistName, albumId, albumName, imageUrl, rank, score };
}

function normalizeArtist(value: unknown, idx: number) {
  const obj = asObject(value);
  if (!obj) return null;

  const images = obj.images;
  const imageFromImages = Array.isArray(images)
    ? asString((asObject(images[0]) ?? {}).url)
    : "";

  const id = firstString(obj, ["id", "artistId", "uri"], `artist-${idx}`);
  const name = firstString(obj, ["name", "artistName"], "Unknown artist");
  const imageUrl = firstString(obj, ["imageUrl"], imageFromImages);
  const rank = Math.max(1, Math.floor(firstNumber(obj, ["rank", "position", "index"], idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, imageUrl, rank, score };
}

function normalizeAlbum(value: unknown, idx: number) {
  const obj = asObject(value);
  if (!obj) return null;

  const images = obj.images;
  const imageFromImages = Array.isArray(images)
    ? asString((asObject(images[0]) ?? {}).url)
    : "";

  const id = firstString(obj, ["id", "albumId", "uri"], `album-${idx}`);
  const name = firstString(obj, ["name", "albumName", "title"], "Unknown album");
  const artistName = firstString(obj, ["artistName", "artist"], "Unknown artist");
  const imageUrl = firstString(obj, ["imageUrl"], imageFromImages);
  const rank = Math.max(1, Math.floor(firstNumber(obj, ["rank", "position", "index"], idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, artistName, imageUrl, rank, score };
}

function normalizeGenre(value: unknown, idx: number) {
  if (typeof value === "string") {
    const id = value.toLowerCase().replace(/\s+/g, "-");
    return { id, name: value, rank: idx + 1, score: Math.max(1, 51 - idx) };
  }

  const obj = asObject(value);
  if (!obj) return null;

  const name = firstString(obj, ["name", "genre"], "Unknown genre");
  const id = firstString(obj, ["id"], name.toLowerCase().replace(/\s+/g, "-") || `genre-${idx}`);
  const rank = Math.max(1, Math.floor(firstNumber(obj, ["rank", "position", "index"], idx + 1)));
  const score = asNumber(obj.score, Math.max(1, 51 - rank));

  return { id, name, rank, score };
}

function normalizeSnapshot(value: unknown, idx: number, fallbackCapturedAt?: string): Snapshot | null {
  const obj = asObject(value);
  if (!obj) return null;

  const capturedAtRaw = firstString(obj, ["capturedAt", "captured_at", "generatedAt", "createdAt"], fallbackCapturedAt ?? "");
  const capturedAtDate = new Date(capturedAtRaw);
  const capturedAt = Number.isNaN(capturedAtDate.getTime())
    ? new Date(Date.now() + idx).toISOString()
    : capturedAtDate.toISOString();

  const tracks = firstArray(obj, ["tracks", "topTracks", "top_tracks", "songs"])
    .map((item, i) => normalizeTrack(item, i))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const artists = firstArray(obj, ["artists", "topArtists", "top_artists"])
    .map((item, i) => normalizeArtist(item, i))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const albums = firstArray(obj, ["albums", "topAlbums", "top_albums"])
    .map((item, i) => normalizeAlbum(item, i))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const genresRaw = firstArray(obj, ["genres", "topGenres", "top_genres"]);
  const genres = genresRaw.length
    ? genresRaw.map((item, i) => normalizeGenre(item, i)).filter((item): item is NonNullable<typeof item> => item !== null)
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

  if (obj) {
    const mediumTerm = asObject(obj.medium_term);
    const shortTerm = asObject(obj.short_term);
    const longTerm = asObject(obj.long_term);
    const fromNested = normalizeSnapshot(mediumTerm ?? shortTerm ?? longTerm, 0, asString(obj.capturedAt));
    if (fromNested) return [fromNested];
  }

  const single = normalizeSnapshot(raw, 0);
  if (single) return [single];

  throw new Error("Invalid JSON format. Expected Spotify stats data with tracks/artists/albums.");
}

function isFileLike(value: unknown): value is { text: () => Promise<string> } {
  return !!value && typeof value === "object" && typeof (value as { text?: unknown }).text === "function";
}

export async function POST(request: NextRequest) {
  try {
    const appBaseUrl = getAppBaseUrl(request);
    const formData = await request.formData();
    const file = formData.get("snapshotFile");
    const modeRaw = formData.get("mode");
    const redirectToRaw = formData.get("redirectTo");

    if (!isFileLike(file)) {
      return NextResponse.redirect(new URL("/settings/theme?import=failed&reason=no-file", appBaseUrl), 303);
    }

    const mode = modeRaw === "replace" ? "replace" : "merge";
    const redirectTo =
      typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") ? redirectToRaw : "/settings/theme";

    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.redirect(new URL(`${redirectTo}?import=failed&reason=invalid-json`, appBaseUrl), 303);
    }

    const imported = normalizeImportedPayload(parsed);
    if (!imported.length) {
      return NextResponse.redirect(new URL(`${redirectTo}?import=failed&reason=no-valid-data`, appBaseUrl), 303);
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
      new URL(`${redirectTo}?import=ok&count=${imported.length}&mode=${mode}`, appBaseUrl),
      303,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 120) : "unknown";
    const safeReason = encodeURIComponent(reason);
    return NextResponse.redirect(new URL(`/settings/theme?import=failed&reason=${safeReason}`, getAppBaseUrl(request)), 303);
  }
}
