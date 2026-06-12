"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { approveDeduction, dismissDispute } from "@/app/(dash)/admin-actions";

export function EscrowActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn(orderId);
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => run(approveDeduction)}
        >
          Approve deduction
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(dismissDispute)}
        >
          Dismiss
        </Button>
      </div>
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </div>
  );
}
