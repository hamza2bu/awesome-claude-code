"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register } from "@/server/actions/auth";
import { SubmitButton } from "./submit-button";
import { FieldError, FormMessage } from "./ui";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        New here?{" "}
        <Link href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="font-semibold text-brand-600">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ initialType = "customer", callbackUrl }: { initialType?: "customer" | "vendor"; callbackUrl?: string }) {
  const [state, action] = useActionState(register, {});
  const [type, setType] = useState(initialType);
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <fieldset>
        <legend className="label">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "vendor"] as const).map((t) => (
            <label key={t} className="cursor-pointer rounded-lg border border-slate-300 p-3 text-sm has-checked:border-brand-600 has-checked:bg-brand-50">
              <input type="radio" name="accountType" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              <span className="block font-semibold">{t === "customer" ? "Shop" : "Sell"}</span>
              <span className="text-slate-500">{t === "customer" ? "Buy from independent shops" : "Open a shop and list products"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="name" className="label">Your name</label>
        <input id="name" name="name" autoComplete="name" required className="input" />
        <FieldError errors={err.name} />
      </div>
      {type === "vendor" && (
        <div>
          <label htmlFor="shopName" className="label">Shop name</label>
          <input id="shopName" name="shopName" required className="input" />
          <FieldError errors={err.shopName} />
        </div>
      )}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        <FieldError errors={err.email} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        <FieldError errors={err.password} />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link>
      </p>
    </form>
  );
}
