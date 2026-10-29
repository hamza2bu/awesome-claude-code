import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Coarse, edge-of-app route protection. Every page and server action re-checks access
 * on the server (see `src/server/guards.ts`); this just gives fast redirects.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (!req.auth) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  if (pathname.startsWith("/vendor") && role !== "VENDOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/sell", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/vendor/:path*", "/account/:path*", "/checkout/:path*"],
};
