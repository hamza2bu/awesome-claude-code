"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { VendorOrderStatus } from "@prisma/client";
import { z } from "zod";
import { unstable_update } from "@/auth";
import { parseMoneyToCents } from "@/lib/money";
import { paymentProvider } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";
import { deleteImage, ImageValidationError, realFiles, uploadImage } from "@/lib/storage";
import { requireShop, requireUser } from "@/server/guards";
import { CheckoutError, retryDuePayouts, updateVendorOrderStatus } from "@/server/orders";
import type { ActionState } from "./types";

const MAX_IMAGES = 8;

const shopSchema = z.object({
  name: z.string().trim().min(2, "Shop name is too short").max(80),
  description: z.string().trim().max(2000).optional(),
});

/** Existing customers open a shop from /sell. New shops start PENDING until an admin approves. */
export async function openShop(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/sell");
  const parsed = shopSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (await prisma.shop.findUnique({ where: { ownerId: user.id } })) redirect("/vendor");

  await prisma.$transaction([
    prisma.shop.create({
      data: { ownerId: user.id, name: parsed.data.name, description: parsed.data.description, slug: uniqueSlug(parsed.data.name) },
    }),
    // Admins keep their role; everyone else becomes a vendor.
    prisma.user.updateMany({ where: { id: user.id, role: "CUSTOMER" }, data: { role: "VENDOR" } }),
  ]);
  await unstable_update({}); // refresh the role in the session token
  redirect("/vendor");
}

export async function updateShop(_: ActionState, formData: FormData): Promise<ActionState> {
  const { shop } = await requireShop();
  const parsed = shopSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const [logo] = realFiles(formData.getAll("logo"));
  const [banner] = realFiles(formData.getAll("banner"));
  try {
    const logoImg = logo ? await uploadImage(logo, `shops/${shop.id}`) : null;
    const bannerImg = banner ? await uploadImage(banner, `shops/${shop.id}`) : null;
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        ...(logoImg ? { logoUrl: logoImg.url } : {}),
        ...(bannerImg ? { bannerUrl: bannerImg.url } : {}),
      },
    });
  } catch (err) {
    if (err instanceof ImageValidationError) return { error: err.message };
    throw err;
  }
  revalidatePath("/vendor", "layout");
  revalidatePath(`/shops/${shop.slug}`);
  return { success: "Shop profile saved" };
}

const productSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(140),
  description: z.string().trim().min(10, "Describe the product in a bit more detail").max(10_000),
  price: z.string().transform((v, ctx) => {
    const cents = parseMoneyToCents(v);
    if (cents === null || cents < 50) {
      ctx.addIssue({ code: "custom", message: "Enter a price of at least 0.50" });
      return z.NEVER;
    }
    return cents;
  }),
  compareAt: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const cents = parseMoneyToCents(v);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
        return z.NEVER;
      }
      return cents;
    }),
  stock: z.coerce.number().int("Stock must be a whole number").min(0).max(1_000_000),
  sku: z.string().trim().max(64).optional(),
  categoryId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

export async function saveProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const { shop } = await requireShop();
  const productId = formData.get("productId") ? String(formData.get("productId")) : null;
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const data = parsed.data;

  if (data.compareAt !== null && data.compareAt <= data.price) {
    return { fieldErrors: { compareAt: ["Compare-at price must be higher than the price"] } };
  }
  if (data.categoryId && !(await prisma.category.findUnique({ where: { id: data.categoryId } }))) {
    return { fieldErrors: { categoryId: ["Unknown category"] } };
  }

  const existing = productId
    ? await prisma.product.findFirst({ where: { id: productId, shopId: shop.id }, include: { images: true } })
    : null;
  if (productId && !existing) return { error: "Product not found" };

  const files = realFiles(formData.getAll("images"));
  const imageCount = (existing?.images.length ?? 0) + files.length;
  if (imageCount > MAX_IMAGES) return { error: `A product can have at most ${MAX_IMAGES} images` };
  if (data.status === "ACTIVE" && imageCount === 0) {
    return { error: "Add at least one image before publishing" };
  }

  let uploaded;
  try {
    uploaded = await Promise.all(files.map((f) => uploadImage(f, `products/${shop.id}`)));
  } catch (err) {
    if (err instanceof ImageValidationError) return { error: err.message };
    throw err;
  }

  const fields = {
    title: data.title,
    description: data.description,
    priceCents: data.price,
    compareAtCents: data.compareAt,
    stock: data.stock,
    sku: data.sku || null,
    categoryId: data.categoryId || null,
    status: data.status,
  };
  const startPosition = existing?.images.reduce((max, i) => Math.max(max, i.position + 1), 0) ?? 0;
  const images = uploaded.map((img, i) => ({
    url: img.url,
    storageKey: img.key,
    alt: data.title,
    position: startPosition + i,
  }));

  const saved = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: { ...fields, images: { create: images } },
      })
    : await prisma.product.create({
        data: { ...fields, shopId: shop.id, slug: `${slugify(data.title) || "product"}-${Date.now().toString(36)}`, images: { create: images } },
      });

  revalidatePath("/vendor/products");
  revalidatePath(`/products/${saved.slug}`);
  if (!existing) redirect(`/vendor/products/${saved.id}?created=1`);
  return { success: "Product saved" };
}

export async function deleteProductImage(formData: FormData) {
  const { shop } = await requireShop();
  const image = await prisma.productImage.findFirst({
    where: { id: String(formData.get("imageId")), product: { shopId: shop.id } },
    include: { product: true },
  });
  if (!image) return;
  await prisma.productImage.delete({ where: { id: image.id } });
  await deleteImage(image.storageKey);
  revalidatePath(`/vendor/products/${image.productId}`);
  revalidatePath(`/products/${image.product.slug}`);
}

const fulfilmentSchema = z.object({
  vendorOrderId: z.string().min(1),
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  trackingCode: z.string().trim().max(100).optional(),
});

export async function updateFulfilment(_: ActionState, formData: FormData): Promise<ActionState> {
  const { shop } = await requireShop();
  const parsed = fulfilmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid update" };
  try {
    await updateVendorOrderStatus(
      shop.id,
      parsed.data.vendorOrderId,
      parsed.data.status as VendorOrderStatus,
      parsed.data.trackingCode,
    );
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    throw err;
  }
  revalidatePath("/vendor/orders");
  revalidatePath(`/vendor/orders/${parsed.data.vendorOrderId}`);
  return { success: `Marked as ${parsed.data.status.toLowerCase()}` };
}

/** Sends the vendor to the payment provider's hosted onboarding (Stripe Connect Express). */
export async function startPayoutOnboarding() {
  const { user, shop } = await requireShop();
  const provider = paymentProvider();
  const { accountId, url } = await provider.onboardingLink({
    id: shop.id,
    email: user.email!,
    name: shop.name,
    stripeAccountId: shop.stripeAccountId,
  });
  if (accountId !== shop.stripeAccountId) {
    await prisma.shop.update({ where: { id: shop.id }, data: { stripeAccountId: accountId } });
  }
  if (provider.name === "local") {
    // No hosted onboarding locally: the account is usable immediately.
    await prisma.shop.update({ where: { id: shop.id }, data: { payoutsEnabled: true } });
    await retryDuePayouts(shop.id);
    revalidatePath("/vendor", "layout");
  }
  redirect(url);
}

export async function refreshPayoutStatus() {
  const { shop } = await requireShop();
  if (!shop.stripeAccountId) return;
  const { payoutsEnabled } = await paymentProvider().accountStatus(shop.stripeAccountId);
  await prisma.shop.update({ where: { id: shop.id }, data: { payoutsEnabled } });
  if (payoutsEnabled) await retryDuePayouts(shop.id);
  revalidatePath("/vendor", "layout");
}

export async function openPayoutDashboard() {
  const { shop } = await requireShop();
  if (!shop.stripeAccountId) return;
  const url = await paymentProvider().dashboardLink(shop.stripeAccountId);
  if (url) redirect(url);
}
