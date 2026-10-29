"use client";

import { useActionState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { checkout } from "@/server/actions/checkout";
import { SubmitButton } from "./submit-button";
import { FieldError, FormMessage } from "./ui";

export function CheckoutForm({ defaultName, totalLabel, providerLabel }: { defaultName?: string; totalLabel: string; providerLabel: string }) {
  const [state, action] = useActionState(checkout, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="card space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Shipping address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" name="name" autoComplete="name" defaultValue={defaultName} className="input" required />
          <FieldError errors={err.name} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="line1" className="label">Address</label>
          <input id="line1" name="line1" autoComplete="address-line1" className="input" required />
          <FieldError errors={err.line1} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="line2" className="label">Apartment, suite, etc. (optional)</label>
          <input id="line2" name="line2" autoComplete="address-line2" className="input" />
        </div>
        <div>
          <label htmlFor="city" className="label">City</label>
          <input id="city" name="city" autoComplete="address-level2" className="input" required />
          <FieldError errors={err.city} />
        </div>
        <div>
          <label htmlFor="postalCode" className="label">Postal code</label>
          <input id="postalCode" name="postalCode" autoComplete="postal-code" className="input" required />
          <FieldError errors={err.postalCode} />
        </div>
        <div>
          <label htmlFor="country" className="label">Country</label>
          <select id="country" name="country" autoComplete="country" className="input" defaultValue="US">
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <FieldError errors={err.country} />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className="input" />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-accent w-full py-3 text-base" pendingText="Redirecting to payment…">
        Pay {totalLabel}
      </SubmitButton>
      <p className="text-center text-xs text-slate-500">You&apos;ll complete payment securely with {providerLabel}.</p>
    </form>
  );
}
