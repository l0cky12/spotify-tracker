"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  intervalMinutes: number;
};

export function AutoSync({ intervalMinutes }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (intervalMinutes <= 0) return;

    let cancelled = false;
    let inFlight = false;

    const runSync = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/sync?background=1", { method: "POST", cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { ok?: boolean; imported?: number };
        if (payload.ok && (payload.imported ?? 0) > 0) {
          router.refresh();
        }
      } catch {
        // Silent in background mode.
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(runSync, intervalMinutes * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [intervalMinutes, router]);

  return null;
}
