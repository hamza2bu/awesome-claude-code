/**
 * Demo data: an admin, three approved shops with payouts enabled (local provider),
 * one pending shop, a customer, a category tree and a catalogue of products.
 * Run with `npm run db:seed`. All demo accounts use the password "password123".
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "password123";

const CATEGORIES: Record<string, string[]> = {
  Electronics: ["Audio", "Accessories"],
  "Home & Kitchen": ["Kitchen", "Decor"],
  Fashion: ["Bags", "Jewelry"],
  Beauty: [],
  Sports: [],
  Books: [],
};

type SeedProduct = [title: string, category: string, price: number, stock: number, compareAt?: number];

const SHOPS: { name: string; owner: string; email: string; description: string; hue: number; products: SeedProduct[] }[] = [
  {
    name: "Volt & Wire",
    owner: "Vera Volt",
    email: "vendor1@example.com",
    description: "Small-batch audio gear and desk accessories, tested in our own studio.",
    hue: 215,
    products: [
      ["Wireless Noise-Cancelling Headphones", "Audio", 129.0, 25, 159.0],
      ["Walnut Bluetooth Speaker", "Audio", 79.5, 12],
      ["True Wireless Earbuds", "Audio", 59.99, 40, 69.99],
      ["Braided USB-C Cable (2 m)", "Accessories", 12.99, 200],
      ["Aluminium Laptop Stand", "Accessories", 39.0, 18],
      ["Magnetic Phone Charger", "Accessories", 24.5, 3],
    ],
  },
  {
    name: "Clay & Linen",
    owner: "Lina Clay",
    email: "vendor2@example.com",
    description: "Handmade ceramics and natural textiles for slow living.",
    hue: 25,
    products: [
      ["Stoneware Pour-Over Set", "Kitchen", 48.0, 10],
      ["Hand-Thrown Mug, Speckled", "Kitchen", 22.0, 34],
      ["Olive Wood Serving Board", "Kitchen", 36.0, 8, 42.0],
      ["Linen Throw Pillow Cover", "Decor", 28.0, 22],
      ["Soy Candle — Fig & Cedar", "Decor", 18.5, 50],
      ["Woven Seagrass Basket", "Decor", 44.0, 0],
    ],
  },
  {
    name: "Northbound Supply",
    owner: "Noah North",
    email: "vendor3@example.com",
    description: "Everyday carry, outdoor basics and good reads for the road.",
    hue: 150,
    products: [
      ["Waxed Canvas Backpack", "Bags", 98.0, 14, 120.0],
      ["Leather Card Wallet", "Bags", 34.0, 30],
      ["Sterling Silver Compass Pendant", "Jewelry", 56.0, 9],
      ["Insulated Steel Water Bottle", "Sports", 27.0, 60],
      ["Cork Yoga Block (Pair)", "Sports", 25.0, 20],
      ["Natural Bristle Face Brush", "Beauty", 14.0, 45],
      ["Field Guide to Night Skies", "Books", 19.99, 15],
      ["The Long Trail: Essays", "Books", 16.0, 2],
    ],
  },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function svg(title: string, hue: number, variant: number) {
  const h2 = (hue + 35 + variant * 20) % 360;
  const words = title.split(" ");
  const lines: string[] = [];
  for (const w of words) {
    const last = lines.at(-1);
    if (last && (last + " " + w).length <= 16) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  const text = lines
    .slice(0, 3)
    .map((l, i) => `<text x="400" y="${380 + i * 60 - (lines.length - 1) * 30}" text-anchor="middle">${l.replace(/&/g, "&amp;")}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue + variant * 12} 70% 62%)"/><stop offset="1" stop-color="hsl(${h2} 65% 45%)"/></linearGradient></defs>
<rect width="800" height="800" fill="url(#g)"/>
<circle cx="${560 - variant * 80}" cy="${220 + variant * 60}" r="160" fill="white" fill-opacity="0.12"/>
<g font-family="system-ui, sans-serif" font-size="52" font-weight="700" fill="white">${text}</g>
</svg>`;
}

async function main() {
  console.log("Resetting demo data…");
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.vendorOrder.deleteMany(),
    prisma.order.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.shop.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.create({ data: { name: "Ada Admin", email: "admin@example.com", passwordHash, role: "ADMIN" } });
  await prisma.user.create({ data: { name: "Casey Customer", email: "customer@example.com", passwordHash } });

  const categoryIds = new Map<string, string>();
  for (const [parent, children] of Object.entries(CATEGORIES)) {
    const p = await prisma.category.create({ data: { name: parent, slug: slugify(parent) } });
    categoryIds.set(parent, p.id);
    for (const child of children) {
      const c = await prisma.category.create({ data: { name: child, slug: slugify(child), parentId: p.id } });
      categoryIds.set(child, c.id);
    }
  }

  const imageDir = path.join(process.cwd(), "public", "seed");
  await mkdir(imageDir, { recursive: true });

  for (const [i, shop] of SHOPS.entries()) {
    const owner = await prisma.user.create({
      data: {
        name: shop.owner,
        email: shop.email,
        passwordHash,
        role: "VENDOR",
        shop: {
          create: {
            name: shop.name,
            slug: slugify(shop.name),
            description: shop.description,
            status: "ACTIVE",
            // The third shop negotiated a lower rate to show per-shop commission overrides.
            commissionBps: i === 2 ? 800 : null,
            stripeAccountId: `local_acct_seed_${i + 1}`,
            payoutsEnabled: true,
          },
        },
      },
      include: { shop: true },
    });

    for (const [title, category, price, stock, compareAt] of shop.products) {
      const slug = slugify(title);
      const images = [0, 1].map((variant) => ({ file: `${slug}-${variant}.svg`, variant }));
      for (const img of images) await writeFile(path.join(imageDir, img.file), svg(title, shop.hue, img.variant));

      await prisma.product.create({
        data: {
          shopId: owner.shop!.id,
          categoryId: categoryIds.get(category),
          title,
          slug,
          description: `${title} from ${shop.name}.\n\nCarefully made and packed by an independent seller. Ships within 2 business days.\n\n• Quality materials\n• Thoughtful design\n• Backed by marketplace buyer protection`,
          priceCents: Math.round(price * 100),
          compareAtCents: compareAt ? Math.round(compareAt * 100) : null,
          stock,
          status: "ACTIVE",
          images: { create: images.map((img) => ({ url: `/seed/${img.file}`, alt: title, position: img.variant })) },
        },
      });
    }
  }

  await prisma.user.create({
    data: {
      name: "Pat Pending",
      email: "pending@example.com",
      passwordHash,
      role: "VENDOR",
      shop: { create: { name: "Paper Moon Prints", slug: "paper-moon-prints", description: "Risograph art prints." } },
    },
  });

  console.log(`Seeded. Sign in with admin@example.com / customer@example.com / vendor1@example.com (password: ${PASSWORD}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
