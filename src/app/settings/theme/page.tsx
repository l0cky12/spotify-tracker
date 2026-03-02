import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import { ThemePicker } from "@/components/ThemePicker";
import { DISPLAY_UNIT_COOKIE, parseDisplayUnit } from "@/lib/display-unit";
import { AUTO_SYNC_INTERVAL_COOKIE, autoSyncLabel, parseAutoSyncInterval } from "@/lib/auto-sync";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ThemeSettingsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const importState = firstParam(params.import);
  const importCount = firstParam(params.count);
  const importMode = firstParam(params.mode);
  const importReason = firstParam(params.reason);
  const cookieStore = await cookies();
  const displayUnit = parseDisplayUnit(cookieStore.get(DISPLAY_UNIT_COOKIE)?.value);
  const autoSyncMinutes = parseAutoSyncInterval(cookieStore.get(AUTO_SYNC_INTERVAL_COOKIE)?.value);
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

      <section className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">Spotify Connection</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Connect your account for manual/auto sync and now-playing data.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/api/auth/login"
            className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            Connect Spotify
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-4 py-2 text-sm font-semibold hover:brightness-110"
            >
              Disconnect
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">Sync Schedule</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Automatically run Spotify sync in the background while this app is open.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">Current: {autoSyncLabel(autoSyncMinutes)}</p>
        <form action="/api/settings/auto-sync" method="post" className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="redirectTo" value="/settings/theme" />
          {[
            { label: "Off", value: 0 },
            { label: "15 min", value: 15 },
            { label: "30 min", value: 30 },
            { label: "1 hour", value: 60 },
            { label: "3 hours", value: 180 },
            { label: "6 hours", value: 360 },
          ].map((option) => (
            <button
              key={option.value}
              type="submit"
              name="autoSyncMinutes"
              value={option.value}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                autoSyncMinutes === option.value
                  ? "border-[var(--accent)] bg-[var(--panel-soft)]"
                  : "border-[var(--stroke)] bg-[var(--panel-soft)]/60 hover:brightness-110"
              }`}
            >
              {option.label}
            </button>
          ))}
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">Import Spotify JSON</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload Spotify streaming history JSON to merge into existing data or replace all stored data.
        </p>
        {importState === "ok" ? (
          <p className="mt-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Import complete: {importCount ?? "0"} entries ({importMode ?? "merge"} mode).
          </p>
        ) : null}
        {importState === "failed" ? (
          <p className="mt-3 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Import failed{importReason ? `: ${importReason}` : "."}
          </p>
        ) : null}
        <form action="/api/settings/import-data" method="post" encType="multipart/form-data" className="mt-4 space-y-3">
          <input type="hidden" name="redirectTo" value="/settings/theme" />
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">JSON file</span>
            <input
              type="file"
              name="historyFile"
              accept=".json,application/json"
              required
              className="w-full rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Import mode</span>
            <select
              name="mode"
              defaultValue="merge"
              className="w-full rounded-md border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            >
              <option value="merge">Merge with existing listening history</option>
              <option value="replace">Replace all existing listening history</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:brightness-110"
          >
            Import JSON
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
