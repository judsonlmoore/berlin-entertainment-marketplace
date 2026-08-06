import { describe, expect, it } from "vitest";
import {
  mapGoogleTypesToVenueType,
  mapPlaceDetailsToPrefill,
} from "./google-places";

describe("mapPlaceDetailsToPrefill", () => {
  it("maps address components into editable venue fields", () => {
    const prefill = mapPlaceDetailsToPrefill({
      placeId: "ChIJtest",
      displayName: "Electric Social",
      formattedAddress: "Torstraße 1, 10119 Berlin, Germany",
      websiteUri: "https://example.com",
      location: { latitude: 52.53, longitude: 13.4 },
      types: ["bar", "night_club", "point_of_interest"],
      addressComponents: [
        { longText: "1", types: ["street_number"] },
        { longText: "Torstraße", types: ["route"] },
        { longText: "Mitte", types: ["sublocality", "sublocality_level_1"] },
        { longText: "10119", types: ["postal_code"] },
        { longText: "Berlin", types: ["locality"] },
        { longText: "Germany", shortText: "DE", types: ["country"] },
      ],
    });

    expect(prefill).toEqual({
      googlePlaceId: "ChIJtest",
      name: "Electric Social",
      addressLine1: "1 Torstraße",
      addressLine2: "",
      district: "Mitte",
      postalCode: "10119",
      city: "Berlin",
      countryCode: "DE",
      latitude: "52.53",
      longitude: "13.4",
      websiteUrl: "https://example.com",
      venueTypeHint: "bar-club",
    });
  });

  it("falls back formatted address street when components are sparse", () => {
    const prefill = mapPlaceDetailsToPrefill({
      placeId: "x",
      displayName: "Hall",
      formattedAddress: "Somewhere 9, Berlin",
      addressComponents: [],
    });
    expect(prefill.addressLine1).toBe("Somewhere 9");
    expect(prefill.venueTypeHint).toBe("");
  });
});

describe("mapGoogleTypesToVenueType", () => {
  it("maps common establishment types", () => {
    expect(mapGoogleTypesToVenueType(["restaurant"])).toBe("cafe-restaurant");
    expect(mapGoogleTypesToVenueType(["lodging", "hotel"])).toBe("hotel-event");
    expect(mapGoogleTypesToVenueType(["museum"])).toBe("gallery-museum");
  });
});
