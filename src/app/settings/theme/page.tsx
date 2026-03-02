import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ThemePicker } from "@/components/ThemePicker";

export const dynamic = "force-dynamic";

export default function ThemeSettingsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <Nav />
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Settings</p>
        <h1 className="mt-2 text-3xl font-bold">Theme Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose how Spotify Tracker looks across dashboard and drill-down pages.
        </p>
      </header>
      <ThemePicker />
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm hover:brightness-110"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
