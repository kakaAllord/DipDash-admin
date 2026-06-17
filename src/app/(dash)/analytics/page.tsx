import { customerAnalytics } from "@/lib/repo/admin";
import { Card } from "@/components/ui/Card";
import { tsh } from "@/lib/format";

function hourRange(h: number): string {
  const f = (n: number) => `${String((n + 24) % 24).padStart(2, "0")}:00`;
  return `${f(h)}–${f(h + 1)}`;
}

export default async function AnalyticsPage() {
  const a = await customerAnalytics();
  const maxLevelOrders = Math.max(1, ...a.byLevel.map((l) => l.orders));
  const maxDemand = Math.max(1, ...a.demandByHour);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted">
          Who buys, how much, and when — across the campus.
        </p>
      </div>

      {/* Buying by level */}
      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold">Orders by level</h2>
          <p className="text-xs text-muted">
            Most active level at the top; levels with no orders never buy.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {a.byLevel.map((l) => (
            <div key={l.level} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-sm font-semibold">
                L{l.level}
              </span>
              <div className="h-6 flex-1 overflow-hidden rounded-md bg-border/40">
                <div
                  className={`h-full rounded-md ${l.orders > 0 ? "bg-primary" : ""}`}
                  style={{ width: `${(l.orders / maxLevelOrders) * 100}%` }}
                />
              </div>
              <span className="w-28 shrink-0 text-right text-xs text-muted">
                {l.orders} ord · {tsh(l.spendTsh)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Peak time */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">When people buy</h2>
          {a.peakHour != null ? (
            <span className="text-sm font-semibold text-primary">
              Peak {hourRange(a.peakHour)}
            </span>
          ) : (
            <span className="text-sm text-muted">No orders yet</span>
          )}
        </div>
        <div className="flex h-40 items-end gap-1">
          {a.demandByHour.map((count, hour) => (
            <div key={hour} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${
                  hour === a.peakHour ? "bg-accent" : "bg-primary"
                }`}
                style={{
                  height: `${(count / maxDemand) * 100}%`,
                  minHeight: count ? "4px" : "0",
                }}
                title={`${count} order(s) at ${hour}:00`}
              />
              {hour % 3 === 0 && (
                <span className="text-[9px] text-muted">{hour}</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Regular customers */}
      <Card className="flex flex-col gap-2 p-0">
        <div className="px-4 pt-4">
          <h2 className="font-bold">Regular customers</h2>
          <p className="text-xs text-muted">Ranked by number of orders.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Spend</th>
              </tr>
            </thead>
            <tbody>
              {a.topCustomers.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.level ? `L${c.level}` : "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.course ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{c.orders}</td>
                  <td className="px-4 py-3 text-right">{tsh(c.spendTsh)}</td>
                </tr>
              ))}
              {a.topCustomers.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted" colSpan={5}>
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
