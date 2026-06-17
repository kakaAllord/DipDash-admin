"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { tsh, clock } from "@/lib/format";
import { orderCeiling } from "@/lib/domain/risk";
import {
  loadCourierDetail,
} from "@/app/(dash)/admin-actions";
import type { CourierDetail as Detail } from "@/lib/repo/admin";

export interface CourierLite {
  id: string;
  studentName: string;
  admissionNo: string;
  phone: string;
  course: string | null;
  status: string;
  depositTsh: number;
  earningsTsh: number;
  isOnline: boolean;
  idCardImage: string | null;
  selfieImage: string | null;
}

const STATUS_TONE = {
  pending: "accent",
  approved: "info",
  active: "primary",
  restricted: "danger",
} as const;

export function CourierDetail({
  courier,
  rating,
}: {
  courier: CourierLite;
  rating?: { avg: number; count: number };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Details
      </Button>
      {open && <DetailModal courier={courier} rating={rating} onClose={() => setOpen(false)} />}
    </>
  );
}

function DetailModal({
  courier,
  rating,
  onClose,
}: {
  courier: CourierLite;
  rating?: { avg: number; count: number };
  onClose: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourierDetail(courier.id)
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [courier.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-2xl bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">{courier.studentName}</h2>
            <p className="text-sm text-muted">
              {courier.admissionNo} · {courier.phone}
            </p>
            <p className="text-sm text-muted">{courier.course ?? "—"}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge tone={STATUS_TONE[courier.status as keyof typeof STATUS_TONE]}>
              {courier.status}
            </Badge>
            <span className="text-xs text-muted">
              {courier.isOnline ? "🟢 online" : "⚪ offline"}
            </span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Deposit" value={tsh(courier.depositTsh)} />
          <Stat label="Ceiling" value={tsh(orderCeiling(courier.depositTsh))} />
          <Stat label="Earnings" value={tsh(courier.earningsTsh)} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Figure label="Student ID" src={courier.idCardImage} />
          <Figure label="Live selfie" src={courier.selfieImage} />
        </div>

        <Section title="Working on now">
          {loading ? (
            <Muted>Loading…</Muted>
          ) : data && data.active.length > 0 ? (
            data.active.map((o) => (
              <OrderRow key={o.id} vendor={o.vendorName} note={o.deliverTo} right={tsh(o.totalTsh)} tone="accent" status={o.status} />
            ))
          ) : (
            <Muted>No active deliveries.</Muted>
          )}
        </Section>

        <Section title="Reviews & rating">
          {rating ? (
            <p className="mb-2 text-sm font-semibold">
              ★ {rating.avg.toFixed(1)}{" "}
              <span className="font-normal text-muted">({rating.count})</span>
            </p>
          ) : (
            <Muted>No ratings yet.</Muted>
          )}
          {data?.reviews.map((r, i) => (
            <div key={i} className="border-t border-border py-2 text-sm first:border-0">
              <p className="font-medium">
                {"★".repeat(r.stars)}
                <span className="text-border">{"★".repeat(5 - r.stars)}</span>{" "}
                <span className="text-xs text-muted">· {r.studentName}</span>
              </p>
              {r.comment && <p className="text-muted">{r.comment}</p>}
            </div>
          ))}
        </Section>

        <Section title="Past deliveries">
          {loading ? (
            <Muted>Loading…</Muted>
          ) : data && data.past.length > 0 ? (
            data.past.map((o) => (
              <OrderRow
                key={o.id}
                vendor={o.vendorName}
                note={o.t3DeliveredAt ? `delivered ${clock(o.t3DeliveredAt)}` : o.deliverTo}
                right={tsh(o.totalTsh)}
                tone={o.status === "delivered" ? "primary" : "danger"}
                status={o.status}
              />
            ))
          ) : (
            <Muted>No completed deliveries yet.</Muted>
          )}
        </Section>

        <Button variant="ghost" block onClick={onClose} className="mt-2">
          Close
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function Figure({ label, src }: { label: string; src: string | null }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-32 w-full rounded-lg border border-border object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
          none
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function OrderRow({
  vendor,
  note,
  right,
  tone,
  status,
}: {
  vendor: string;
  note: string | null;
  right: string;
  tone: "primary" | "accent" | "danger";
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{vendor}</p>
        <p className="truncate text-xs text-muted">{note ?? "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={tone}>{status}</Badge>
        <span className="font-medium">{right}</span>
      </div>
    </div>
  );
}
