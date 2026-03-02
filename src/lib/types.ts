export type HistoryEntry = {
  ts: string;
  ms_played: number;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
  reason_start?: string | null;
  reason_end?: string | null;
  shuffle?: boolean;
  skipped?: boolean;
};

export type CollectionStats = {
  id: string;
  name: string;
  imageUrl?: string;
  subtitle?: string;
  currentRank: number;
  playCount: number;
  avgMinutes: number;
  totalHours: number;
  trend: { capturedAt: string; value: number }[];
};
