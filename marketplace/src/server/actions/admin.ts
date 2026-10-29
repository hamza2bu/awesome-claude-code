"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireRole } from "@/server/guards";
import { retryDuePayouts } from "@/server/orders";
import type { ActionState } from "./types";

export async function setShopStatus(formData: FormData) {
  await requireRole("ADMIN");
  const status = z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).parse(formData.get("status"));
  const shop = await prisma.shop.update({ where: { id: String(formData.get("shopId")) }, data: { status } });
  revalidatePath("/admin", "layout");
  revalidatePath(`/shops/${shop.slug}`);
}

export async function setShopCommission(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const raw = String(formData.get("commission") ?? "").trim();
  let commissionBps: number | null = null;
  if (raw !== "") {
    const pct = Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) return { error: "Enter 0–50%, or leave blank for the default" };
    commissionBps = Math.round(pct * 100);
  }
  await prisma.shop.update({ where: { id: String(formData.get("shopId")) }, data: { commissionBps } });
  revalidatePath("/admin/vendors");
  return { success: "Saved" };
}

export async function createCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (name.length < 2) return { error: "Category name is too short" };
  const slug = slugify(name);
  if (await prisma.category.findUnique({ where: { slug } })) return { error: "A category with this name exists" };
  await prisma.category.create({ data: { name, slug, parentId } });
  revalidatePath("/", "layout");
  return { success: `Created ${name}` };
}

export async function deleteCategory(formData: FormData) {
  await requireRole("ADMIN");
  await prisma.category.delete({ where: { id: String(formData.get("categoryId")) } });
  revalidatePath("/", "layout");
}

export async function retryPayouts() {
  await requireRole("ADMIN");
  await retryDuePayouts();
  revalidatePath("/admin", "layout");
}
