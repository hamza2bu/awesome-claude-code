import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveLocalUpload } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/** Serves images saved by the local storage fallback (when neither Cloudinary nor S3 is configured). */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const relative = (await params).path.join("/");
  const file = resolveLocalUpload(relative);
  const type = TYPES[path.extname(relative).toLowerCase()];
  if (!file || !type) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
