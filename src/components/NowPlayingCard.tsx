"use client";

import { useEffect, useMemo, useState } from "react";

type NowPlaying = {
  trackName: string;
  artistName: string;
  albumName: string;
  imageUrl: string;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
};

type Props = {
  initialNowPlaying: NowPlaying | null;
  refreshSeconds: number;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function NowPlayingCard({ initialNowPlaying, refreshSeconds }: Props) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(initialNowPlaying);
  const [clientProgressMs, setClientProgressMs] = useState(initialNowPlaying?.progressMs ?? 0);

  useEffect(() => {
    if (!nowPlaying?.isPlaying || !nowPlaying.durationMs) return;

    const interval = window.setInterval(() => {
      setClientProgressMs((value) => Math.min(value + 1000, nowPlaying.durationMs));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [nowPlaying?.durationMs, nowPlaying?.isPlaying]);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/now-playing", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { nowPlaying?: NowPlaying | null };
        setNowPlaying(payload.nowPlaying ?? null);
        setClientProgressMs(payload.nowPlaying?.progressMs ?? 0);
      } catch {
        // Keep the last value if request fails.
      }
    };

    run();
    const interval = window.setInterval(run, refreshSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [refreshSeconds]);

  const progress = useMemo(() => {
    if (!nowPlaying?.durationMs) return 0;
    return clampPercent((clientProgressMs / nowPlaying.durationMs) * 100);
  }, [clientProgressMs, nowPlaying?.durationMs]);

  return (
    <section className="ui-panel h-full p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Now Playing</p>
        <span className="rounded-full border border-[var(--stroke)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--muted)]">
          {nowPlaying?.isPlaying ? "Live" : "Idle"}
        </span>
      </div>

      {nowPlaying ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            {nowPlaying.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nowPlaying.imageUrl}
                alt={nowPlaying.albumName}
                className="h-20 w-20 rounded-lg object-cover shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
              />
            ) : (
              <div className="h-20 w-20 rounded-lg border border-[var(--stroke)] bg-[var(--panel-strong)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{nowPlaying.trackName}</p>
              <p className="truncate text-sm text-[var(--muted)]">{nowPlaying.artistName}</p>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">{nowPlaying.albumName}</p>
            </div>
          </div>

          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-strong)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{formatMs(clientProgressMs)}</span>
              <span>{formatMs(nowPlaying.durationMs)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">No active track right now.</p>
      )}
    </section>
  );
}
