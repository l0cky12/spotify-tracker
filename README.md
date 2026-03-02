# Spotify Tracker

A private Spotify tracking app that stores snapshots over time and gives you dedicated views for songs, albums, and artists.

## Features

- Spotify OAuth connect/disconnect
- Manual sync to snapshot top songs/artists (albums derived from tracks)
- Genre tracking derived from your top artists
- Estimated listening hours by songs, albums, artists, and genres
- Advanced dashboard visuals (pie, bubble, and timeline charts)
- Theme settings page with presets (dark, light, nord, matrix, sunset)
- Display unit setting (hours or minutes)
- Persistent history in `data/snapshots.json`
- Home dashboard with overview stats
- Dedicated pages:
  - `/songs`
  - `/albums`
  - `/artists`
  - `/genres`
  - `/settings/theme`

## Time Filters

Dashboard and drill-down pages support:
- Day
- Week
- Month
- Year
- All time
- Custom date range

Listening hours are estimated from snapshot ranking scores over time windows.
You can tune the baseline with `ESTIMATED_LISTENING_HOURS_PER_DAY` (default `2`).

## Tech stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Recharts
- File-based local storage (JSON)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Create a Spotify app at https://developer.spotify.com/dashboard and set redirect URI:

```text
http://localhost:3000/api/auth/callback
```

4. Fill `.env.local` with Spotify client credentials.

5. Run:

```bash
npm run dev
```

6. Open `http://localhost:3000` and click **Connect Spotify**.

## Docker Deploy

1. Copy env template and set values:

```bash
cp .env.example .env
```

2. For local Docker, keep:

```text
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback
APP_BASE_URL=http://localhost:3000
```

3. For a real deployment URL, set:

```text
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/auth/callback
APP_BASE_URL=https://your-domain.com
```

4. Add the same callback URL in your Spotify app settings.

5. Build and run:

```bash
docker compose up -d --build
```

6. Open `http://localhost:3000`.

Data is persisted via a Docker named volume (`spotify_tracker_data`), so snapshots survive container restarts without host file permission issues.

If you previously used `./data:/app/data`, migrate once before restarting:

```bash
docker compose cp spotify-tracker:/app/data/snapshots.json ./snapshots.json.backup
```

### Cloudflare Tunnel Note

If you run behind Cloudflare Tunnel or another reverse proxy, set `APP_BASE_URL` to your public HTTPS domain.
This prevents redirects from using internal bind addresses like `0.0.0.0`.

## Notes

- This is a single-user MVP. Refresh token is stored as an HTTP-only cookie.
- For true long-term production usage, move snapshots to a database and add scheduled syncing.
