"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CATEGORY_LABEL, MENU_CATEGORIES } from "@/lib/domain/catalog";
import { createMenuItem } from "@/app/(dash)/admin-actions";

export function MenuItemCreate({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(MENU_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createMenuItem({
        vendorId,
        name,
        category,
        priceTsh: Number(price) || 0,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      setName("");
      setPrice("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 text-left text-sm font-medium text-primary hover:underline"
      >
        + Add item
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chips Kavu"
        />
        <Input
          label="Price (TSh)"
          type="number"
          min={0}
          step={100}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="2000"
        />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-text">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
        >
          {MENU_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending || !name || !price}>
          {pending ? "Saving…" : "Add item"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
