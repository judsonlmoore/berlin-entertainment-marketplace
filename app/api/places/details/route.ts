import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import {
  isGooglePlacesConfigured,
  placesDetails,
} from "@/src/integrations/google-places";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isGooglePlacesConfigured()) {
    return NextResponse.json(
      { ok: false, error: "places_not_configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const placeId = (searchParams.get("placeId") ?? "").trim();
  const sessionToken = (searchParams.get("sessionToken") ?? "").trim();
  const languageCode = searchParams.get("lang") === "de" ? "de" : "en";

  if (!placeId || placeId.length > 256 || !sessionToken || sessionToken.length > 128) {
    return NextResponse.json(
      { ok: false, error: "invalid_query" },
      { status: 400 },
    );
  }

  try {
    const prefill = await placesDetails({
      placeId,
      sessionToken,
      languageCode,
    });
    return NextResponse.json({ ok: true, prefill });
  } catch (error) {
    const code = error instanceof Error ? error.message : "upstream_error";
    if (code === "places_forbidden") {
      return NextResponse.json(
        { ok: false, error: "places_forbidden" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "upstream_error" },
      { status: 502 },
    );
  }
}
