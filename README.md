# Spotify Tracker

A private Spotify analytics app that works from exported Spotify Streaming History JSON files.

## Features

- Import Spotify streaming history JSON (merge or replace)
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

3. Run:

```bash
npm run dev
```

4. Open `http://localhost:3000`
5. Go to `Settings` and import your Spotify JSON history file.

## Docker Deploy

1. Copy env template:

```bash
cp .env.example .env
```

2. Build and run:

```bash
docker compose up -d --build
```

3. Open `http://localhost:3000`
4. Import your Spotify JSON file in Settings.

Data is persisted in the named Docker volume `spotify_tracker_data`.
