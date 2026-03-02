import { NextRequest } from "next/server";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getAppBaseUrl(request?: NextRequest): string {
  const configuredBase = process.env.APP_BASE_URL?.trim();
  if (configuredBase) {
    return stripTrailingSlash(configuredBase);
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (redirectUri) {
    try {
      return stripTrailingSlash(new URL(redirectUri).origin);
    } catch {
      // Fall through to request URL fallback.
    }
  }

  if (request) {
    return request.nextUrl.origin;
  }

  return "http://localhost:3000";
}
