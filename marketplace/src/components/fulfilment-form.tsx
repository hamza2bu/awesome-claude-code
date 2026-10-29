"use client";

import { useActionState } from "react";
import { updateFulfilment } from "@/server/actions/vendor";
import { SubmitButton } from "./submit-button";
import { FormMessage } from "./ui";

const LABELS: Record<string, string> = {
  PROCESSING: "Mark as processing",
  SHIPPED: "Mark as shipped",
  DELIVERED: "Mark as delivered",
  CANCELLED: "Cancel & refund",
};

export function FulfilmentForm({ vendorOrderId, next }: { vendorOrderId: string; next: string[] }) {
  const [state, action] = useActionState(updateFulfilment, {});
  if (next.length === 0) return null;

  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Fulfilment</h2>
      {next.includes("SHIPPED") && (
        <form action={action} className="space-y-2">
          <input type="hidden" name="vendorOrderId" value={vendorOrderId} />
          <input type="hidden" name="status" value="SHIPPED" />
          <label htmlFor="trackingCode" className="label">Tracking number (optional)</label>
          <input id="trackingCode" name="trackingCode" className="input" />
          <SubmitButton className="btn-primary w-full" pendingText="Saving…">{LABELS.SHIPPED}</SubmitButton>
          <p className="text-xs text-slate-500">Your payout is released when the order ships.</p>
        </form>
      )}
      {next
        .filter((s) => s !== "SHIPPED")
        .map((status) => (
          <form
            key={status}
            action={action}
            onSubmit={(e) => {
              if (status === "CANCELLED" && !confirm("Cancel this order and refund the customer?")) e.preventDefault();
            }}
          >
            <input type="hidden" name="vendorOrderId" value={vendorOrderId} />
            <input type="hidden" name="status" value={status} />
            <SubmitButton className={`${status === "CANCELLED" ? "btn-danger" : "btn-secondary"} w-full`} pendingText="Saving…">
              {LABELS[status]}
            </SubmitButton>
          </form>
        ))}
      <FormMessage state={state} />
    </div>
  );
}
