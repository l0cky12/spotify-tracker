import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForRefreshToken } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForRefreshToken(code);

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("spotify_refresh_token", token.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auth callback failed" },
      { status: 500 },
    );
  }
}
