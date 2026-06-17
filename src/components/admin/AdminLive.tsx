"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket, joinRoom } from "@/lib/realtime";
import { playForEvent } from "@/lib/sound";

/**
 * Live refresher for admin order surfaces (dispatch, ledger): refreshes whenever
 * an order is created or changes state — no manual reload.
 */
export function AdminLive() {
  const router = useRouter();
  useEffect(() => {
    const s = getSocket({ role: "admin", id: "admin" });
    joinRoom(s, "couriers");
    const refresh = () => router.refresh();
    const onNew = () => {
      playForEvent("new_order");
      router.refresh();
    };
    s.on("new_order", onNew);
    s.on("order_status", refresh);
    return () => {
      s.off("new_order", onNew);
      s.off("order_status", refresh);
    };
  }, [router]);
  return null;
}
