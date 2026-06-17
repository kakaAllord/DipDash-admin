import { listLiveMapData } from "@/lib/repo/admin";
import { LiveMapView } from "@/components/admin/LiveMapView";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const { couriers, orders, vendors } = await listLiveMapData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Live map</h1>
        <p className="text-sm text-muted">
          Online couriers in real time — green pulse when free, blue with a count
          when on a delivery. Tap a courier to see their order(s). Students are
          never shown.
        </p>
      </div>
      <LiveMapView couriers={couriers} orders={orders} vendors={vendors} />
    </div>
  );
}
