import { HistoryEntry } from "./types";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const mediaCache = new Map<string, Promise<ResolvedMedia | null>>();

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

async function requestClientCredentialsToken(): Promise<string> {
  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
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
    throw new Error(`Spotify client token failed: ${response.status} ${detail.slice(0, 180)}`);
  }

  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

function normalizeGenreLabel(genre: string): string {
  return genre
    .split(" ")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
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

export type ResolvedMedia = {
  imageUrl: string;
  spotifyUrl: string;
  info: string;
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

export async function fetchArtistGenresByName(artists: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(artists.map((artist) => artist.trim()).filter(Boolean)));
  if (!unique.length) return new Map();

  const accessToken = await requestClientCredentialsToken();
  const resolved = new Map<string, string>();

  for (const artist of unique) {
    const query = encodeURIComponent(`artist:${artist}`);
    const response = await fetch(`${SPOTIFY_API_BASE}/search?q=${query}&type=artist&limit=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) continue;
    const json = (await response.json()) as {
      artists?: {
        items?: Array<{
          genres?: string[];
        }>;
      };
    };
    const topGenre = json.artists?.items?.[0]?.genres?.[0];
    if (topGenre) {
      resolved.set(artist, normalizeGenreLabel(topGenre));
    }
  }

  return resolved;
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

async function searchSpotify(
  accessToken: string,
  query: string,
  type: "track" | "album" | "artist",
): Promise<unknown | null> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=${type}&limit=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  return response.json();
}

function buildCacheKey(kind: "songs" | "albums" | "artists", name: string, subtitle?: string): string {
  return `${kind}:${name.trim().toLowerCase()}::${(subtitle ?? "").trim().toLowerCase()}`;
}

export async function resolveEntityMedia(params: {
  kind: "songs" | "albums" | "artists";
  name: string;
  subtitle?: string;
}): Promise<ResolvedMedia | null> {
  const key = buildCacheKey(params.kind, params.name, params.subtitle);
  if (!mediaCache.has(key)) {
    mediaCache.set(
      key,
      (async () => {
        try {
          const accessToken = await requestClientCredentialsToken();
          if (params.kind === "songs") {
            const query = `track:${params.name} artist:${params.subtitle ?? ""}`.trim();
            const json = (await searchSpotify(accessToken, query, "track")) as
              | {
                  tracks?: {
                    items?: Array<{
                      external_urls?: { spotify?: string };
                      artists?: Array<{ name?: string }>;
                      album?: {
                        name?: string;
                        release_date?: string;
                        images?: Array<{ url?: string }>;
                      };
                    }>;
                  };
                }
              | null;
            const item = json?.tracks?.items?.[0];
            if (!item) return null;
            return {
              imageUrl: item.album?.images?.[0]?.url ?? "",
              spotifyUrl: item.external_urls?.spotify ?? "",
              info: [item.artists?.map((a) => a.name).filter(Boolean).join(", "), item.album?.release_date]
                .filter(Boolean)
                .join(" - "),
            };
          }

          if (params.kind === "albums") {
            const query = `album:${params.name} artist:${params.subtitle ?? ""}`.trim();
            const json = (await searchSpotify(accessToken, query, "album")) as
              | {
                  albums?: {
                    items?: Array<{
                      external_urls?: { spotify?: string };
                      release_date?: string;
                      total_tracks?: number;
                      images?: Array<{ url?: string }>;
                    }>;
                  };
                }
              | null;
            const item = json?.albums?.items?.[0];
            if (!item) return null;
            return {
              imageUrl: item.images?.[0]?.url ?? "",
              spotifyUrl: item.external_urls?.spotify ?? "",
              info: [item.release_date, item.total_tracks ? `${item.total_tracks} tracks` : ""]
                .filter(Boolean)
                .join(" - "),
            };
          }

          const query = `artist:${params.name}`;
          const json = (await searchSpotify(accessToken, query, "artist")) as
            | {
                artists?: {
                  items?: Array<{
                    external_urls?: { spotify?: string };
                    followers?: { total?: number };
                    genres?: string[];
                    images?: Array<{ url?: string }>;
                  }>;
                };
              }
            | null;
          const item = json?.artists?.items?.[0];
          if (!item) return null;
          return {
            imageUrl: item.images?.[0]?.url ?? "",
            spotifyUrl: item.external_urls?.spotify ?? "",
            info: [item.genres?.[0], item.followers?.total ? `${item.followers.total.toLocaleString()} followers` : ""]
              .filter(Boolean)
              .join(" - "),
          };
        } catch {
          return null;
        }
      })(),
    );
  }

  return mediaCache.get(key) ?? null;
}
