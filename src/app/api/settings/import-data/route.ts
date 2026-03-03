import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { mergeHistoryEntries } from "@/lib/storage";
import { HistoryEntry } from "@/lib/types";
import { enrichHistoryGenres } from "@/lib/genre-enrichment";

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isFileLike(value: unknown): value is { text: () => Promise<string> } {
  return !!value && typeof value === "object" && typeof (value as { text?: unknown }).text === "function";
}

function normalizeEntry(value: unknown): HistoryEntry | null {
  const obj = asObject(value);
  if (!obj) return null;

  const ts = asString(obj.ts);
  const msPlayed = asNumber(obj.ms_played);
  const track = asString(obj.master_metadata_track_name);

  if (!ts || msPlayed === null || !track) {
    return null;
  }

  return {
    ts,
    ms_played: msPlayed,
    master_metadata_track_name: track,
    master_metadata_album_artist_name: asString(obj.master_metadata_album_artist_name),
    master_metadata_album_album_name: asString(obj.master_metadata_album_album_name),
    spotify_track_uri: asString(obj.spotify_track_uri),
    inferred_genre: asString(obj.inferred_genre),
    reason_start: asString(obj.reason_start),
    reason_end: asString(obj.reason_end),
    shuffle: typeof obj.shuffle === "boolean" ? obj.shuffle : undefined,
    skipped: typeof obj.skipped === "boolean" ? obj.skipped : undefined,
  };
}

function extractEntries(raw: unknown): HistoryEntry[] {
  if (Array.isArray(raw)) {
    return raw.map(normalizeEntry).filter((entry): entry is HistoryEntry => entry !== null);
  }

  const obj = asObject(raw);
  if (!obj) return [];

  const candidates = [obj.entries, obj.history, obj.streaming_history, obj.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map(normalizeEntry)
        .filter((entry): entry is HistoryEntry => entry !== null);
    }
  }

  const single = normalizeEntry(obj);
  return single ? [single] : [];
}

export async function POST(request: NextRequest) {
  try {
    const appBaseUrl = getAppBaseUrl(request);
    const formData = await request.formData();
    const fileCandidates = [
      ...formData.getAll("historyFile"),
      ...formData.getAll("snapshotFile"),
    ];
    const files: Array<{ text: () => Promise<string> }> = [];
    for (const candidate of fileCandidates) {
      if (isFileLike(candidate)) files.push(candidate);
    }
    const modeRaw = formData.get("mode");
    const redirectToRaw = formData.get("redirectTo");

    if (!files.length) {
      return NextResponse.redirect(new URL("/settings/theme?import=failed&reason=no-file", appBaseUrl), 303);
    }

    const mode = modeRaw === "replace" ? "replace" : "merge";
    const redirectTo = typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") ? redirectToRaw : "/settings/theme";

    const imported: HistoryEntry[] = [];
    let invalidCount = 0;
    for (const file of files) {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        invalidCount += 1;
        continue;
      }
      imported.push(...extractEntries(parsed));
    }

    if (!imported.length) {
      const reason = invalidCount ? "invalid-json" : "no-valid-history";
      return NextResponse.redirect(new URL(`${redirectTo}?import=failed&reason=${reason}`, appBaseUrl), 303);
    }

    const enriched = await enrichHistoryGenres(imported);
    const totalCount = await mergeHistoryEntries(enriched, mode === "replace");

    return NextResponse.redirect(
      new URL(`${redirectTo}?import=ok&count=${enriched.length}&total=${totalCount}&mode=${mode}`, appBaseUrl),
      303,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 120) : "unknown";
    const safeReason = encodeURIComponent(reason);
    return NextResponse.redirect(
      new URL(`/settings/theme?import=failed&reason=${safeReason}`, getAppBaseUrl(request)),
      303,
    );
  }
}
