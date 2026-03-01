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

## Notes

- This is a single-user MVP. Refresh token is stored as an HTTP-only cookie.
- For true long-term production usage, move snapshots to a database and add scheduled syncing.
