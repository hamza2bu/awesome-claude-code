import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser(callbackUrl?: string) {
  const user = await currentUser();
  if (!user) redirect(`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

/** Resolves the signed-in vendor's shop, or sends them to the seller sign-up page. */
export async function requireShop() {
  const user = await requireUser("/vendor");
  const shop = await prisma.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) redirect("/sell");
  return { user, shop };
}
