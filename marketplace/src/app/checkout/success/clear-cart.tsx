"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearCart } from "@/server/actions/cart";

/** Cookies can only be changed from actions, so the success page clears the cart on mount. */
export function ClearCart() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    clearCart().then(() => router.refresh());
  }, [router]);
  return null;
}
