import { NextResponse } from "next/server";
import { buildLoginUrl } from "@/lib/spotify";

export async function GET() {
  const loginUrl = buildLoginUrl();
  return NextResponse.redirect(loginUrl);
}
