import { listCouriers } from "@/lib/repo/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { tsh } from "@/lib/format";
import { orderCeiling } from "@/lib/domain/risk";
import { CourierApproval } from "@/components/admin/CourierApproval";

const STATUS_TONE = {
  pending: "accent",
  approved: "info",
  active: "primary",
  restricted: "danger",
} as const;

export default async function CouriersPage() {
  const couriers = await listCouriers();
  const pending = couriers.filter((c) => c.status === "pending");
  const rest = couriers.filter((c) => c.status !== "pending");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Couriers</h1>
        <p className="text-sm text-muted">
          Review applications and manage the courier pool.
        </p>
      </div>

      {/* Pending approvals */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Pending approval ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-muted">No applications waiting.</p>
        )}
        {pending.map((c) => (
          <Card key={c.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{c.studentName}</p>
                <p className="text-sm text-muted">
                  {c.admissionNo} · {c.phone} · {c.course}
                </p>
              </div>
              <Badge tone="accent">pending</Badge>
            </div>
            <div className="flex gap-3">
              <Figure label="Student ID" src={c.idCardImage} />
              <Figure label="Live selfie" src={c.selfieImage} />
            </div>
            <CourierApproval courierId={c.id} />
          </Card>
        ))}
      </section>

      {/* Existing couriers */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Courier pool ({rest.length})
        </h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Ceiling</th>
                <th className="px-4 py-3">Earnings</th>
                <th className="px-4 py-3">Online</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{c.studentName}</p>
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
                  <td className="px-4 py-3">{c.isOnline ? "🟢" : "⚪"}</td>
                </tr>
              ))}
              {rest.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted" colSpan={6}>
                    No active couriers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function Figure({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="flex-1">
      <p className="mb-1 text-xs text-muted">{label}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className="h-32 w-full rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
          none
        </div>
      )}
    </div>
  );
}
