import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import { buildPlaylistInsights } from "@/lib/playlist-recommendations";
import { readHistoryEntries } from "@/lib/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default async function PlaylistsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const hasRefreshToken = Boolean(cookieStore.get("spotify_refresh_token")?.value);
  const params = (await searchParams) ?? {};
  const created = firstParam(params.created);
  const type = firstParam(params.type);
  const count = firstParam(params.count);
  const reason = firstParam(params.reason);
  const playlistUrl = firstParam(params.playlistUrl);
  const authState = firstParam(params.auth);

  const entries = await readHistoryEntries();
  const insights = buildPlaylistInsights(entries);

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />

      <header className="ui-panel p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Dedicated Playlist Creation</p>
        <h1 className="mt-2 text-3xl font-bold">Generate Auto Playlists From Your Listening History</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create most played this month, underrated favorites, forgotten songs, rediscovery, genre-based, and mood playlists.
        </p>
      </header>

      {created === "ok" ? (
        <p className="ui-soft-panel mt-4 border-emerald-500/40 px-3 py-2 text-sm text-emerald-200">
          Playlist created ({type ?? "mix"}) with {count ?? "0"} tracks.
          {playlistUrl ? (
            <a href={playlistUrl} target="_blank" rel="noreferrer" className="ml-2 text-emerald-100 underline">
              Open playlist
            </a>
          ) : null}
        </p>
      ) : null}

      {created === "failed" ? (
        <p className="ui-soft-panel mt-4 border-rose-500/40 px-3 py-2 text-sm text-rose-200">
          Playlist creation failed{reason ? `: ${reason}` : "."}
          {authState === "required" || authState === "reconnect" || !hasRefreshToken ? (
            <Link href="/api/auth/login" className="ml-2 underline">
              Connect/Reconnect Spotify
            </Link>
          ) : null}
        </p>
      ) : null}

      {!hasRefreshToken ? (
        <p className="ui-soft-panel mt-4 border-amber-500/40 px-3 py-2 text-sm text-amber-200">
          Spotify is not connected.
          <Link href="/api/auth/login" className="ml-2 underline">
            Connect Spotify
          </Link>
        </p>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {insights.mixes.map((mix) => (
          <article key={mix.id} className="ui-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{mix.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{mix.description}</p>
              </div>
              <span className="rounded-full border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-1 text-xs text-[var(--muted)]">
                Health: {mix.health.score}/100 ({mix.health.label})
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{mix.health.note}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Vibe: Energy {formatPct(mix.vibe.energy)} / Danceability {formatPct(mix.vibe.danceability)} / Valence {formatPct(mix.vibe.valence)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tempo {mix.vibe.tempo} BPM / Acousticness {formatPct(mix.vibe.acousticness)}
            </p>

            <div className="mt-4 space-y-2">
              {mix.tracks.slice(0, 6).map((track) => (
                <div key={track.id} className="ui-soft-panel flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate">
                    {track.name} <span className="text-[var(--muted)]">- {track.artist}</span>
                  </span>
                  <span className="text-xs text-[var(--muted)]">{track.playCount} plays</span>
                </div>
              ))}
              {!mix.tracks.length ? <p className="text-sm text-[var(--muted)]">No tracks found for this mix yet.</p> : null}
            </div>

            <form action="/api/playlists/create" method="post" className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="mixType" value={mix.id} />
              <input type="hidden" name="redirectTo" value="/playlists" />
              <button type="submit" className="ui-primary-btn px-4 py-2 text-sm" disabled={!mix.usableUriCount || !hasRefreshToken}>
                Create Playlist
              </button>
              <span className="text-xs text-[var(--muted)]">Spotify-usable tracks: {mix.usableUriCount}</span>
            </form>
          </article>
        ))}
      </section>

      <section className="ui-panel mt-6 p-5">
        <h2 className="text-xl font-semibold">Track Audio Features</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Energy, danceability, valence, tempo, and acousticness estimated from your listening history.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FeatureStat label="Energy" value={formatPct(insights.averageVibe.energy)} />
          <FeatureStat label="Danceability" value={formatPct(insights.averageVibe.danceability)} />
          <FeatureStat label="Valence" value={formatPct(insights.averageVibe.valence)} />
          <FeatureStat label="Tempo" value={`${insights.averageVibe.tempo} BPM`} />
          <FeatureStat label="Acousticness" value={formatPct(insights.averageVibe.acousticness)} />
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">Average vibe profile: {insights.vibeSummary}</p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="ui-panel p-5">
          <h3 className="text-lg font-semibold">Compare Songs By Audio Profile</h3>
          <div className="mt-4 space-y-2">
            {insights.topSongProfiles.slice(0, 8).map((song) => (
              <div key={`${song.name}-${song.artist}`} className="ui-soft-panel px-3 py-2 text-sm">
                <p className="truncate font-medium">{song.name} <span className="text-[var(--muted)]">- {song.artist}</span></p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  E {formatPct(song.audio.energy)} / D {formatPct(song.audio.danceability)} / V {formatPct(song.audio.valence)} / A {formatPct(song.audio.acousticness)}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="ui-panel p-5">
          <h3 className="text-lg font-semibold">Compare Artists By Audio Profile</h3>
          <div className="mt-4 space-y-2">
            {insights.topArtistProfiles.slice(0, 8).map((artist) => (
              <div key={artist.artist} className="ui-soft-panel px-3 py-2 text-sm">
                <p className="truncate font-medium">{artist.artist}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  E {formatPct(artist.audio.energy)} / D {formatPct(artist.audio.danceability)} / V {formatPct(artist.audio.valence)} / A {formatPct(artist.audio.acousticness)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ui-panel mt-6 p-5">
        <h3 className="text-lg font-semibold">Mood Clustering Of Library / History</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {insights.moodClusters.map((cluster) => (
            <article key={cluster.name} className="ui-soft-panel p-3 text-sm">
              <p className="font-semibold">{cluster.name}</p>
              <p className="mt-1 text-[var(--muted)]">{cluster.count} tracks</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <Link href="/settings/theme" className="ui-ghost-btn inline-flex px-4 py-2 text-sm">
          Back to Settings
        </Link>
      </div>
    </main>
  );
}

function FeatureStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-soft)] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </article>
  );
}
