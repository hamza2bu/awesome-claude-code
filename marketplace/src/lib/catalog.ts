import type { Prisma } from "@prisma/client";

export const PAGE_SIZE = 24;

export const SORTS = {
  relevance: { label: "Best match", orderBy: [{ ratingCount: "desc" }, { createdAt: "desc" }] },
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  price_asc: { label: "Price: low to high", orderBy: [{ priceCents: "asc" }] },
  price_desc: { label: "Price: high to low", orderBy: [{ priceCents: "desc" }] },
  rating: { label: "Top rated", orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }>;

export type SortKey = keyof typeof SORTS;

export interface CatalogQuery {
  q?: string;
  categoryIds?: string[];
  shopId?: string;
  minCents?: number;
  maxCents?: number;
  inStock?: boolean;
}

/** Builds the product filter shared by search, category and shop pages. */
export function catalogWhere(query: CatalogQuery): Prisma.ProductWhereInput {
  const terms = query.q?.trim().split(/\s+/).filter(Boolean).slice(0, 6) ?? [];
  return {
    status: "ACTIVE",
    shop: { status: "ACTIVE" },
    ...(query.shopId ? { shopId: query.shopId } : {}),
    ...(query.categoryIds ? { categoryId: { in: query.categoryIds } } : {}),
    ...(query.inStock ? { stock: { gt: 0 } } : {}),
    ...(query.minCents !== undefined || query.maxCents !== undefined
      ? { priceCents: { gte: query.minCents, lte: query.maxCents } }
      : {}),
    // Every term must match the title, description or shop name.
    AND: terms.map((term) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { shop: { name: { contains: term, mode: "insensitive" as const } } },
      ],
    })),
  };
}

export function parseSort(value: string | undefined): SortKey {
  return value && value in SORTS ? (value as SortKey) : "relevance";
}

export function parsePage(value: string | undefined) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 1000) : 1;
}

export function parseAmount(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}
