import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OpenShopForm } from "@/components/open-shop-form";
import { env } from "@/lib/env";
import { formatBps } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/server/guards";

export const metadata: Metadata = { title: "Sell on Marketly" };

export default async function SellPage() {
  const user = await currentUser();
  if (user && (await prisma.shop.findUnique({ where: { ownerId: user.id }, select: { id: true } }))) redirect("/vendor");

  const steps = [
    ["Open your shop", "Create a storefront in minutes. We review new shops before they go live."],
    ["List products", "Upload photos, set prices and stock. Manage everything from your phone."],
    ["Get paid", `Connect payouts once. We transfer your earnings when you ship — minus a ${formatBps(env.defaultCommissionBps)} commission.`],
  ];

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Sell to customers everywhere</h1>
        <p className="mt-3 text-lg text-slate-600">No monthly fees. You only pay a commission when you make a sale.</p>
        <ol className="mt-8 space-y-5">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-slate-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="card p-6 sm:p-8">
        {user ? (
          <>
            <h2 className="mb-4 text-xl font-bold">Open your shop</h2>
            <OpenShopForm />
          </>
        ) : (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold">Ready to start?</h2>
            <Link href="/register?type=vendor" className="btn-accent w-full py-3">Create a seller account</Link>
            <p className="text-sm text-slate-600">
              Already a customer? <Link href="/login?callbackUrl=/sell" className="font-semibold text-brand-600">Sign in</Link> to open a shop.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
