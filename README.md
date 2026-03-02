# Spotify Tracker

A private Spotify tracking app that stores snapshots over time and gives you dedicated views for songs, albums, and artists.

## Features

- Spotify OAuth connect/disconnect
- Manual sync to snapshot top songs/artists (albums derived from tracks)
- Persistent history in `data/snapshots.json`
- Home dashboard with overview stats
- Dedicated pages:
  - `/songs`
  - `/albums`
  - `/artists`

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
```

3. For a real deployment URL, set:

```text
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

4. Add the same callback URL in your Spotify app settings.

5. Build and run:

```bash
docker compose up -d --build
```

6. Open `http://localhost:3000`.

Data is persisted via `./data:/app/data`, so snapshots survive container restarts.

## Notes

- This is a single-user MVP. Refresh token is stored as an HTTP-only cookie.
- For true long-term production usage, move snapshots to a database and add scheduled syncing.
