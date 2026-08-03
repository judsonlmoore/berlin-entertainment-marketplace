const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export type YouTubeValidation =
  | { ok: true; videoId: string; canonicalUrl: string }
  | { ok: false; reason: string };

function extractVideoId(url: URL): string | null {
  if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (url.pathname.startsWith("/embed/")) {
    const id = url.pathname.split("/")[2];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  const watchId = url.searchParams.get("v");
  if (watchId && /^[\w-]{11}$/.test(watchId)) {
    return watchId;
  }

  const shortsMatch = url.pathname.match(/^\/shorts\/([\w-]{11})/);
  if (shortsMatch?.[1]) {
    return shortsMatch[1];
  }

  return null;
}

export function validateYouTubeUrl(raw: string): YouTubeValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: "YouTube URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Invalid YouTube URL" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Invalid YouTube URL scheme" };
  }

  if (!YOUTUBE_HOSTS.has(parsed.hostname)) {
    return { ok: false, reason: "URL must be a YouTube link" };
  }

  const videoId = extractVideoId(parsed);
  if (!videoId) {
    return { ok: false, reason: "Could not parse YouTube video id" };
  }

  return {
    ok: true,
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/** Privacy-enhanced embed host (no cookies until play). */
export function toPrivacyEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
