import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth-forms";
import { loginWithGoogle } from "@/server/actions/auth";
import { safeRedirect } from "@/server/actions/types";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = safeRedirect((await searchParams).callbackUrl);
  if (await auth()) redirect(callbackUrl);
  const google = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <div className="container-page max-w-md py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
        {google && (
          <>
            <form action={loginWithGoogle}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button className="btn-secondary w-full py-3">Continue with Google</button>
            </form>
            <p className="my-4 text-center text-xs text-slate-400 uppercase">or</p>
          </>
        )}
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
