"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SectionItem = {
  id: string;
  label: string;
};

type Props = {
  sections: SectionItem[];
};

const STORAGE_ORDER = "spotify-tracker-dashboard-order";
const STORAGE_VISIBILITY = "spotify-tracker-dashboard-visibility";
const STORAGE_ACCENT = "spotify-tracker-dashboard-accent";
const STORAGE_DENSITY = "spotify-tracker-dashboard-density";
const STORAGE_COLS = "spotify-tracker-dashboard-stats-cols";
const STORAGE_GLOW = "spotify-tracker-dashboard-glow";
const STORAGE_DRAGMODE = "spotify-tracker-dashboard-dragmode";

type Density = "comfortable" | "compact";

function applyAccent(accent: string) {
  document.documentElement.setAttribute("data-accent", accent);
}

function applyLayout(order: string[]) {
  const root = document.getElementById("dashboard-sections-root");
  if (!root) return;
  const map = new Map<string, HTMLElement>();
  for (const child of Array.from(root.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const id = child.dataset.sectionId;
    if (!id) continue;
    map.set(id, child);
  }
  for (const id of order) {
    const node = map.get(id);
    if (node) root.appendChild(node);
  }
}

function applyVisibility(visibility: Record<string, boolean>) {
  const root = document.getElementById("dashboard-sections-root");
  if (!root) return;
  for (const child of Array.from(root.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const id = child.dataset.sectionId;
    if (!id) continue;
    const visible = visibility[id] ?? true;
    child.style.display = visible ? "" : "none";
  }
}

function applyDensity(density: Density) {
  document.documentElement.setAttribute("data-dashboard-density", density);
}

function applyStatsColumns(columns: number) {
  document.documentElement.style.setProperty("--dashboard-stats-cols", String(columns));
}

function applyGlow(enabled: boolean) {
  document.documentElement.setAttribute("data-dashboard-glow", enabled ? "on" : "off");
}

export function DashboardCustomizer({ sections }: Props) {
  const defaultOrder = useMemo(() => sections.map((section) => section.id), [sections]);
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultOrder;
    const storedOrderRaw = window.localStorage.getItem(STORAGE_ORDER);
    const storedOrder = storedOrderRaw ? (JSON.parse(storedOrderRaw) as string[]) : defaultOrder;
    const orderFiltered = storedOrder.filter((id) => defaultOrder.includes(id));
    return [...orderFiltered, ...defaultOrder.filter((id) => !orderFiltered.includes(id))];
  });
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return Object.fromEntries(sections.map((section) => [section.id, true]));
    }
    const storedVisRaw = window.localStorage.getItem(STORAGE_VISIBILITY);
    return storedVisRaw
      ? (JSON.parse(storedVisRaw) as Record<string, boolean>)
      : Object.fromEntries(sections.map((section) => [section.id, true]));
  });
  const [accent, setAccent] = useState(() =>
    typeof window === "undefined" ? "spotify" : window.localStorage.getItem(STORAGE_ACCENT) || "spotify",
  );
  const [density, setDensity] = useState<Density>(() =>
    typeof window === "undefined"
      ? "comfortable"
      : ((window.localStorage.getItem(STORAGE_DENSITY) as Density | null) ?? "comfortable"),
  );
  const [statsColumns, setStatsColumns] = useState<number>(() => {
    if (typeof window === "undefined") return 2;
    const raw = Number(window.localStorage.getItem(STORAGE_COLS) || "2");
    return [1, 2, 3].includes(raw) ? raw : 2;
  });
  const [glow, setGlow] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem(STORAGE_GLOW) !== "off",
  );
  const [dragMode, setDragMode] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem(STORAGE_DRAGMODE) === "on",
  );
  const [dragged, setDragged] = useState<string | null>(null);
  const draggedSectionRef = useRef<string | null>(null);

  useEffect(() => {
    applyAccent(accent);
    applyLayout(order);
    applyVisibility(visibility);
    applyDensity(density);
    applyStatsColumns(statsColumns);
    applyGlow(glow);
  }, [accent, density, glow, order, statsColumns, visibility]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_ORDER, JSON.stringify(order));
    applyLayout(order);
  }, [order]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_VISIBILITY, JSON.stringify(visibility));
    applyVisibility(visibility);
  }, [visibility]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_ACCENT, accent);
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_DENSITY, density);
    applyDensity(density);
  }, [density]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_COLS, String(statsColumns));
    applyStatsColumns(statsColumns);
  }, [statsColumns]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_GLOW, glow ? "on" : "off");
    applyGlow(glow);
  }, [glow]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_DRAGMODE, dragMode ? "on" : "off");
    const root = document.getElementById("dashboard-sections-root");
    if (!root) return;
    const items = Array.from(root.children).filter((node): node is HTMLElement => node instanceof HTMLElement);

    for (const item of items) {
      const id = item.dataset.sectionId;
      if (!id) continue;
      item.draggable = dragMode;
      item.style.cursor = dragMode ? "grab" : "default";
      item.style.userSelect = dragMode ? "none" : "";
      item.ondragstart = dragMode
        ? () => {
            draggedSectionRef.current = id;
            item.style.opacity = "0.65";
          }
        : null;
      item.ondragend = dragMode
        ? () => {
            draggedSectionRef.current = null;
            item.style.opacity = "";
          }
        : null;
      item.ondragover = dragMode
        ? (event) => {
            event.preventDefault();
          }
        : null;
      item.ondrop = dragMode
        ? () => {
            const draggedId = draggedSectionRef.current;
            if (!draggedId || draggedId === id) return;
            setOrder((current) => {
              const next = [...current];
              const from = next.indexOf(draggedId);
              const to = next.indexOf(id);
              if (from < 0 || to < 0) return current;
              next.splice(from, 1);
              next.splice(to, 0, draggedId);
              return next;
            });
          }
        : null;
    }
  }, [dragMode, order]);

  const resetDefaults = () => {
    const defaults = Object.fromEntries(sections.map((section) => [section.id, true]));
    setOrder(defaultOrder);
    setVisibility(defaults);
    setAccent("spotify");
    setDensity("comfortable");
    setStatsColumns(2);
    setGlow(true);
    setDragMode(false);
  };

  return (
    <>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={() => setOpen(true)} className="ui-primary-btn px-4 py-2 text-sm">
          Customize Dashboard
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="ui-panel max-h-[88vh] w-full max-w-4xl overflow-auto p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Customizable Dashboard</p>
                <h2 className="mt-1 text-xl font-bold">Layout, Visibility, and Accent Controls</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="ui-ghost-btn px-3 py-1.5 text-sm">
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Drag-And-Drop Layout</p>
                <div className="space-y-2">
                  {order.map((id) => {
                    const item = sections.find((section) => section.id === id);
                    if (!item) return null;
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => setDragged(id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (!dragged || dragged === id) return;
                          const next = [...order];
                          const from = next.indexOf(dragged);
                          const to = next.indexOf(id);
                          if (from < 0 || to < 0) return;
                          next.splice(from, 1);
                          next.splice(to, 0, dragged);
                          setOrder(next);
                          setDragged(null);
                        }}
                        className="flex cursor-move items-center justify-between rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      >
                        <span>{item.label}</span>
                        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <input
                            type="checkbox"
                            checked={visibility[id] ?? true}
                            onChange={(event) =>
                              setVisibility((current) => ({
                                ...current,
                                [id]: event.target.checked,
                              }))
                            }
                          />
                          Visible
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Accent Theme</p>
                  <select
                    value={accent}
                    onChange={(event) => setAccent(event.target.value)}
                    className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--panel-strong)] px-3 py-2.5 text-sm"
                  >
                    <option value="spotify">Spotify Green</option>
                    <option value="ocean">Ocean Blue</option>
                    <option value="sunset">Sunset Orange</option>
                    <option value="rose">Rose Red</option>
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Stats Columns (Desktop)</p>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((columns) => (
                      <button
                        key={columns}
                        type="button"
                        onClick={() => setStatsColumns(columns)}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          statsColumns === columns
                            ? "border-[var(--accent)] bg-[var(--panel-strong)]"
                            : "border-[var(--stroke)] bg-[var(--panel-soft)]"
                        }`}
                      >
                        {columns}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Card Density</p>
                  <select
                    value={density}
                    onChange={(event) => setDensity(event.target.value as Density)}
                    className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--panel-strong)] px-3 py-2.5 text-sm"
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={glow} onChange={(event) => setGlow(event.target.checked)} />
                  Enable glow effects
                </label>

                <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={dragMode} onChange={(event) => setDragMode(event.target.checked)} />
                  Drag and drop sections directly on dashboard
                </label>

                {dragMode ? (
                  <p className="text-xs text-[var(--muted)]">
                    Drag stats/graphs sections directly in the dashboard area to reorder them.
                  </p>
                ) : null}

                <button type="button" onClick={resetDefaults} className="ui-ghost-btn px-4 py-2 text-sm">
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
