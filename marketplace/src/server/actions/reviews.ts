"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/guards";
import type { ActionState } from "./types";

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(2000).optional(),
});

/** Only verified buyers (a paid, non-cancelled order containing the product) can review. */
export async function submitReview(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { productId, rating, comment } = parsed.data;

  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      vendorOrder: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        order: { customerId: user.id },
      },
    },
  });
  if (!purchased) return { error: "Only customers who bought this product can review it" };

  const product = await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { productId_userId: { productId, userId: user.id } },
      create: { productId, userId: user.id, rating, comment: comment || null },
      update: { rating, comment: comment || null },
    });
    const agg = await tx.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    return tx.product.update({
      where: { id: productId },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
    });
  });
  revalidatePath(`/products/${product.slug}`);
  return { success: "Thanks for your review!" };
}
