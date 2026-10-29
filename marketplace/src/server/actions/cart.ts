"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MAX_QTY_PER_LINE, readCart, writeCart } from "@/server/cart";
import type { ActionState } from "./types";

const qty = z.coerce.number().int().min(0).max(MAX_QTY_PER_LINE);

export async function addToCart(_: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const quantity = qty.min(1).safeParse(formData.get("quantity") ?? 1);
  if (!quantity.success) return { error: "Choose a valid quantity" };

  const product = await prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE", shop: { status: "ACTIVE" } },
    select: { id: true, stock: true },
  });
  if (!product) return { error: "This product is not available" };

  const cart = await readCart();
  const existing = cart.find((e) => e.p === productId);
  const desired = Math.min((existing?.q ?? 0) + quantity.data, MAX_QTY_PER_LINE);
  if (desired > product.stock) {
    return { error: product.stock === 0 ? "Out of stock" : `Only ${product.stock} available` };
  }

  await writeCart(existing ? cart.map((e) => (e.p === productId ? { ...e, q: desired } : e)) : [...cart, { p: productId, q: desired }]);
  revalidatePath("/", "layout");
  return { success: "Added to cart" };
}

export async function setCartQuantity(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const quantity = qty.safeParse(formData.get("quantity"));
  if (!quantity.success) return;
  const cart = await readCart();
  await writeCart(
    quantity.data === 0
      ? cart.filter((e) => e.p !== productId)
      : cart.map((e) => (e.p === productId ? { ...e, q: quantity.data } : e)),
  );
  revalidatePath("/", "layout");
}

export async function removeFromCart(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  await writeCart((await readCart()).filter((e) => e.p !== productId));
  revalidatePath("/", "layout");
}

export async function clearCart() {
  await writeCart([]);
  revalidatePath("/", "layout");
}
