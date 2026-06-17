import { listAllOrders } from "@/lib/repo/orders";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { tsh, clock } from "@/lib/format";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  type OrderStatus,
} from "@/lib/domain/lifecycle";
import { DisputeButton } from "@/components/admin/DisputeButton";
import { AdminLive } from "@/components/admin/AdminLive";

export const dynamic = "force-dynamic";

const DISPUTABLE = ["scheduled", "paid", "accepted", "collected"];

export default async function OrderLedger() {
  const orders = await listAllOrders();

  return (
    <div className="flex flex-col gap-6">
      <AdminLive />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Order ledger</h1>
        <p className="text-sm text-muted">
          Every order with its four operational timestamps.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Courier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">T0</th>
              <th className="px-4 py-3">T1</th>
              <th className="px-4 py-3">T2</th>
              <th className="px-4 py-3">T3</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold">{o.vendorName}</p>
                  <p className="max-w-[14rem] truncate text-xs text-muted">
                    {o.items.map((i) => `${i.qty}×${i.nameSnapshot}`).join(", ")}
                  </p>
                </td>
                <td className="px-4 py-3">{o.studentName}</td>
                <td className="px-4 py-3">{o.courierName ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={ORDER_STATUS_TONE[o.status as OrderStatus]}>
                    {ORDER_STATUS_LABEL[o.status as OrderStatus]}
                  </Badge>
                </td>
                <Ts at={o.t0PlacedAt} />
                <Ts at={o.t1AcceptedAt} />
                <Ts at={o.t2CollectedAt} />
                <Ts at={o.t3DeliveredAt} />
                <td className="px-4 py-3 font-medium">{tsh(o.totalTsh)}</td>
                <td className="px-4 py-3">
                  {DISPUTABLE.includes(o.status) && <DisputeButton orderId={o.id} />}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={10}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Ts({ at }: { at?: number | null }) {
  return (
    <td className="px-4 py-3 font-mono text-xs">
      {at ? clock(at) : <span className="text-muted">—</span>}
    </td>
  );
}
