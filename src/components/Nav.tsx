"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/songs", label: "Songs" },
  { href: "/albums", label: "Albums" },
  { href: "/artists", label: "Artists" },
  { href: "/genres", label: "Genres" },
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
        className="ui-soft-panel fixed left-4 top-4 z-40 px-3 py-2 text-sm font-semibold text-[var(--text)] lg:hidden"
      >
        Menu
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}

      <nav
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[var(--stroke)] bg-[color:var(--panel-glass)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            Spotify Tracker
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-sm text-[var(--muted)] hover:bg-white/10 lg:hidden"
          >
            Close
          </button>
        </div>

        <div className="space-y-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={`${link.href}${suffix}`}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
                    : "text-[var(--text)] hover:bg-white/8"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto space-y-3">
          <form action="/api/sync" method="post">
            <input type="hidden" name="redirectTo" value={`${pathname}${suffix}`} />
            <button
              type="submit"
              className="ui-primary-btn block w-full px-3 py-2.5 text-center text-sm"
            >
              Sync now
            </button>
          </form>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="ui-ghost-btn block w-full px-3 py-2.5 text-center text-sm"
            >
              Disconnect
            </button>
          </form>
          <Link
            href={`/settings/theme${suffix}`}
            onClick={() => setOpen(false)}
            className={`block w-full rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition ${
              pathname === "/settings/theme"
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "ui-ghost-btn text-[var(--text)]"
            }`}
          >
            Settings
          </Link>
        </div>
      </nav>
    </>
  );
}
