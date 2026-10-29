import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CART_COOKIE = "cart";
export const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 50;

const cartSchema = z
  .array(z.object({ p: z.string().min(1).max(40), q: z.number().int().min(1).max(MAX_QTY_PER_LINE) }))
  .max(MAX_LINES);

export type CartEntry = z.infer<typeof cartSchema>[number];

/** The cart is a small signed-in-or-guest cookie of product ids and quantities. */
export async function readCart(): Promise<CartEntry[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function writeCart(entries: CartEntry[]) {
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(entries.slice(0, MAX_LINES)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function cartCount() {
  return (await readCart()).reduce((sum, e) => sum + e.q, 0);
}

/** Cart lines joined with live product data; unavailable products are flagged, not dropped. */
export async function loadCart() {
  const entries = await readCart();
  if (entries.length === 0) return { lines: [], hasProblems: false };

  const products = await prisma.product.findMany({
    where: { id: { in: entries.map((e) => e.p) } },
    include: {
      shop: { select: { id: true, name: true, slug: true, status: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = entries.flatMap((entry) => {
    const product = byId.get(entry.p);
    if (!product) return [];
    let problem: string | null = null;
    if (product.status !== "ACTIVE" || product.shop.status !== "ACTIVE") problem = "No longer available";
    else if (product.stock < entry.q)
      problem = product.stock === 0 ? "Out of stock" : `Only ${product.stock} left`;
    return [{ product, quantity: entry.q, problem }];
  });

  return { lines, hasProblems: lines.some((l) => l.problem) };
}
