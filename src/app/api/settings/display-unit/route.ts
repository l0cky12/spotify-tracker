import { NextRequest, NextResponse } from "next/server";
import { DISPLAY_UNIT_COOKIE, parseDisplayUnit } from "@/lib/display-unit";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const requestedUnit = formData.get("displayUnit");
  const redirectToRaw = formData.get("redirectTo");

  const displayUnit = parseDisplayUnit(typeof requestedUnit === "string" ? requestedUnit : undefined);
  const redirectTo =
    typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") ? redirectToRaw : "/settings/theme";

  const response = NextResponse.redirect(new URL(redirectTo, request.url), 303);
  response.cookies.set(DISPLAY_UNIT_COOKIE, displayUnit, {
    path: "/",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
  });

  return response;
}
