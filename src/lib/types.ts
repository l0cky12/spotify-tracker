export type SpotifyImage = {
  url: string;
  width: number | null;
  height: number | null;
};

export type TrackStat = {
  id: string;
  name: string;
  artistName: string;
  albumId: string;
  albumName: string;
  imageUrl: string;
  rank: number;
  score: number;
};

export type ArtistStat = {
  id: string;
  name: string;
  imageUrl: string;
  rank: number;
  score: number;
};

export type AlbumStat = {
  id: string;
  name: string;
  artistName: string;
  imageUrl: string;
  rank: number;
  score: number;
};

export type GenreStat = {
  id: string;
  name: string;
  rank: number;
  score: number;
};

export type Snapshot = {
  capturedAt: string;
  tracks: TrackStat[];
  artists: ArtistStat[];
  albums: AlbumStat[];
  genres?: GenreStat[];
};

export type CollectionStats = {
  id: string;
  name: string;
  imageUrl?: string;
  subtitle?: string;
  currentRank: number;
  appearances: number;
  avgScore: number;
  trend: { capturedAt: string; rank: number; score: number }[];
};
