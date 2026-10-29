import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth-forms";
import { safeRedirect } from "@/server/actions/types";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ type?: string; callbackUrl?: string }> }) {
  const params = await searchParams;
  if (await auth()) redirect("/");
  return (
    <div className="container-page max-w-md py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
        <RegisterForm initialType={params.type === "vendor" ? "vendor" : "customer"} callbackUrl={safeRedirect(params.callbackUrl)} />
      </div>
    </div>
  );
}
