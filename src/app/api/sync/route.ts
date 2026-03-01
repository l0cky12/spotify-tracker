import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchSnapshot, refreshAccessToken } from "@/lib/spotify";
import { appendSnapshot } from "@/lib/storage";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/?error=not-connected", "http://localhost:3000"));
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    const snapshot = await fetchSnapshot(accessToken);
    await appendSnapshot(snapshot);
    return NextResponse.redirect(new URL("/?synced=1", "http://localhost:3000"));
  } catch {
    return NextResponse.redirect(new URL("/?error=sync-failed", "http://localhost:3000"));
  }
}
