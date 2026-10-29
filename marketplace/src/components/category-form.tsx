"use client";

import { useActionState } from "react";
import { createCategory } from "@/server/actions/admin";
import { SubmitButton } from "./submit-button";
import { FormMessage } from "./ui";

export function CategoryForm({ parents }: { parents: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createCategory, {});
  return (
    <form action={action} className="card space-y-3 p-4">
      <h2 className="font-semibold">New category</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="cat-name" className="label">Name</label>
          <input id="cat-name" name="name" required className="input" />
        </div>
        <div>
          <label htmlFor="cat-parent" className="label">Parent</label>
          <select id="cat-parent" name="parentId" className="input" defaultValue="">
            <option value="">Top level</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
