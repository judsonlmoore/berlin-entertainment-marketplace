/** Client helper for auth-proxied portfolio image URLs. */
export function portfolioImageSrc(
  id: string,
  variant: "full" | "thumb" = "full",
): string {
  return variant === "thumb"
    ? `/api/portfolio/${id}?v=thumb`
    : `/api/portfolio/${id}`;
}
