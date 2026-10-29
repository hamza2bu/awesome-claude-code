import "server-only";
import { prisma } from "@/lib/prisma";

export async function categoryOptions() {
  const categories = await prisma.category.findMany({ include: { parent: true } });
  return categories
    .map((c) => ({ id: c.id, name: c.name, parentName: c.parent?.name ?? null }))
    .sort((a, b) => `${a.parentName ?? a.name} ${a.name}`.localeCompare(`${b.parentName ?? b.name} ${b.name}`));
}
