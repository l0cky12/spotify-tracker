import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { fetchSnapshot, refreshAccessToken } from "@/lib/spotify";
import { appendSnapshot } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
  const appBaseUrl = getAppBaseUrl(request);

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/?error=not-connected", appBaseUrl));
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    const snapshot = await fetchSnapshot(accessToken);
    await appendSnapshot(snapshot);
    return NextResponse.redirect(new URL("/?synced=1", appBaseUrl));
  } catch (error) {
    console.error("Spotify sync failed", error);
    const message = error instanceof Error ? error.message : "Unknown sync error";
    const reconnectNeeded =
      message.includes("Spotify token refresh failed: 400") || message.toLowerCase().includes("invalid_grant");

    const redirectUrl = new URL("/?error=sync-failed", appBaseUrl);
    redirectUrl.searchParams.set("reason", message.slice(0, 200));

    const response = NextResponse.redirect(redirectUrl);
    if (reconnectNeeded) {
      response.cookies.delete("spotify_refresh_token");
      redirectUrl.searchParams.set("error", "reconnect");
      response.headers.set("Location", redirectUrl.toString());
    }
    return response;
  }
}
