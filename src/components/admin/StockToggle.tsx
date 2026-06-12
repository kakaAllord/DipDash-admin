"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { toggleStock } from "@/app/(dash)/admin-actions";

export function StockToggle({
  menuItemId,
  inStock,
}: {
  menuItemId: string;
  inStock: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(inStock);

  function flip() {
    const next = !on;
    setOn(next); // optimistic
    start(async () => {
      const res = await toggleStock(menuItemId, next);
      if (!res.ok) setOn(!next);
      router.refresh();
    });
  }

  return (
    <button
      onClick={flip}
      disabled={pending}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        on ? "bg-primary" : "bg-border"
      )}
      aria-label={on ? "In stock" : "Out of stock"}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          on ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
