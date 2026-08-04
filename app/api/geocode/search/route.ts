import { NextResponse } from "next/server";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
};

/**
 * Proxied OpenStreetMap Nominatim search for base-location autocomplete.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ ok: true, results: [] });
  }
  if (q.length > 200) {
    return NextResponse.json(
      { ok: false, error: "query_too_long" },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", "6");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "SalonMarketplace/0.1 (profile-location; local-dev)",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: "upstream_error" },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as NominatimResult[];
  const results = payload.map((row) => ({
    id: String(row.place_id),
    label: row.display_name,
    latitude: row.lat,
    longitude: row.lon,
  }));

  return NextResponse.json({ ok: true, results });
}
