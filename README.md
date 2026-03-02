# Spotify Tracker

A private Spotify analytics app that works from exported Spotify Streaming History JSON files.

## Features

- Import Spotify streaming history JSON (merge or replace)
- Manual Spotify sync from sidebar
- Auto-sync scheduler (configurable in Settings, default every hour)
- Currently listening card with progress bar (auto-refresh configurable in Settings)
- Time-range filters: Today, This week, This month, This year, All time, Custom range
- Dashboard cards and charts (pie + timeline)
- Drill-down pages for:
  - `/songs`
  - `/albums`
  - `/artists`
  - `/genres`
- Detail pages per item with trends and related tracks
- Theme settings with presets (dark, light, nord, matrix, sunset)
- Display unit toggle (hours or minutes)

## Data Model

- Source: Spotify Extended Streaming History style records (`ts`, `ms_played`, track/artist/album metadata)
- Stored locally in `data/history.json`
- No snapshot sync model required

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill Spotify credentials in `.env.local`:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (must match Spotify app settings exactly)
- `APP_BASE_URL` (public app URL, especially when using reverse proxies/tunnels)

4. Run:

```bash
npm run dev
```

5. Open `http://localhost:3000`
6. Connect Spotify in `Settings`, then import your Spotify JSON history file.

## Docker Deploy

1. Copy env template:

```bash
cp .env.example .env
```

2. Build and run:

```bash
docker compose up -d --build
```

3. Set `.env` with your real public domain for:
- `APP_BASE_URL`
- `SPOTIFY_REDIRECT_URI`
4. Open your domain and connect Spotify in Settings.
5. Import your Spotify JSON file in Settings.

Data is persisted in the named Docker volume `spotify_tracker_data`.
