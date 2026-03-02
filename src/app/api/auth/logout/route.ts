import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", getAppBaseUrl(request)));
  response.cookies.delete("spotify_refresh_token");
  return response;
}
