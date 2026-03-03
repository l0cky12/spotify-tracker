"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home", icon: "♪" },
  { href: "/songs", label: "Songs", icon: "S" },
  { href: "/albums", label: "Albums", icon: "A" },
  { href: "/artists", label: "Artists", icon: "R" },
  { href: "/genres", label: "Genres", icon: "G" },
];

export function Nav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const preservedParams = new URLSearchParams();
  const range = searchParams.get("range");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (range) preservedParams.set("range", range);
  if (from) preservedParams.set("from", from);
  if (to) preservedParams.set("to", to);

  const suffix = preservedParams.toString() ? `?${preservedParams.toString()}` : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-soft-panel fixed left-4 top-4 z-40 px-4 py-2 text-sm font-semibold text-[var(--text)] lg:hidden"
      >
        Browse
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      ) : null}

      <nav
        className={`fixed left-0 top-0 z-50 flex h-screen w-[17rem] flex-col border-r border-[var(--stroke)] bg-[color:var(--panel)] px-5 py-6 shadow-[0_24px_48px_rgba(0,0,0,0.45)] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Your Music</p>
          <p className="mt-2 text-lg font-bold">Spotify Tracker</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Personal listening dashboard</p>
        </div>

        <div className="space-y-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={`${link.href}${suffix}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-black"
                    : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/25 text-xs">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Quick Actions</p>
          <div className="mt-3 space-y-2">
            <form action="/api/sync" method="post">
              <input type="hidden" name="redirectTo" value={`${pathname}${suffix}`} />
              <button type="submit" className="ui-primary-btn block w-full px-4 py-2 text-sm">
                Sync Now
              </button>
            </form>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="ui-ghost-btn block w-full px-4 py-2 text-sm">
                Disconnect
              </button>
            </form>
          </div>
        </div>

        <div className="mt-auto">
          <Link
            href={`/settings/theme${suffix}`}
            onClick={() => setOpen(false)}
            className={`block w-full rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition ${
              pathname === "/settings/theme"
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "text-[var(--text)] hover:bg-[var(--panel-soft)]"
            }`}
          >
            Theme Settings
          </Link>
        </div>
      </nav>
    </>
  );
}
