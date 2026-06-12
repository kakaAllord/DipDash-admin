import { clock } from "@/lib/format";

interface Step {
  label: string;
  at?: number | null;
}

/** Vertical 4-step lifecycle tracker (T0–T3). */
export function OrderTimeline({
  t0PlacedAt,
  t1AcceptedAt,
  t2CollectedAt,
  t3DeliveredAt,
}: {
  t0PlacedAt?: number | null;
  t1AcceptedAt?: number | null;
  t2CollectedAt?: number | null;
  t3DeliveredAt?: number | null;
}) {
  const steps: Step[] = [
    { label: "Order placed", at: t0PlacedAt },
    { label: "Courier accepted", at: t1AcceptedAt },
    { label: "Picked up from vendor", at: t2CollectedAt },
    { label: "Delivered", at: t3DeliveredAt },
  ];

  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const done = s.at != null;
        const isLast = i === steps.length - 1;
        return (
          <li key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-primary text-white"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {!isLast && (
                <span
                  className={`my-1 w-0.5 flex-1 ${
                    done ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
            <div className={`pb-5 ${done ? "" : "opacity-60"}`}>
              <p className="font-semibold leading-6">{s.label}</p>
              <p className="text-xs text-muted">{s.at ? clock(s.at) : "Pending"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
