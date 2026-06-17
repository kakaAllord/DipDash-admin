"use client";

import { useEffect, useState } from "react";
import { getSocket, joinRoom } from "@/lib/realtime";
import { Card } from "@/components/ui/Card";

/**
 * Live courier presence board. Subscribes to the realtime relay and reflects
 * online/offline the instant a courier toggles it — no page refresh / polling.
 */
export function CourierPresenceLive({
  couriers,
}: {
  couriers: { id: string; name: string }[];
}) {
  const [online, setOnline] = useState<Set<string>>(new Set());

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

  const onlineCount = couriers.filter((c) => online.has(c.id)).length;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Live presence
        </h2>
        <span className="text-sm font-semibold text-primary">
          {onlineCount} online now
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {couriers.length === 0 && (
          <p className="text-sm text-muted">No couriers in the pool yet.</p>
        )}
        {couriers.map((c) => {
          const isOn = online.has(c.id);
          return (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                isOn
                  ? "border-primary/40 bg-primary-soft text-primary-dark"
                  : "border-border text-muted"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isOn ? "bg-primary" : "bg-muted/40"}`}
              />
              {c.name}
            </span>
          );
        })}
      </div>
    </Card>
  );
}
