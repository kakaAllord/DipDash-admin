"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { approveCourier, rejectCourier } from "@/app/(dash)/admin-actions";

export function CourierApproval({ courierId }: { courierId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    start(async () => {
      const res = await approveCourier(courierId);
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function reject() {
    start(async () => {
      await rejectCourier(courierId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={approve} disabled={pending}>
        {pending ? "…" : "Approve"}
      </Button>
      <Button size="sm" variant="ghost" onClick={reject} disabled={pending}>
        Reject
      </Button>
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </div>
  );
}
