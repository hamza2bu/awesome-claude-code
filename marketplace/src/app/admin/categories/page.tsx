import { CategoryForm } from "@/components/category-form";
import { prisma } from "@/lib/prisma";
import { deleteCategory } from "@/server/actions/admin";
import { requireRole } from "@/server/guards";

export default async function AdminCategoriesPage() {
  await requireRole("ADMIN");
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
      children: { orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      <CategoryForm parents={roots} />
      <ul className="card divide-y divide-slate-100">
        {roots.map((root) => (
          <li key={root.id} className="p-4">
            <CategoryRow id={root.id} name={root.name} count={root._count.products} />
            {root.children.length > 0 && (
              <ul className="mt-2 space-y-2 border-l border-slate-200 pl-4">
                {root.children.map((child) => (
                  <li key={child.id}><CategoryRow id={child.id} name={child.name} count={child._count.products} /></li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryRow({ id, name, count }: { id: string; name: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span><span className="font-medium">{name}</span> <span className="text-slate-500">· {count} products</span></span>
      <form action={deleteCategory}>
        <input type="hidden" name="categoryId" value={id} />
        <button className="text-red-600 hover:underline">Delete</button>
      </form>
    </div>
  );
}
