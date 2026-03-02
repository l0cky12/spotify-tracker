import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { AUTO_SYNC_INTERVAL_COOKIE, parseAutoSyncInterval } from "@/lib/auto-sync";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const requestedMinutes = formData.get("autoSyncMinutes");
  const redirectToRaw = formData.get("redirectTo");

  const intervalMinutes = parseAutoSyncInterval(
    typeof requestedMinutes === "string" ? requestedMinutes : undefined,
  );
  const redirectTo =
    typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") ? redirectToRaw : "/settings/theme";

  const response = NextResponse.redirect(new URL(redirectTo, getAppBaseUrl(request)), 303);
  response.cookies.set(AUTO_SYNC_INTERVAL_COOKIE, String(intervalMinutes), {
    path: "/",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
  });

  return response;
}
