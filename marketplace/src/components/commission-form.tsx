"use client";

import { useActionState } from "react";
import { setShopCommission } from "@/server/actions/admin";

export function CommissionForm({ shopId, bps, defaultBps }: { shopId: string; bps: number | null; defaultBps: number }) {
  const [state, action, pending] = useActionState(setShopCommission, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="shopId" value={shopId} />
      <label className="sr-only" htmlFor={`commission-${shopId}`}>Commission %</label>
      <input
        id={`commission-${shopId}`}
        name="commission"
        inputMode="decimal"
        defaultValue={bps == null ? "" : String(bps / 100)}
        placeholder={`${defaultBps / 100} (default)`}
        className="input w-28 py-1.5"
      />
      <span className="text-sm text-slate-500">%</span>
      <button className="btn-secondary px-3 py-1.5" disabled={pending}>Save</button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.success && <span className="text-xs text-emerald-700">{state.success}</span>}
    </form>
  );
}
