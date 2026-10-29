import type { NextConfig } from "next";

const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
  { protocol: "https", hostname: "res.cloudinary.com" },
  { protocol: "https", hostname: "**.amazonaws.com" },
  { protocol: "https", hostname: "images.unsplash.com" },
];

// Custom S3-compatible / CDN host (e.g. CloudFront, R2) used for product images.
if (process.env.S3_PUBLIC_URL) {
  const url = new URL(process.env.S3_PUBLIC_URL);
  remotePatterns.push({ protocol: url.protocol.replace(":", "") as "http" | "https", hostname: url.hostname });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    // Demo seed images are SVG; vendor uploads are restricted to raster formats.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    // Product forms upload up to 8 images through a server action.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
