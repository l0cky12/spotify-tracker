"use client";

import { useEffect } from "react";

const STORAGE_KEY = "spotify-tracker-theme";
const ACCENT_STORAGE_KEY = "spotify-tracker-dashboard-accent";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const theme = saved || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    const accent = window.localStorage.getItem(ACCENT_STORAGE_KEY) || "spotify";
    document.documentElement.setAttribute("data-accent", accent);
  }, []);

  return <>{children}</>;
}

export function setTheme(theme: string) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function getStoredTheme(): string {
  return window.localStorage.getItem(STORAGE_KEY) || "dark";
}
