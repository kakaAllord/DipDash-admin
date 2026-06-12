import { analytics } from "@/lib/repo/admin";
import { Card } from "@/components/ui/Card";
import { tsh, duration } from "@/lib/format";

export default async function Overview() {
  const a = await analytics();
  const maxDemand = Math.max(1, ...a.demandByHour);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Overview</h1>
        <p className="text-sm text-muted">Live platform performance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total orders" value={String(a.totalOrders)} />
        <Stat label="Active now" value={String(a.activeOrders)} tone="accent" />
        <Stat label="Delivered" value={String(a.deliveredOrders)} tone="primary" />
        <Stat label="GMV (held+done)" value={tsh(a.gmvTsh)} />
      </div>

      <Card>
        <h2 className="mb-1 font-bold">Operational cycle (averages)</h2>
        <p className="mb-4 text-xs text-muted">
          Across delivered orders. T0 place · T1 accept · T2 pickup · T3 handoff.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Match (T1−T0)" value={duration(0, a.avgMatchMs ?? 0)} dim={a.avgMatchMs == null} />
          <Metric label="Prep (T2−T1)" value={duration(0, a.avgPrepMs ?? 0)} dim={a.avgPrepMs == null} />
          <Metric label="Transit (T3−T2)" value={duration(0, a.avgTransitMs ?? 0)} dim={a.avgTransitMs == null} />
          <Metric label="Total (T3−T0)" value={duration(0, a.avgTotalMs ?? 0)} dim={a.avgTotalMs == null} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-bold">Demand curve</h2>
        <p className="mb-4 text-xs text-muted">Orders placed by hour of day.</p>
        <div className="flex h-40 items-end gap-1">
          {a.demandByHour.map((count, hour) => (
            <div key={hour} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${
                  hour >= 19 ? "bg-accent" : "bg-primary"
                }`}
                style={{ height: `${(count / maxDemand) * 100}%`, minHeight: count ? "4px" : "0" }}
                title={`${count} order(s) at ${hour}:00`}
              />
              {hour % 3 === 0 && (
                <span className="text-[9px] text-muted">{hour}</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          <span className="inline-block h-2 w-2 rounded-sm bg-accent" /> after 19:00 (night surge window)
        </p>
      </Card>
    </div>
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

function Metric({ label, value, dim }: { label: string; value: string; dim: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-lg font-bold ${dim ? "text-muted" : "text-text"}`}>
        {dim ? "—" : value}
      </p>
    </div>
  );
}
