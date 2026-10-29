"use client";

import Image from "next/image";
import { useState } from "react";

export function ImageGallery({ images, title }: { images: { url: string; alt: string | null }[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!current) {
    return <div className="card grid aspect-square place-items-center text-slate-400">No image</div>;
  }

  return (
    <div className="space-y-3">
      <div className="card relative aspect-square overflow-hidden">
        <Image src={current.url} alt={current.alt ?? title} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 sm:size-20 ${i === active ? "border-brand-600" : "border-transparent"}`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
