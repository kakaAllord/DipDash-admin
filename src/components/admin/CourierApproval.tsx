"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { approveCourier, rejectCourier } from "@/app/(dash)/admin-actions";

export function CourierApproval({ courierId }: { courierId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    start(async () => {
      const res = await approveCourier(courierId);
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setToken(res.token ?? null);
        router.refresh();
      }
    });
  }

  function reject() {
    start(async () => {
      await rejectCourier(courierId);
      router.refresh();
    });
  }

  if (token) {
    return (
      <div className="rounded-lg border border-primary bg-primary-soft/50 px-3 py-2 text-sm">
        ✅ Approved. Activation token (sent via SMS):{" "}
        <span className="font-mono text-base font-bold tracking-wider text-primary-dark">
          {token}
        </span>
      </div>
    );
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
