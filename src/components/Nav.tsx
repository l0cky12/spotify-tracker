"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/songs", label: "Songs" },
  { href: "/albums", label: "Albums" },
  { href: "/artists", label: "Artists" },
  { href: "/genres", label: "Genres" },
  { href: "/settings/theme", label: "Theme" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md border border-[var(--stroke)] bg-[var(--panel-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-[0_6px_20px_rgba(0,0,0,0.35)] lg:hidden"
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
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-[var(--stroke)] bg-[var(--panel-strong)] p-4 shadow-[0_0_45px_rgba(0,0,0,0.4)] transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
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
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-[var(--text)] hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto space-y-2">
          <form action="/api/sync" method="post">
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:brightness-110"
            >
              Sync now
            </button>
          </form>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-white/10"
            >
              Disconnect
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
