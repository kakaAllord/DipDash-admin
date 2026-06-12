import { listEscrow } from "@/lib/repo/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { tsh } from "@/lib/format";
import { EscrowActions } from "@/components/admin/EscrowActions";

const STATE_TONE = {
  held: "info",
  released: "primary",
  frozen: "accent",
  deducted: "danger",
  refunded: "danger",
} as const;

export default async function EscrowPage() {
  const rows = await listEscrow();
  const disputed = rows.filter((r) => r.state === "frozen");
  const held = rows.filter((r) => r.state === "held");
  const settled = rows.filter((r) => !["frozen", "held"].includes(r.state));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Escrow</h1>
        <p className="text-sm text-muted">
          Funds are held until handoff. Mediate disputes here.
        </p>
      </div>

      {/* Needs mediation */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Needs mediation ({disputed.length})
        </h2>
        {disputed.length === 0 && (
          <p className="text-sm text-muted">No frozen disputes. 🎉</p>
        )}
        {disputed.map((r) => (
          <Card key={r.txnId} className="flex flex-col gap-3 border-accent">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{r.vendorName}</p>
                <p className="text-sm text-muted">
                  {r.studentName} · courier {r.courierName ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Meal {tsh(r.itemCostTsh)} · delivery {tsh(r.deliveryFeeTsh)} ·
                  held {tsh(r.amountTsh)}
                </p>
              </div>
              <Badge tone="accent">frozen</Badge>
            </div>
            <p className="rounded-lg bg-bg px-3 py-2 text-xs text-muted">
              Approving the deduction takes the meal cost from the courier&apos;s
              deposit, refunds the student {tsh(r.itemCostTsh + r.deliveryFeeTsh)},
              and restricts the courier if their deposit falls below the minimum.
            </p>
            <EscrowActions orderId={r.orderId} />
          </Card>
        ))}
      </section>

      {/* Currently held */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Currently held ({held.length})
        </h2>
        <LedgerTable rows={held} />
      </section>

      {/* Settled */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Settled ({settled.length})
        </h2>
        <LedgerTable rows={settled} />
      </section>
    </div>
  );
}

function LedgerTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listEscrow>>;
}) {
  if (rows.length === 0)
    return <p className="text-sm text-muted">Nothing here.</p>;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted">
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Parties</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.txnId} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-semibold">{r.vendorName}</td>
              <td className="px-4 py-3 text-xs text-muted">
                {r.studentName} / {r.courierName ?? "—"}
              </td>
              <td className="px-4 py-3 font-medium">{tsh(r.amountTsh)}</td>
              <td className="px-4 py-3">
                <Badge tone={STATE_TONE[r.state as keyof typeof STATE_TONE]}>
                  {r.state}
                </Badge>
              </td>
              <td className="px-4 py-3 max-w-[16rem] text-xs text-muted">
                {r.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
