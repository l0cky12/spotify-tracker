import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/songs", label: "Songs" },
  { href: "/albums", label: "Albums" },
  { href: "/artists", label: "Artists" },
];

export function Nav() {
  return (
    <nav className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-900/30 bg-emerald-950/60 px-4 py-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-800"
        >
          {link.label}
        </Link>
      ))}
      <form action="/api/sync" method="post" className="ml-auto">
        <button
          type="submit"
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          Sync now
        </button>
      </form>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="rounded-md border border-emerald-500/40 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-800"
        >
          Disconnect
        </button>
      </form>
    </nav>
  );
}
