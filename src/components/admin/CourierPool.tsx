"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { tsh } from "@/lib/format";
import { orderCeiling } from "@/lib/domain/risk";
import { getSocket, joinRoom } from "@/lib/realtime";
import { CourierDetail, type CourierLite } from "@/components/admin/CourierDetail";

interface PoolCourier extends CourierLite {
  earningsTsh: number;
  gender: string | null;
  rating?: { avg: number; count: number };
}

const STATUS_TONE = {
  pending: "accent",
  approved: "info",
  active: "primary",
  restricted: "danger",
} as const;

/**
 * Courier pool with LIVE online status (driven by the presence socket, so it
 * stays in sync) plus headline counts: total, online, offline, and ladies.
 */
export function CourierPool({ couriers }: { couriers: PoolCourier[] }) {
  // Seed from the server snapshot, then keep in sync over sockets.
  const [online, setOnline] = useState<Set<string>>(
    () => new Set(couriers.filter((c) => c.isOnline).map((c) => c.id))
  );

  useEffect(() => {
    const s = getSocket({ role: "admin", id: "admin" });
    joinRoom(s, "couriers");
    function onSnap(list: { courierId: string }[]) {
      setOnline(new Set(list.map((x) => x.courierId)));
    }
    function onPresence(p: { courierId: string; online: boolean }) {
      setOnline((prev) => {
        const next = new Set(prev);
        if (p.online) next.add(p.courierId);
        else next.delete(p.courierId);
        return next;
      });
    }
    s.on("presence:snapshot", onSnap);
    s.on("presence", onPresence);
    return () => {
      s.off("presence:snapshot", onSnap);
      s.off("presence", onPresence);
    };
  }, []);

  const total = couriers.length;
  const onlineCount = couriers.filter((c) => online.has(c.id)).length;
  const ladies = couriers.filter((c) => c.gender === "female").length;

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Couriers" value={String(total)} />
        <Stat label="Online now" value={String(onlineCount)} tone="primary" />
        <Stat label="Offline" value={String(total - onlineCount)} />
        <Stat label="Ladies" value={String(ladies)} tone="accent" />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">Courier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Deposit</th>
              <th className="px-4 py-3">Ceiling</th>
              <th className="px-4 py-3">Earnings</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Online</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {couriers.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold">
                    {c.studentName}{" "}
                    {c.gender === "female" ? "♀" : c.gender === "male" ? "♂" : ""}
                  </p>
                  <p className="text-xs text-muted">{c.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE]}>
                    {c.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">{tsh(c.depositTsh)}</td>
                <td className="px-4 py-3">{tsh(orderCeiling(c.depositTsh))}</td>
                <td className="px-4 py-3 font-medium text-primary">
                  {tsh(c.earningsTsh)}
                </td>
                <td className="px-4 py-3">
                  {c.rating ? (
                    <span className="font-medium">
                      ★ {c.rating.avg.toFixed(1)}{" "}
                      <span className="text-xs text-muted">({c.rating.count})</span>
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{online.has(c.id) ? "🟢" : "⚪"}</td>
                <td className="px-4 py-3 text-right">
                  <CourierDetail courier={c} rating={c.rating} />
                </td>
              </tr>
            ))}
            {couriers.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={8}>
                  No active couriers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "accent";
}) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`text-2xl font-extrabold ${
          tone === "primary"
            ? "text-primary"
            : tone === "accent"
            ? "text-accent"
            : "text-text"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
