"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { freezeOrder } from "@/app/(dash)/admin-actions";

export function DisputeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await freezeOrder(orderId);
            if (!res.ok) setError(res.error ?? "Failed");
            else router.refresh();
          })
        }
      >
        {pending ? "…" : "Dispute"}
      </Button>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
