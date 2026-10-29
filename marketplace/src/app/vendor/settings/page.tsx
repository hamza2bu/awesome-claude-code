import { ShopSettingsForm } from "@/components/shop-settings-form";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/ui";
import { env, paymentProviderName } from "@/lib/env";
import { formatBps } from "@/lib/money";
import { openPayoutDashboard, refreshPayoutStatus, startPayoutOnboarding } from "@/server/actions/vendor";
import { requireShop } from "@/server/guards";

export default async function VendorSettingsPage({ searchParams }: { searchParams: Promise<{ payouts?: string }> }) {
  const { shop } = await requireShop();
  const { payouts } = await searchParams;
  const provider = paymentProviderName();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shop & payouts</h1>

      <section className="card space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Payouts</h2>
          <StatusBadge status={shop.payoutsEnabled ? "ACTIVE" : "PENDING"} />
        </div>
        <p className="text-sm text-slate-600">
          Customers pay the platform once per checkout. When you ship an order, we transfer your share — item total plus shipping,
          minus the <strong>{formatBps(shop.commissionBps ?? env.defaultCommissionBps)}</strong> commission —{" "}
          {provider === "stripe" ? "to your Stripe Express account." : "to your payout account (local test provider)."}
        </p>
        {payouts === "return" && !shop.payoutsEnabled && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Thanks! If you finished onboarding, refresh the status below — verification can take a few minutes.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {!shop.payoutsEnabled && (
            <form action={startPayoutOnboarding}>
              <SubmitButton className="btn-accent" pendingText="Redirecting…">
                {shop.stripeAccountId ? "Continue payout setup" : "Set up payouts"}
              </SubmitButton>
            </form>
          )}
          {shop.stripeAccountId && (
            <form action={refreshPayoutStatus}>
              <SubmitButton className="btn-secondary" pendingText="Checking…">Refresh status</SubmitButton>
            </form>
          )}
          {shop.payoutsEnabled && provider === "stripe" && (
            <form action={openPayoutDashboard}>
              <SubmitButton className="btn-secondary" pendingText="Opening…">Open Stripe dashboard</SubmitButton>
            </form>
          )}
        </div>
      </section>

      <ShopSettingsForm shop={shop} />
    </div>
  );
}
