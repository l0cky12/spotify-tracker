"use client";

import { useEffect } from "react";

const STORAGE_KEY = "spotify-tracker-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const theme = saved || "dark";
    document.documentElement.setAttribute("data-theme", theme);
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
