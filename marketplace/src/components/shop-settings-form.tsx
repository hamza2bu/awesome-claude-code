"use client";

import { useActionState } from "react";
import { updateShop } from "@/server/actions/vendor";
import { SubmitButton } from "./submit-button";
import { FieldError, FormMessage } from "./ui";

export function ShopSettingsForm({ shop }: { shop: { name: string; description: string | null } }) {
  const [state, action] = useActionState(updateShop, {});
  const fileClass =
    "block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700";
  return (
    <form action={action} className="card space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Shop profile</h2>
      <div>
        <label htmlFor="name" className="label">Shop name</label>
        <input id="name" name="name" defaultValue={shop.name} required className="input" />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div>
        <label htmlFor="description" className="label">About your shop</label>
        <textarea id="description" name="description" defaultValue={shop.description ?? ""} rows={4} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="logo" className="label">Logo</label>
          <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={fileClass} />
        </div>
        <div>
          <label htmlFor="banner" className="label">Banner</label>
          <input id="banner" name="banner" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={fileClass} />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
