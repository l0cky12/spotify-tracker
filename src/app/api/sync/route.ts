import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { cookies } from "next/headers";
import { fetchRecentlyPlayed, refreshAccessToken } from "@/lib/spotify";
import { mergeHistoryEntries } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const appBaseUrl = getAppBaseUrl(request);
  const url = request.nextUrl;
  const isBackground = url.searchParams.get("background") === "1";
  const redirectTo = isBackground ? "/" : await getRedirectTarget(request, appBaseUrl);

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  if (!refreshToken) {
    if (isBackground) {
      return NextResponse.json({ ok: false, reason: "not-connected" }, { status: 401 });
    }
    return NextResponse.redirect(new URL(`${redirectTo}${joinQuery(redirectTo, "error=auth-required")}`, appBaseUrl), 303);
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    const imported = await fetchRecentlyPlayed(accessToken, 50);
    const total = await mergeHistoryEntries(imported, false);

    if (isBackground) {
      return NextResponse.json({ ok: true, imported: imported.length, total });
    }

    return NextResponse.redirect(
      new URL(`${redirectTo}${joinQuery(redirectTo, `sync=ok&syncCount=${imported.length}`)}`, appBaseUrl),
      303,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 120) : "sync-failed";
    if (isBackground) {
      return NextResponse.json({ ok: false, reason }, { status: 500 });
    }

    return NextResponse.redirect(
      new URL(`${redirectTo}${joinQuery(redirectTo, `error=sync-failed&reason=${encodeURIComponent(reason)}`)}`, appBaseUrl),
      303,
    );
  }
}

async function getRedirectTarget(request: NextRequest, appBaseUrl: string): Promise<string> {
  const requestUrl = request.nextUrl;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const value = formData.get("redirectTo");
    if (typeof value === "string" && value.startsWith("/")) {
      return value;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      const base = new URL(appBaseUrl);
      if (parsed.origin === base.origin) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // Ignore invalid referer.
    }
  }

  const queryRedirect = requestUrl.searchParams.get("redirectTo");
  if (queryRedirect && queryRedirect.startsWith("/")) return queryRedirect;

  return "/";
}

function joinQuery(pathOrPathWithSearch: string, query: string): string {
  return pathOrPathWithSearch.includes("?") ? `&${query}` : `?${query}`;
}
