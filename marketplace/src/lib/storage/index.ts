import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** Dev-only fallback store, served by `app/api/uploads/[...path]/route.ts`. */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

/** Maps a relative upload path to a file inside LOCAL_UPLOAD_DIR, rejecting traversal. */
export function resolveLocalUpload(relative: string) {
  const target = path.resolve(LOCAL_UPLOAD_DIR, relative);
  return target.startsWith(LOCAL_UPLOAD_DIR + path.sep) ? target : null;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export interface StoredImage {
  url: string;
  key: string;
}

export class ImageValidationError extends Error {}

type Backend = "cloudinary" | "s3" | "local";

function backend(): Backend {
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) return "cloudinary";
  if (process.env.S3_BUCKET) return "s3";
  return "local";
}

let s3Client: S3Client | null = null;
function s3() {
  s3Client ??= new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
  });
  return s3Client;
}

function s3PublicUrl(key: string) {
  const base =
    process.env.S3_PUBLIC_URL ??
    `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION ?? "us-east-1"}.amazonaws.com`;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/** CLOUDINARY_URL is read automatically; the split variables need explicit config. */
function configureCloudinary() {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

function validate(file: File) {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new ImageValidationError(`Unsupported image type: ${file.type || "unknown"}`);
  if (file.size > MAX_IMAGE_BYTES) throw new ImageValidationError("Images must be 5 MB or smaller");
  return ext;
}

/** Files from <input type="file"> include an empty placeholder when nothing is chosen. */
export function realFiles(entries: FormDataEntryValue[]): File[] {
  return entries.filter((e): e is File => e instanceof File && e.size > 0);
}

/** Stores an image in Cloudinary, S3, or (dev fallback) `public/uploads`. */
export async function uploadImage(file: File, folder: string): Promise<StoredImage> {
  const ext = validate(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  const name = randomUUID();

  switch (backend()) {
    case "cloudinary": {
      configureCloudinary();
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: `marketplace/${folder}`, public_id: name, resource_type: "image" }, (err, res) =>
            err || !res ? reject(err ?? new Error("Upload failed")) : resolve(res),
          )
          .end(bytes);
      });
      return { url: result.secure_url, key: `cloudinary:${result.public_id}` };
    }
    case "s3": {
      const key = `${folder}/${name}.${ext}`;
      await s3().send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: bytes,
          ContentType: file.type,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return { url: s3PublicUrl(key), key: `s3:${key}` };
    }
    case "local": {
      const dir = path.join(LOCAL_UPLOAD_DIR, folder);
      await mkdir(dir, { recursive: true });
      const file = `${name}.${ext}`;
      await writeFile(path.join(dir, file), bytes);
      return { url: `/api/uploads/${folder}/${file}`, key: `local:${folder}/${file}` };
    }
  }
}

export async function deleteImage(key: string | null | undefined) {
  if (!key) return;
  const [kind, ...rest] = key.split(":");
  const id = rest.join(":");
  try {
    if (kind === "cloudinary") {
      configureCloudinary();
      await cloudinary.uploader.destroy(id);
    }
    else if (kind === "s3") await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: id }));
    else if (kind === "local") {
      const target = resolveLocalUpload(id);
      if (target) await unlink(target);
    }
  } catch (err) {
    // Orphaned blobs are harmless; never fail the user's action because cleanup failed.
    console.warn(`Failed to delete image ${key}`, err);
  }
}
