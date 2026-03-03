"use client";

import { useEffect, useMemo, useState } from "react";

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

export function DashboardCustomizer({ sections }: Props) {
  const defaultOrder = useMemo(() => sections.map((section) => section.id), [sections]);
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
  const [dragged, setDragged] = useState<string | null>(null);

  useEffect(() => {
    applyAccent(accent);
    applyLayout(order);
    applyVisibility(visibility);
  }, [accent, order, visibility]);

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

  return (
    <section className="ui-panel mt-6 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Customizable Dashboard</p>
      <h2 className="mt-1 text-xl font-bold">Layout and Theme Controls</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
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

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Accent Theming</p>
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
          <p className="mt-2 text-xs text-[var(--muted)]">Preferences are saved locally for this browser.</p>
        </div>
      </div>
    </section>
  );
}
