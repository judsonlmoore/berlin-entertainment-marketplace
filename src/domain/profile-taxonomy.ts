/**
 * Structured entertainers taxonomy inspired by Artsdata performing-arts
 * event types and common booking-platform act categories.
 * Subcategories always include `other` for free-text.
 */

export type TaxonomyNode = {
  id: string;
  labelEn: string;
  labelDe: string;
  children: Array<{
    id: string;
    labelEn: string;
    labelDe: string;
  }>;
};

export const ENTERTAINER_CATEGORIES: TaxonomyNode[] = [
  {
    id: "music",
    labelEn: "Music",
    labelDe: "Musik",
    children: [
      { id: "solo", labelEn: "Solo musician", labelDe: "Solo-Musiker:in" },
      { id: "band", labelEn: "Band / ensemble", labelDe: "Band / Ensemble" },
      { id: "dj", labelEn: "DJ", labelDe: "DJ" },
      { id: "classical", labelEn: "Classical", labelDe: "Klassik" },
      { id: "jazz", labelEn: "Jazz", labelDe: "Jazz" },
      { id: "electronic", labelEn: "Electronic", labelDe: "Elektronisch" },
      { id: "folk", labelEn: "Folk / world", labelDe: "Folk / Weltmusik" },
      { id: "choir", labelEn: "Choir / vocal", labelDe: "Chor / Gesang" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "comedy",
    labelEn: "Comedy",
    labelDe: "Comedy",
    children: [
      { id: "standup", labelEn: "Stand-up", labelDe: "Stand-up" },
      { id: "improv", labelEn: "Improvisation", labelDe: "Improvisation" },
      { id: "sketch", labelEn: "Sketch / satire", labelDe: "Sketch / Satire" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "dance",
    labelEn: "Dance",
    labelDe: "Tanz",
    children: [
      {
        id: "contemporary",
        labelEn: "Contemporary",
        labelDe: "Zeitgenössisch",
      },
      { id: "ballet", labelEn: "Ballet", labelDe: "Ballett" },
      { id: "urban", labelEn: "Urban / hip-hop", labelDe: "Urban / Hip-Hop" },
      {
        id: "ballroom",
        labelEn: "Ballroom / social",
        labelDe: "Gesellschaftstanz",
      },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "theatre",
    labelEn: "Theatre & spoken word",
    labelDe: "Theater & Spoken Word",
    children: [
      { id: "theatre", labelEn: "Theatre", labelDe: "Theater" },
      { id: "cabaret", labelEn: "Cabaret", labelDe: "Kabarett" },
      {
        id: "spoken",
        labelEn: "Spoken word / poetry",
        labelDe: "Spoken Word / Poetry",
      },
      { id: "musical", labelEn: "Musical theatre", labelDe: "Musical" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "variety",
    labelEn: "Variety & circus",
    labelDe: "Varieté & Zirkus",
    children: [
      { id: "magic", labelEn: "Magic / illusion", labelDe: "Magie / Illusion" },
      {
        id: "circus",
        labelEn: "Circus / acrobatics",
        labelDe: "Zirkus / Akrobatik",
      },
      { id: "puppetry", labelEn: "Puppetry", labelDe: "Figurentheater" },
      { id: "burlesque", labelEn: "Burlesque", labelDe: "Burlesque" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "visual",
    labelEn: "Visual & multimedia",
    labelDe: "Visuell & Multimedia",
    children: [
      { id: "vj", labelEn: "VJ / projection", labelDe: "VJ / Projektion" },
      { id: "installation", labelEn: "Installation", labelDe: "Installation" },
      {
        id: "performance-art",
        labelEn: "Performance art",
        labelDe: "Performancekunst",
      },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "hosting",
    labelEn: "Hosting & facilitation",
    labelDe: "Moderation & Hosting",
    children: [
      { id: "mc", labelEn: "MC / host", labelDe: "MC / Host" },
      {
        id: "workshop",
        labelEn: "Workshop leader",
        labelDe: "Workshop-Leitung",
      },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "other",
    labelEn: "Other",
    labelDe: "Sonstiges",
    children: [{ id: "other", labelEn: "Other", labelDe: "Sonstiges" }],
  },
];

/**
 * Venue taxonomy aligned with Pollstar venue types and Schema.org
 * EntertainmentBusiness subtypes, sized for Berlin independent venues.
 */
export const VENUE_CATEGORIES: TaxonomyNode[] = [
  {
    id: "bar-club",
    labelEn: "Bar / club",
    labelDe: "Bar / Club",
    children: [
      { id: "bar", labelEn: "Bar", labelDe: "Bar" },
      { id: "club", labelEn: "Club / nightclub", labelDe: "Club / Nachtclub" },
      { id: "jazz-club", labelEn: "Jazz club", labelDe: "Jazzclub" },
      { id: "comedy-club", labelEn: "Comedy club", labelDe: "Comedy-Club" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "cafe-restaurant",
    labelEn: "Café / restaurant",
    labelDe: "Café / Restaurant",
    children: [
      { id: "cafe", labelEn: "Café", labelDe: "Café" },
      { id: "restaurant", labelEn: "Restaurant", labelDe: "Restaurant" },
      { id: "wine-bar", labelEn: "Wine bar", labelDe: "Weinbar" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "theatre-stage",
    labelEn: "Theatre / stage",
    labelDe: "Theater / Bühne",
    children: [
      { id: "theatre", labelEn: "Theatre", labelDe: "Theater" },
      { id: "black-box", labelEn: "Black box", labelDe: "Black Box" },
      { id: "cabaret-room", labelEn: "Cabaret room", labelDe: "Kabarett-Raum" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "gallery-museum",
    labelEn: "Gallery / museum",
    labelDe: "Galerie / Museum",
    children: [
      { id: "gallery", labelEn: "Gallery", labelDe: "Galerie" },
      { id: "museum", labelEn: "Museum", labelDe: "Museum" },
      { id: "project-space", labelEn: "Project space", labelDe: "Projektraum" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "cultural-community",
    labelEn: "Cultural / community",
    labelDe: "Kultur / Community",
    children: [
      {
        id: "cultural-center",
        labelEn: "Cultural center",
        labelDe: "Kulturzentrum",
      },
      {
        id: "community-hall",
        labelEn: "Community hall",
        labelDe: "Gemeindesaal",
      },
      {
        id: "library",
        labelEn: "Library / archive",
        labelDe: "Bibliothek / Archiv",
      },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "hotel-event",
    labelEn: "Hotel / event space",
    labelDe: "Hotel / Eventlocation",
    children: [
      {
        id: "hotel",
        labelEn: "Hotel lounge / ballroom",
        labelDe: "Hotel-Lounge / Ballsaal",
      },
      {
        id: "event-hall",
        labelEn: "Event hall",
        labelDe: "Veranstaltungssaal",
      },
      {
        id: "coworking",
        labelEn: "Coworking / loft",
        labelDe: "Coworking / Loft",
      },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "outdoor",
    labelEn: "Outdoor",
    labelDe: "Outdoor",
    children: [
      {
        id: "courtyard",
        labelEn: "Courtyard / garden",
        labelDe: "Hof / Garten",
      },
      { id: "park", labelEn: "Park / plaza", labelDe: "Park / Platz" },
      { id: "rooftop", labelEn: "Rooftop", labelDe: "Dachterrasse" },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "salon-private",
    labelEn: "Salon / private",
    labelDe: "Salon / privat",
    children: [
      { id: "salon", labelEn: "Salon apartment", labelDe: "Salon-Wohnung" },
      {
        id: "private-residence",
        labelEn: "Private residence",
        labelDe: "Private Location",
      },
      { id: "other", labelEn: "Other", labelDe: "Sonstiges" },
    ],
  },
  {
    id: "other",
    labelEn: "Other",
    labelDe: "Sonstiges",
    children: [{ id: "other", labelEn: "Other", labelDe: "Sonstiges" }],
  },
];

const OTHER_PREFIX = "other:";

export function encodeSubcategory(
  subcategoryId: string,
  otherLabel?: string,
): string {
  if (subcategoryId === "other") {
    const label = otherLabel?.trim() ?? "";
    return label ? `${OTHER_PREFIX}${label}` : "other";
  }
  return subcategoryId;
}

export function parseSubcategory(raw: string | null | undefined): {
  subcategoryId: string;
  otherLabel: string;
} {
  const value = (raw ?? "").trim();
  if (!value) {
    return { subcategoryId: "", otherLabel: "" };
  }
  if (value.startsWith(OTHER_PREFIX)) {
    return {
      subcategoryId: "other",
      otherLabel: value.slice(OTHER_PREFIX.length),
    };
  }
  if (value === "other") {
    return { subcategoryId: "other", otherLabel: "" };
  }
  return { subcategoryId: value, otherLabel: "" };
}

export function getCategoryNode(
  tree: TaxonomyNode[],
  categoryId: string,
): TaxonomyNode | undefined {
  return tree.find((node) => node.id === categoryId);
}

export function taxonomyLabel(
  node: { labelEn: string; labelDe: string },
  locale: "en" | "de",
): string {
  return locale === "de" ? node.labelDe : node.labelEn;
}

const VENUE_TYPE_SEP = "::";

export function encodeVenueType(
  categoryId: string,
  subcategoryEncoded: string,
): string {
  return `${categoryId}${VENUE_TYPE_SEP}${subcategoryEncoded}`;
}

export function parseVenueType(raw: string | null | undefined): {
  categoryId: string;
  subcategoryRaw: string;
} {
  const value = (raw ?? "").trim();
  if (!value) return { categoryId: "", subcategoryRaw: "" };
  const idx = value.indexOf(VENUE_TYPE_SEP);
  if (idx === -1) {
    // Legacy free-text venue types map to "other / other:label"
    if (getCategoryNode(VENUE_CATEGORIES, value)) {
      return { categoryId: value, subcategoryRaw: "other" };
    }
    return {
      categoryId: "other",
      subcategoryRaw: encodeSubcategory("other", value),
    };
  }
  return {
    categoryId: value.slice(0, idx),
    subcategoryRaw: value.slice(idx + VENUE_TYPE_SEP.length),
  };
}
