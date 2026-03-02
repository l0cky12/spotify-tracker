import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchCurrentlyPlaying, refreshAccessToken } from "@/lib/spotify";

export async function GET() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ connected: false, nowPlaying: null }, { status: 200 });
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    const nowPlaying = await fetchCurrentlyPlaying(accessToken);
    return NextResponse.json({ connected: true, nowPlaying }, { status: 200 });
  } catch {
    return NextResponse.json({ connected: true, nowPlaying: null }, { status: 200 });
  }
}
