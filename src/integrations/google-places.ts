import { getServerEnv } from "@/src/validation/env";

export function getGooglePlacesApiKey(): string | undefined {
  return getServerEnv().GOOGLE_PLACES_API_KEY;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getGooglePlacesApiKey());
}

export type PlacesAutocompletePrediction = {
  placeId: string;
  label: string;
  secondaryText: string | null;
};

export type PlacesAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

export type PlacesPrefill = {
  googlePlaceId: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  district: string;
  postalCode: string;
  city: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  websiteUrl: string;
  /** Best-effort venue taxonomy id; empty if unknown. */
  venueTypeHint: string;
};

function componentByType(
  components: PlacesAddressComponent[],
  type: string,
): PlacesAddressComponent | undefined {
  return components.find((c) => c.types?.includes(type));
}

/**
 * Map Google Place Details (New) address components into venue form fields.
 * Owner may edit any prefilled value afterward.
 */
export function mapPlaceDetailsToPrefill(input: {
  placeId: string;
  displayName?: string | null;
  formattedAddress?: string | null;
  addressComponents?: PlacesAddressComponent[];
  location?: { latitude?: number; longitude?: number } | null;
  websiteUri?: string | null;
  types?: string[] | null;
}): PlacesPrefill {
  const components = input.addressComponents ?? [];
  const streetNumber = componentByType(components, "street_number")?.longText;
  const route = componentByType(components, "route")?.longText;
  const addressLine1 =
    [streetNumber, route].filter(Boolean).join(" ").trim() ||
    input.formattedAddress?.split(",")[0]?.trim() ||
    "";

  const subpremise = componentByType(components, "subpremise")?.longText ?? "";
  const postalCode = componentByType(components, "postal_code")?.longText ?? "";
  const district =
    componentByType(components, "sublocality_level_1")?.longText ||
    componentByType(components, "sublocality")?.longText ||
    componentByType(components, "neighborhood")?.longText ||
    componentByType(components, "administrative_area_level_2")?.longText ||
    "";
  const city =
    componentByType(components, "locality")?.longText ||
    componentByType(components, "postal_town")?.longText ||
    "Berlin";
  const countryCode =
    componentByType(components, "country")?.shortText?.toUpperCase() || "DE";

  return {
    googlePlaceId: input.placeId,
    name: (input.displayName ?? "").trim(),
    addressLine1,
    addressLine2: subpremise,
    district,
    postalCode,
    city,
    countryCode,
    latitude:
      input.location?.latitude != null ? String(input.location.latitude) : "",
    longitude:
      input.location?.longitude != null ? String(input.location.longitude) : "",
    websiteUrl: (input.websiteUri ?? "").trim(),
    venueTypeHint: mapGoogleTypesToVenueType(input.types ?? []),
  };
}

/** Rough mapping from Google place types → our venue taxonomy top-level ids. */
export function mapGoogleTypesToVenueType(types: string[]): string {
  const set = new Set(types.map((t) => t.toLowerCase()));
  if (set.has("night_club") || set.has("bar") || set.has("pub")) {
    return "bar-club";
  }
  if (set.has("restaurant") || set.has("cafe") || set.has("meal_takeaway")) {
    return "cafe-restaurant";
  }
  if (set.has("lodging") || set.has("hotel")) {
    return "hotel-event";
  }
  if (
    set.has("performing_arts_theater") ||
    set.has("movie_theater") ||
    set.has("auditorium")
  ) {
    return "theatre-stage";
  }
  if (
    set.has("museum") ||
    set.has("art_gallery") ||
    set.has("tourist_attraction")
  ) {
    return "gallery-museum";
  }
  if (set.has("park") || set.has("stadium") || set.has("campground")) {
    return "outdoor";
  }
  if (
    set.has("church") ||
    set.has("place_of_worship") ||
    set.has("synagogue")
  ) {
    return "cultural-community";
  }
  return "";
}

export async function placesAutocomplete(input: {
  query: string;
  sessionToken: string;
  languageCode?: "en" | "de";
}): Promise<PlacesAutocompletePrediction[]> {
  const key = getGooglePlacesApiKey();
  if (!key) {
    throw new Error("places_not_configured");
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
      },
      body: JSON.stringify({
        input: input.query,
        sessionToken: input.sessionToken,
        languageCode: input.languageCode ?? "en",
        includedRegionCodes: ["de"],
        includedPrimaryTypes: [
          "bar",
          "night_club",
          "restaurant",
          "cafe",
          "lodging",
          "hotel",
          "performing_arts_theater",
          "event_venue",
          "museum",
          "art_gallery",
          "stadium",
          "community_center",
          "establishment",
        ],
        locationBias: {
          circle: {
            center: { latitude: 52.52, longitude: 13.405 },
            radius: 50000.0,
          },
        },
      }),
      next: { revalidate: 0 },
    },
  );

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      detail = errBody.error?.message ?? errBody.error?.status ?? "";
    } catch {
      /* ignore */
    }
    if (
      response.status === 403 ||
      detail.includes("SERVICE_BLOCKED") ||
      detail.includes("PERMISSION_DENIED")
    ) {
      throw new Error("places_forbidden");
    }
    throw new Error("places_upstream_error");
  }

  const payload = (await response.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
        text?: { text?: string };
      };
    }>;
  };

  return (payload.suggestions ?? [])
    .map((row) => {
      const pred = row.placePrediction;
      if (!pred?.placeId) return null;
      return {
        placeId: pred.placeId,
        label:
          pred.structuredFormat?.mainText?.text?.trim() ||
          pred.text?.text?.trim() ||
          pred.placeId,
        secondaryText:
          pred.structuredFormat?.secondaryText?.text?.trim() || null,
      };
    })
    .filter((row): row is PlacesAutocompletePrediction => Boolean(row));
}

export async function placesDetails(input: {
  placeId: string;
  sessionToken: string;
  languageCode?: "en" | "de";
}): Promise<PlacesPrefill> {
  const key = getGooglePlacesApiKey();
  if (!key) {
    throw new Error("places_not_configured");
  }

  const placeId = input.placeId.startsWith("places/")
    ? input.placeId.slice("places/".length)
    : input.placeId;

  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  url.searchParams.set("sessionToken", input.sessionToken);
  url.searchParams.set("languageCode", input.languageCode ?? "en");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,addressComponents,location,websiteUri,types",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      detail = errBody.error?.message ?? errBody.error?.status ?? "";
    } catch {
      /* ignore */
    }
    if (
      response.status === 403 ||
      detail.includes("SERVICE_BLOCKED") ||
      detail.includes("PERMISSION_DENIED")
    ) {
      throw new Error("places_forbidden");
    }
    throw new Error("places_upstream_error");
  }

  const payload = (await response.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    addressComponents?: PlacesAddressComponent[];
    location?: { latitude?: number; longitude?: number };
    websiteUri?: string;
    types?: string[];
  };

  return mapPlaceDetailsToPrefill({
    placeId: placeId,
    displayName: payload.displayName?.text ?? null,
    formattedAddress: payload.formattedAddress ?? null,
    addressComponents: payload.addressComponents ?? [],
    location: payload.location ?? null,
    websiteUri: payload.websiteUri ?? null,
    types: payload.types ?? null,
  });
}
