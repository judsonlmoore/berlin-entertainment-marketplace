"use client";

import { validateYouTubeUrl, toPrivacyEmbedUrl } from "@/src/domain/youtube";

type Props = {
  url: string;
  title?: string | undefined;
  className?: string | undefined;
};

export function YouTubeEmbed({ url, title, className }: Props) {
  const parsed = validateYouTubeUrl(url);
  if (!parsed.ok) {
    return null;
  }

  return (
    <div className={className ?? "aspect-video w-full overflow-hidden border border-[var(--line)]"}>
      <iframe
        src={toPrivacyEmbedUrl(parsed.videoId)}
        title={title ?? "YouTube video"}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
