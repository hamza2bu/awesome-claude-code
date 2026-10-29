import { SORTS } from "@/lib/catalog";

export function CatalogFilters({
  params,
  categories,
  action,
}: {
  params: Record<string, string | undefined>;
  categories?: { slug: string; name: string }[];
  action: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {params.q && <input type="hidden" name="q" value={params.q} />}
      <div>
        <label htmlFor="sort" className="label">Sort by</label>
        <select id="sort" name="sort" defaultValue={params.sort ?? "relevance"} className="input">
          {Object.entries(SORTS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      {categories && (
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" defaultValue={params.category ?? ""} className="input">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      <fieldset>
        <legend className="label">Price</legend>
        <div className="flex items-center gap-2">
          <input aria-label="Minimum price" name="min" inputMode="decimal" defaultValue={params.min} placeholder="Min" className="input" />
          <span className="text-slate-400">–</span>
          <input aria-label="Maximum price" name="max" inputMode="decimal" defaultValue={params.max} placeholder="Max" className="input" />
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="instock" value="1" defaultChecked={params.instock === "1"} className="size-4 rounded border-slate-300" />
        In stock only
      </label>
      <button className="btn-primary w-full">Apply filters</button>
    </form>
  );
}
