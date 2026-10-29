"use client";

import { useActionState } from "react";
import { submitReview } from "@/server/actions/reviews";
import { SubmitButton } from "./submit-button";
import { FieldError, FormMessage } from "./ui";

export function ReviewForm({ productId, existing }: { productId: string; existing?: { rating: number; comment: string | null } }) {
  const [state, action] = useActionState(submitReview, {});
  return (
    <form action={action} className="card space-y-3 p-4">
      <p className="font-semibold">{existing ? "Update your review" : "Review this product"}</p>
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="label">Rating</legend>
        <div className="flex flex-wrap gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium has-checked:border-amber-400 has-checked:bg-amber-50 has-focus-visible:ring-2 has-focus-visible:ring-brand-100"
            >
              <input type="radio" name="rating" value={n} defaultChecked={existing?.rating === n} className="sr-only" />
              {n} <span className="text-amber-400" aria-hidden>★</span>
              <span className="sr-only"> stars</span>
            </label>
          ))}
        </div>
        <FieldError errors={state.fieldErrors?.rating} />
      </fieldset>
      <div>
        <label htmlFor="comment" className="label">Comment (optional)</label>
        <textarea id="comment" name="comment" rows={3} defaultValue={existing?.comment ?? ""} className="input" maxLength={2000} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Submit review</SubmitButton>
    </form>
  );
}
