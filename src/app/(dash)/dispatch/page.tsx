import { listScheduledOrders, listAssignableCouriers } from "@/lib/repo/admin";
import { DispatchList } from "@/components/admin/DispatchList";
import { AdminLive } from "@/components/admin/AdminLive";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const [orders, couriers] = await Promise.all([
    listScheduledOrders(),
    listAssignableCouriers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminLive />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Dispatch</h1>
        <p className="text-sm text-muted">
          Scheduled (Later) orders awaiting a courier. Assign one manually — any
          still unassigned 40 minutes before delivery auto-opens to the courier
          pool.
        </p>
      </div>
      <DispatchList orders={orders} couriers={couriers} />
    </div>
  );
}
