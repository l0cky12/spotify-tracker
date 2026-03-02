import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import { ThemePicker } from "@/components/ThemePicker";
import { DISPLAY_UNIT_COOKIE, parseDisplayUnit } from "@/lib/display-unit";

export const dynamic = "force-dynamic";

export default async function ThemeSettingsPage() {
  const cookieStore = await cookies();
  const displayUnit = parseDisplayUnit(cookieStore.get(DISPLAY_UNIT_COOKIE)?.value);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-20 md:px-8 lg:pl-72 lg:pt-8">
      <Nav />
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Settings</p>
        <h1 className="mt-2 text-3xl font-bold">App Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose how Spotify Tracker looks and how listening estimates are displayed.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">Display Unit</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Switch between hours and minutes for estimated listening values.</p>
        <form action="/api/settings/display-unit" method="post" className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="redirectTo" value="/settings/theme" />
          <button
            type="submit"
            name="displayUnit"
            value="hours"
            className={`rounded-xl border px-4 py-3 text-left transition ${
              displayUnit === "hours"
                ? "border-[var(--accent)] bg-[var(--panel-soft)]"
                : "border-[var(--stroke)] bg-[var(--panel-soft)]/60 hover:brightness-110"
            }`}
          >
            <p className="font-semibold">Hours</p>
            <p className="text-sm text-[var(--muted)]">Show values like 3.25h</p>
          </button>
          <button
            type="submit"
            name="displayUnit"
            value="minutes"
            className={`rounded-xl border px-4 py-3 text-left transition ${
              displayUnit === "minutes"
                ? "border-[var(--accent)] bg-[var(--panel-soft)]"
                : "border-[var(--stroke)] bg-[var(--panel-soft)]/60 hover:brightness-110"
            }`}
          >
            <p className="font-semibold">Minutes</p>
            <p className="text-sm text-[var(--muted)]">Show values like 195m</p>
          </button>
        </form>
      </section>

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
