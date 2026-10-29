import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/guards";
import { abandonOrder } from "@/server/orders";

/** Stripe sends customers here when they back out of Checkout; release the reserved stock. */
export default async function CheckoutCancelledPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const user = await requireUser();
  const { order: orderId } = await searchParams;
  if (orderId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId: user.id } });
    if (order) await abandonOrder(order.id);
  }
  redirect("/cart");
}
