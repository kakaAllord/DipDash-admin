"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { tsh, clock } from "@/lib/format";
import { getSocket, emitOrderStatus } from "@/lib/realtime";
import { assignCourier } from "@/app/(dash)/admin-actions";
import type { ScheduledOrderRow, AssignableCourier } from "@/lib/repo/admin";

const AUTO_OPEN_LEAD_MS = 40 * 60 * 1000;

function autoOpenLabel(deliverAt: number | null): string {
  if (deliverAt == null) return "";
  const ms = deliverAt - AUTO_OPEN_LEAD_MS - Date.now();
  if (ms <= 0) return "open to pool";
  const mins = Math.round(ms / 60000);
  return `auto-opens in ${mins}m`;
}

export function DispatchList({
  orders,
  couriers,
}: {
  orders: ScheduledOrderRow[];
  couriers: AssignableCourier[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});

  function assign(orderId: string) {
    const courierId = picks[orderId];
    if (!courierId) return;
    setError(null);
    start(async () => {
      const res = await assignCourier(orderId, courierId);
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      emitOrderStatus(getSocket({ role: "admin", id: "admin" }), {
        orderId,
        status: "accepted",
      });
      router.refresh();
    });
  }

  if (orders.length === 0) {
    return <p className="text-sm text-muted">No scheduled orders awaiting dispatch.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      {orders.map((o) => {
        const eligible = couriers.filter((c) => c.ceilingTsh >= o.itemCostTsh);
        return (
          <Card key={o.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">
                  {o.vendorName} → {o.studentName}
                </p>
                <p className="truncate text-sm text-muted">
                  {o.deliverTo ?? "No note"} · value {tsh(o.itemCostTsh)}
                  {o.hasHotMeal ? " · 🍲 hot meal" : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {o.deliverAt && (
                  <Badge tone="info">deliver {clock(o.deliverAt)}</Badge>
                )}
                <span className="text-[11px] text-muted">
                  {autoOpenLabel(o.deliverAt)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={picks[o.id] ?? ""}
                onChange={(e) =>
                  setPicks((p) => ({ ...p, [o.id]: e.target.value }))
                }
                className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-sm"
              >
                <option value="">Assign courier…</option>
                {eligible.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isOnline ? "🟢" : "⚪"} · ceiling {tsh(c.ceilingTsh)}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => assign(o.id)}
                disabled={pending || !picks[o.id]}
              >
                {pending ? "…" : "Dispatch"}
              </Button>
            </div>
            {eligible.length === 0 && (
              <p className="text-xs text-danger">
                No active courier has a high enough ceiling for this order.
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
