import { NextResponse } from "next/server";

/**
 * Legacy Auth.js default path. Google Safe Browsing often false-flags
 * `/api/auth/signin` and `/api/auth/signin/google`. Send people to the
 * locale sign-in page instead. OAuth callbacks stay under `/api/session/callback/*`
 * (e.g. `/api/session/callback/microsoft-entra-id`).
 * branded sign-in page instead of serving the Auth.js interstitial.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/en/sign-in", url.origin), 308);
}

export async function POST(request: Request) {
  return GET(request);
}

export const runtime = "nodejs";
