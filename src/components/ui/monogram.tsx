"use client";

import { useState } from "react";
import { isUsableAvatarUrl } from "@/src/lib/avatar";

type Tone = "rose" | "blue" | "ochre" | "forest";

const toneClass: Record<Tone, string> = {
  rose: "bg-[var(--rose-soft)] text-[var(--primary-foreground)]",
  blue: "bg-[var(--blue-soft)] text-[var(--ink)]",
  ochre: "bg-[var(--ochre-soft)] text-[var(--ink)]",
  forest: "bg-[var(--primary)] text-[var(--primary-foreground)]",
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function toneFromName(name: string): Tone {
  const tones: Tone[] = ["rose", "blue", "ochre", "forest"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  }
  return tones[hash % tones.length]!;
}

export function Monogram({
  name,
  className = "",
  tone,
}: {
  name: string;
  className?: string;
  tone?: Tone;
}) {
  const resolved = tone ?? toneFromName(name);
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center ${toneClass[resolved]} ${className}`}
    >
      <span className="display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">
        {initialsFromName(name)}
      </span>
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  className = "",
  tone,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  tone?: Tone;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolved = tone ?? toneFromName(name);
  const showImage = !imageFailed && isUsableAvatarUrl(src);

  if (showImage) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Provider avatar URLs vary by host; plain img avoids next/image remote allowlists. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ${toneClass[resolved]} ${className}`}
      style={{ width: size, height: size }}
    >
      {initialsFromName(name)}
    </span>
  );
}
