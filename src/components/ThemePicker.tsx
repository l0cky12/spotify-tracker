"use client";

import { useState } from "react";
import { getStoredTheme, setTheme } from "@/components/ThemeProvider";

type ThemeOption = {
  id: string;
  name: string;
  note: string;
};

const themes: ThemeOption[] = [
  { id: "dark", name: "Dark", note: "Default contrast-rich dashboard" },
  { id: "light", name: "Light", note: "Clean bright workspace" },
  { id: "nord", name: "Nord", note: "Cool arctic blue palette" },
  { id: "matrix", name: "Matrix", note: "Terminal green-on-dark" },
  { id: "sunset", name: "Sunset", note: "Warm orange cinematic mood" },
];

export function ThemePicker() {
  const [activeTheme, setActiveTheme] = useState(() =>
    typeof window === "undefined" ? "dark" : getStoredTheme(),
  );

  return (
    <section className="ui-panel p-5">
      <h2 className="text-lg font-semibold">Theme</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Pick your visual style.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => {
          const active = activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                setTheme(theme.id);
                setActiveTheme(theme.id);
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[var(--accent)] bg-[color:var(--panel-glass)] shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                  : "border-[var(--stroke)] bg-[color:var(--panel-glass)]/70 hover:brightness-110"
              }`}
            >
              <p className="font-semibold">{theme.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{theme.note}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
