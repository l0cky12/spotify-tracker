import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

  return (
    <main className="w-full px-4 py-8 pt-20 md:px-8 lg:pl-[19rem] lg:pr-8 lg:pt-8">
      <Nav />

      <header className="ui-panel p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Dedicated Playlist Creation</p>
        <h1 className="mt-2 text-3xl font-bold">Generate Playlist Mixes</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create top tracks, new releases, discovery mixes, and more directly into your Spotify account.
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

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MixCard
          title="Top Tracks Mix"
          description="Build a playlist from your most played tracks."
          mixType="top-tracks"
        />
        <MixCard
          title="New Releases Mix"
          description="Build a playlist from current Spotify new releases."
          mixType="new-releases"
        />
        <MixCard
          title="Discovery Mix"
          description="Build a recommendation playlist from your top artists."
          mixType="discovery"
        />
      </section>

      <div className="mt-6">
        <Link href="/settings/theme" className="ui-ghost-btn inline-flex px-4 py-2 text-sm">
          Back to Settings
        </Link>
      </div>
    </main>
  );
}

function MixCard({ title, description, mixType }: { title: string; description: string; mixType: string }) {
  return (
    <article className="ui-panel p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      <form action="/api/playlists/create" method="post" className="mt-4">
        <input type="hidden" name="mixType" value={mixType} />
        <input type="hidden" name="redirectTo" value="/playlists" />
        <button type="submit" className="ui-primary-btn px-4 py-2 text-sm">
          Create Playlist
        </button>
      </form>
    </article>
  );
}
