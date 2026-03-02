import { HistoryEntry } from "./types";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function toBasicAuth(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  return Buffer.from(raw).toString("base64");
}

export async function exchangeCodeForRefreshToken(code: string) {
  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");
  const redirectUri = requireEnv("SPOTIFY_REDIRECT_URI");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${toBasicAuth(clientId, clientSecret)}`,
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Spotify code exchange failed: ${response.status} ${detail.slice(0, 180)}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return json;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${toBasicAuth(clientId, clientSecret)}`,
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Spotify token refresh failed: ${response.status} ${detail.slice(0, 180)}`);
  }

  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

export type CurrentlyPlaying = {
  trackName: string;
  artistName: string;
  albumName: string;
  imageUrl: string;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
};

export async function fetchCurrentlyPlaying(accessToken: string): Promise<CurrentlyPlaying | null> {
  const response = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  if (!response.ok) {
    const detail = await response.text();
    // Missing playback scopes is common; treat as "no data" instead of hard failure/log spam.
    if (
      (response.status === 401 || response.status === 403) &&
      detail.toLowerCase().includes("permissions missing")
    ) {
      return null;
    }
    throw new Error(`Spotify currently-playing failed: ${response.status} ${detail.slice(0, 180)}`);
  }

  const json = (await response.json()) as {
    is_playing?: boolean;
    progress_ms?: number;
    item?: {
      name?: string;
      duration_ms?: number;
      album?: {
        name?: string;
        images?: Array<{ url?: string }>;
      };
      artists?: Array<{ name?: string }>;
    };
  };

  if (!json.item?.name) {
    return null;
  }

  return {
    trackName: json.item.name ?? "Unknown track",
    artistName: (json.item.artists ?? []).map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown artist",
    albumName: json.item.album?.name ?? "Unknown album",
    imageUrl: json.item.album?.images?.[0]?.url ?? "",
    progressMs: json.progress_ms ?? 0,
    durationMs: json.item.duration_ms ?? 0,
    isPlaying: Boolean(json.is_playing),
  };
}

export async function fetchRecentlyPlayed(accessToken: string, limit = 50): Promise<HistoryEntry[]> {
  const response = await fetch(`${SPOTIFY_API_BASE}/me/player/recently-played?limit=${Math.min(Math.max(limit, 1), 50)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Spotify recently-played failed: ${response.status} ${detail.slice(0, 180)}`);
  }

  const json = (await response.json()) as {
    items?: Array<{
      played_at?: string;
      track?: {
        name?: string;
        uri?: string;
        duration_ms?: number;
        artists?: Array<{ name?: string }>;
        album?: { name?: string };
      } | null;
    }>;
  };

  const items = json.items ?? [];
  return items
    .filter((item) => item.played_at && item.track?.name)
    .map((item) => ({
      ts: item.played_at as string,
      ms_played: Math.max(0, item.track?.duration_ms ?? 0),
      master_metadata_track_name: item.track?.name ?? null,
      master_metadata_album_artist_name: item.track?.artists?.[0]?.name ?? null,
      master_metadata_album_album_name: item.track?.album?.name ?? null,
      spotify_track_uri: item.track?.uri ?? null,
      reason_start: null,
      reason_end: "trackdone",
      shuffle: undefined,
      skipped: undefined,
    }))
    .filter((entry) => entry.ms_played > 0);
}

export function buildLoginUrl() {
  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const redirectUri = requireEnv("SPOTIFY_REDIRECT_URI");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "user-top-read user-read-currently-playing user-read-playback-state user-read-recently-played",
    redirect_uri: redirectUri,
    show_dialog: "false",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
