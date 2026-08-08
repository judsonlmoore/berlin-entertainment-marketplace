import type { ReactNode } from "react";

type FeaturedSectionProps = {
  /** Eyebrow text above the title */
  eyebrow?: string;
  /** Section title */
  title: string;
  /** Body content */
  body: string | ReactNode;
  /** Visual element (image, monogram composition, etc.) */
  visual: ReactNode;
  /** Layout direction - image on left or right */
  imagePosition?: "left" | "right";
  /** Optional background color */
  background?: "canvas" | "surface";
};

export function FeaturedSection({
  eyebrow,
  title,
  body,
  visual,
  imagePosition = "left",
  background = "surface",
}: FeaturedSectionProps) {
  const bgClass = background === "canvas" ? "bg-[var(--canvas)]" : "bg-white";

  return (
    <section className={`${bgClass} py-12 sm:py-16`}>
      <div className="shell">
        <div
          className={`grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12 ${
            imagePosition === "right" ? "lg:grid-flow-dense" : ""
          }`}
        >
          {/* Text content */}
          <div className={imagePosition === "right" ? "lg:col-start-1" : ""}>
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h2 className="page-title mb-4 text-2xl sm:text-[1.75rem]">
              {title}
            </h2>
            <div className="text-base leading-relaxed text-[var(--text-muted)]">
              {typeof body === "string" ? <p>{body}</p> : body}
            </div>
          </div>

          {/* Visual element */}
          <div
            className={`${imagePosition === "right" ? "lg:col-start-2" : ""}`}
          >
            {visual}
          </div>
        </div>
      </div>
    </section>
  );
}
