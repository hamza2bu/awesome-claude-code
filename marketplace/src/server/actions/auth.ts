"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { safeRedirect, type ActionState } from "./types";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    accountType: z.enum(["customer", "vendor"]),
    shopName: z.string().trim().max(80).optional(),
  })
  .refine((d) => d.accountType === "customer" || (d.shopName && d.shopName.length >= 2), {
    path: ["shopName"],
    message: "Give your shop a name",
  });

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, email, password, accountType, shopName } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: ["An account with this email already exists"] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: accountType === "vendor" ? "VENDOR" : "CUSTOMER",
      ...(accountType === "vendor" && shopName
        ? { shop: { create: { name: shopName, slug: uniqueSlug(shopName) } } }
        : {}),
    },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: accountType === "vendor" ? "/vendor" : safeRedirect(formData.get("callbackUrl")),
  });
  return {};
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeRedirect(formData.get("callbackUrl")),
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Invalid email or password" };
    throw err; // NEXT_REDIRECT on success
  }
  return {};
}

export async function loginWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeRedirect(formData.get("callbackUrl")) });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
