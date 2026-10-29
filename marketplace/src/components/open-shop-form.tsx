"use client";

import { useActionState } from "react";
import { openShop } from "@/server/actions/vendor";
import { SubmitButton } from "./submit-button";
import { FieldError, FormMessage } from "./ui";

export function OpenShopForm() {
  const [state, action] = useActionState(openShop, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">Shop name</label>
        <input id="name" name="name" required className="input" />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div>
        <label htmlFor="description" className="label">What do you sell? (optional)</label>
        <textarea id="description" name="description" rows={3} className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-accent w-full py-3" pendingText="Opening shop…">Open my shop</SubmitButton>
    </form>
  );
}
