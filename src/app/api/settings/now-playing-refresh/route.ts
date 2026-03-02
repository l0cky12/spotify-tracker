import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { NOW_PLAYING_REFRESH_COOKIE, parseNowPlayingRefreshSeconds } from "@/lib/auto-sync";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const requestedSeconds = formData.get("nowPlayingRefreshSeconds");
  const redirectToRaw = formData.get("redirectTo");

  const refreshSeconds = parseNowPlayingRefreshSeconds(
    typeof requestedSeconds === "string" ? requestedSeconds : undefined,
  );
  const redirectTo =
    typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") ? redirectToRaw : "/settings/theme";

  const response = NextResponse.redirect(new URL(redirectTo, getAppBaseUrl(request)), 303);
  response.cookies.set(NOW_PLAYING_REFRESH_COOKIE, String(refreshSeconds), {
    path: "/",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
  });

  return response;
}
