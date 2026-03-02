import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  const appBaseUrl = getAppBaseUrl(request);
  return NextResponse.redirect(new URL("/?error=sync-disabled&reason=import-json-in-settings", appBaseUrl));
}
