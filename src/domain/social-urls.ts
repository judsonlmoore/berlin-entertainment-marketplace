/**
 * Social / website URL helpers: placeholders + platform host validation.
 */

export type SocialPlatform =
  | "website"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "spotify"
  | "soundcloud"
  | "linkedin"
  | "youtube";

export type SocialPlatformConfig = {
  id: SocialPlatform;
  /** Full-URL placeholder shown in the empty field */
  placeholder: string;
  labelKey: string;
  /** Hostnames allowed for this platform (lowercase, no port) */
  allowedHosts: string[];
  /** Optional path prefix required after host (e.g. /artist/) */
  pathIncludes?: string[];
};

export const SOCIAL_PLATFORMS: Record<SocialPlatform, SocialPlatformConfig> = {
  website: {
    id: "website",
    placeholder: "https://your-site.com",
    labelKey: "websiteUrl",
    allowedHosts: [],
  },
  instagram: {
    id: "instagram",
    placeholder: "https://www.instagram.com/yourhandle",
    labelKey: "socialInstagram",
    allowedHosts: ["instagram.com", "www.instagram.com"],
  },
  facebook: {
    id: "facebook",
    placeholder: "https://www.facebook.com/yourpage",
    labelKey: "socialFacebook",
    allowedHosts: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com"],
  },
  tiktok: {
    id: "tiktok",
    placeholder: "https://www.tiktok.com/@yourhandle",
    labelKey: "socialTiktok",
    allowedHosts: ["tiktok.com", "www.tiktok.com"],
  },
  spotify: {
    id: "spotify",
    placeholder: "https://open.spotify.com/artist/…",
    labelKey: "socialSpotify",
    allowedHosts: ["open.spotify.com", "spotify.com", "www.spotify.com"],
    pathIncludes: ["/artist/", "/user/", "/playlist/", "/album/", "/track/"],
  },
  soundcloud: {
    id: "soundcloud",
    placeholder: "https://soundcloud.com/yourhandle",
    labelKey: "socialSoundcloud",
    allowedHosts: ["soundcloud.com", "www.soundcloud.com"],
  },
  linkedin: {
    id: "linkedin",
    placeholder: "https://www.linkedin.com/in/your-profile",
    labelKey: "socialLinkedin",
    allowedHosts: ["linkedin.com", "www.linkedin.com"],
    pathIncludes: ["/in/", "/company/", "/school/"],
  },
  youtube: {
    id: "youtube",
    placeholder: "https://www.youtube.com/@channel",
    labelKey: "socialYoutube",
    allowedHosts: [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtu.be",
    ],
  },
};

export const ENTERTAINER_SOCIAL_ORDER: SocialPlatform[] = [
  "instagram",
  "facebook",
  "tiktok",
  "spotify",
  "soundcloud",
  "linkedin",
  "youtube",
];

export const VENUE_SOCIAL_ORDER: SocialPlatform[] = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
];

export type PlatformUrlValidation =
  | { ok: true; value: string }
  | { ok: false; code: "invalid_url" | "invalid_protocol" | "invalid_website" | "wrong_platform" | "spotify_path" };

function hostsMatch(hostname: string, allowed: string[]): boolean {
  const bare = hostname.replace(/^www\./, "");
  return allowed.some((host) => {
    const allowedBare = host.replace(/^www\./, "");
    return bare === allowedBare || hostname === host;
  });
}

/** Validate a full URL for the given platform. Empty is allowed (optional field). */
export function validatePlatformUrl(
  platform: SocialPlatform,
  raw: string,
): PlatformUrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: "" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, code: "invalid_url" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, code: "invalid_protocol" };
  }

  const config = SOCIAL_PLATFORMS[platform];

  if (platform === "website") {
    if (!parsed.hostname.includes(".")) {
      return { ok: false, code: "invalid_website" };
    }
    return { ok: true, value: parsed.toString() };
  }

  if (!hostsMatch(parsed.hostname, config.allowedHosts)) {
    return { ok: false, code: "wrong_platform" };
  }

  if (config.pathIncludes && config.pathIncludes.length > 0) {
    const path = parsed.pathname.toLowerCase();
    const okPath = config.pathIncludes.some((part) => path.includes(part));
    if (!okPath && platform === "spotify") {
      if (!path || path === "/") {
        return { ok: false, code: "spotify_path" };
      }
    }
  }

  return { ok: true, value: parsed.toString() };
}

/** @deprecated Prefer full-URL fields + validatePlatformUrl */
export function stripSocialPrefix(
  platform: SocialPlatform,
  fullUrl: string | null | undefined,
): string {
  return (fullUrl ?? "").trim();
}

/** @deprecated Prefer full-URL fields + validatePlatformUrl */
export function joinSocialPrefix(
  platform: SocialPlatform,
  fragment: string,
): string {
  const trimmed = fragment.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (platform === "website") {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  const host = SOCIAL_PLATFORMS[platform].allowedHosts[0] ?? "example.com";
  return `https://${host}/${trimmed.replace(/^\/+/, "")}`;
}
