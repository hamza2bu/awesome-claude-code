export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends a short random suffix so slugs stay unique without a lookup loop. */
export function uniqueSlug(input: string) {
  const base = slugify(input) || "item";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
