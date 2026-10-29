"use client";

import { useState } from "react";

/** Collapsed behind a toggle on small screens, always expanded from `lg` up. */
export function MobileCollapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between font-semibold lg:hidden"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span aria-hidden className={`transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      <div className={`${open ? "mt-4 block" : "hidden"} lg:mt-0 lg:block`}>{children}</div>
    </div>
  );
}
