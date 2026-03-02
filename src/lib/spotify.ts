import { AlbumStat, ArtistStat, Snapshot, TrackStat } from "./types";

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
    throw new Error(`Spotify code exchange failed: ${response.status}`);
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
    throw new Error(`Spotify token refresh failed: ${response.status}`);
  }

  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

async function spotifyGet<T>(accessToken: string, endpoint: string): Promise<T> {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify API request failed: ${response.status} ${endpoint}`);
  }

  return (await response.json()) as T;
}

type TopTracksResponse = {
  items: Array<{
    id: string;
    name: string;
    album: {
      id: string;
      name: string;
      images: Array<{ url: string }>;
    };
    artists: Array<{ name: string }>;
  }>;
};

type TopArtistsResponse = {
  items: Array<{
    id: string;
    name: string;
    images: Array<{ url: string }>;
    genres: string[];
  }>;
};

export async function fetchSnapshot(accessToken: string): Promise<Snapshot> {
  const [tracksRes, artistsRes] = await Promise.all([
    spotifyGet<TopTracksResponse>(accessToken, "/me/top/tracks?limit=50&time_range=medium_term"),
    spotifyGet<TopArtistsResponse>(accessToken, "/me/top/artists?limit=50&time_range=medium_term"),
  ]);

  const tracks: TrackStat[] = tracksRes.items.map((track, idx) => ({
    id: track.id,
    name: track.name,
    artistName: track.artists.map((a) => a.name).join(", "),
    albumId: track.album.id,
    albumName: track.album.name,
    imageUrl: track.album.images[0]?.url ?? "",
    rank: idx + 1,
    score: 51 - (idx + 1),
  }));

  const artists: ArtistStat[] = artistsRes.items.map((artist, idx) => ({
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images[0]?.url ?? "",
    rank: idx + 1,
    score: 51 - (idx + 1),
  }));

  const genreMap = new Map<string, { name: string; score: number; bestRank: number }>();
  for (const [idx, artist] of artistsRes.items.entries()) {
    const artistRank = idx + 1;
    const artistScore = 51 - artistRank;
    for (const genre of artist.genres) {
      const id = genre.toLowerCase().replace(/\s+/g, "-");
      const existing = genreMap.get(id);
      if (!existing) {
        genreMap.set(id, { name: genre, score: artistScore, bestRank: artistRank });
        continue;
      }

      existing.score += artistScore;
      if (artistRank < existing.bestRank) {
        existing.bestRank = artistRank;
      }
    }
  }

  const genres = Array.from(genreMap.entries())
    .map(([id, value]) => ({
      id,
      name: value.name,
      rank: value.bestRank,
      score: value.score,
    }))
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .map((genre, idx) => ({ ...genre, rank: idx + 1 }));

  const albumMap = new Map<string, AlbumStat>();
  for (const track of tracks) {
    const existing = albumMap.get(track.albumId);
    if (!existing) {
      albumMap.set(track.albumId, {
        id: track.albumId,
        name: track.albumName,
        artistName: track.artistName,
        imageUrl: track.imageUrl,
        rank: track.rank,
        score: track.score,
      });
      continue;
    }

    if (track.rank < existing.rank) {
      existing.rank = track.rank;
    }
    existing.score += track.score;
  }

  const albums = Array.from(albumMap.values())
    .sort((a, b) => b.score - a.score)
    .map((album, idx) => ({ ...album, rank: idx + 1 }));

  return {
    capturedAt: new Date().toISOString(),
    tracks,
    artists,
    albums,
    genres,
  };
}

export function buildLoginUrl() {
  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const redirectUri = requireEnv("SPOTIFY_REDIRECT_URI");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "user-top-read",
    redirect_uri: redirectUri,
    show_dialog: "false",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
