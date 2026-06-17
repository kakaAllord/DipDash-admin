"use client";

import { useEffect, useMemo, useState } from "react";
import { MapCanvas, MapOverlay, type LatLng } from "@/components/maps/MapCanvas";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getSocket, joinRoom } from "@/lib/realtime";
import { CAMPUS_CENTER } from "@/lib/domain/geo";
import type { LiveCourier, LiveOrder, LiveVendor } from "@/lib/repo/admin";

interface Pos {
  lat: number;
  lng: number;
  at: number;
}

const COLORS = {
  vendor: "#f97316", // orange — pickup points
  busy: "#2563eb", // blue — courier on a delivery
  idle: "#16a34a", // green — courier free
};

/** Pulsing "wave" dot for a courier; blue + count when on a delivery. */
function CourierPin({ busy, count }: { busy: boolean; count: number }) {
  const color = busy ? COLORS.busy : COLORS.idle;
  return (
    <div className="relative flex h-5 w-5 items-center justify-center">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow"
        style={{ backgroundColor: color }}
      >
        {busy ? count : ""}
      </span>
    </div>
  );
}

function VendorPin() {
  return (
    <div
      className="h-3.5 w-3.5 rounded-full border-2 border-white shadow"
      style={{ backgroundColor: COLORS.vendor }}
    />
  );
}

function LegendDot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

/**
 * Admin-only dispatch map. For privacy it shows ONLY courier locations (never
 * the students who ordered): free couriers are green, couriers on a delivery are
 * blue with their order count. Click a courier to see who they are and which
 * order(s) they're carrying. Vendor pickup points are shown for context.
 */
export function LiveMapView({
  couriers,
  orders,
  vendors,
}: {
  couriers: LiveCourier[];
  orders: LiveOrder[];
  vendors: LiveVendor[];
}) {
  const [positions, setPositions] = useState<Record<string, Pos>>(() => {
    const init: Record<string, Pos> = {};
    for (const c of couriers) {
      if (c.lat != null && c.lng != null) {
        init[c.id] = { lat: c.lat, lng: c.lng, at: c.lastLocationAt ?? 0 };
      }
    }
    return init;
  });
  const [onlineIds, setOnlineIds] = useState<Set<string>>(
    () => new Set(couriers.map((c) => c.id))
  );
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket({ role: "admin", id: "admin" });
    joinRoom(s, "couriers");

    function onLoc(p: { courierId: string; lat: number; lng: number; at: number }) {
      if (!p.courierId) return;
      setPositions((prev) => ({ ...prev, [p.courierId]: { lat: p.lat, lng: p.lng, at: p.at } }));
      setOnlineIds((prev) => new Set(prev).add(p.courierId));
    }
    function onPres(p: { courierId: string; online: boolean }) {
      setOnlineIds((prev) => {
        const n = new Set(prev);
        if (p.online) n.add(p.courierId);
        else n.delete(p.courierId);
        return n;
      });
    }
    function onSnap(list: { courierId: string; lat?: number; lng?: number }[]) {
      setOnlineIds(new Set(list.map((x) => x.courierId)));
      setPositions((prev) => {
        const n = { ...prev };
        for (const x of list) {
          if (x.lat != null && x.lng != null) n[x.courierId] = { lat: x.lat, lng: x.lng, at: Date.now() };
        }
        return n;
      });
    }

    s.on("location", onLoc);
    s.on("presence", onPres);
    s.on("presence:snapshot", onSnap);
    return () => {
      s.off("location", onLoc);
      s.off("presence", onPres);
      s.off("presence:snapshot", onSnap);
    };
  }, []);

  const nameById = useMemo(
    () => new Map(couriers.map((c) => [c.id, c.name])),
    [couriers]
  );

  // Active orders grouped by the courier carrying them.
  const ordersByCourier = useMemo(() => {
    const m = new Map<string, LiveOrder[]>();
    for (const o of orders) {
      if (!o.courierId) continue;
      const arr = m.get(o.courierId) ?? [];
      arr.push(o);
      m.set(o.courierId, arr);
    }
    return m;
  }, [orders]);

  const center: LatLng = useMemo(() => {
    const first = Object.values(positions)[0];
    if (first) return { lat: first.lat, lng: first.lng };
    return CAMPUS_CENTER;
  }, [positions]);

  const liveCourierIds = Object.keys(positions).filter((id) => onlineIds.has(id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <LegendDot color={COLORS.vendor}>Vendor (pickup)</LegendDot>
        <LegendDot color={COLORS.idle}>Courier — free</LegendDot>
        <LegendDot color={COLORS.busy}>Courier — on delivery</LegendDot>
      </div>
      <MapCanvas center={center} height={460} zoom={15}>
        {vendors.map((v) => (
          <MapOverlay key={`ven-${v.id}`} position={{ lat: v.lat, lng: v.lng }}>
            <VendorPin />
          </MapOverlay>
        ))}
        {liveCourierIds.map((id) => {
          const mine = ordersByCourier.get(id) ?? [];
          return (
            <MapOverlay
              key={`cou-${id}`}
              position={{ lat: positions[id].lat, lng: positions[id].lng }}
              onClick={() => setSelected(id)}
            >
              <CourierPin busy={mine.length > 0} count={mine.length} />
            </MapOverlay>
          );
        })}
      </MapCanvas>

      {selected && (
        <Card className="flex flex-col gap-2 border-primary/40">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{nameById.get(selected) ?? "Courier"}</h2>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-muted hover:text-text"
            >
              ✕
            </button>
          </div>
          {(ordersByCourier.get(selected) ?? []).length === 0 ? (
            <p className="text-sm text-muted">Free — no active orders.</p>
          ) : (
            (ordersByCourier.get(selected) ?? []).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate font-medium">
                  {o.vendorName} → {o.studentName}
                </span>
                <Badge tone={o.status === "collected" ? "primary" : "accent"}>
                  {o.status}
                </Badge>
              </div>
            ))
          )}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Online couriers ({liveCourierIds.length})
          </h2>
          {liveCourierIds.length === 0 && (
            <p className="text-sm text-muted">No couriers online right now.</p>
          )}
          {liveCourierIds.map((id) => {
            const count = (ordersByCourier.get(id) ?? []).length;
            return (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className="flex items-center justify-between text-left text-sm hover:text-primary"
              >
                <span className="font-medium">{nameById.get(id) ?? "Courier"}</span>
                <Badge tone={count > 0 ? "primary" : "neutral"}>
                  {count > 0 ? `${count} order${count > 1 ? "s" : ""}` : "free"}
                </Badge>
              </button>
            );
          })}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            In-flight orders ({orders.length})
          </h2>
          {orders.length === 0 && (
            <p className="text-sm text-muted">No active orders.</p>
          )}
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{o.vendorName}</p>
                <p className="truncate text-xs text-muted">
                  {o.courierName ? o.courierName : "unassigned"}
                </p>
              </div>
              <Badge tone={o.status === "collected" ? "primary" : "accent"}>{o.status}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
