import { listCouriers, courierRatingStats } from "@/lib/repo/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CourierApproval } from "@/components/admin/CourierApproval";
import { CourierDetail, type CourierLite } from "@/components/admin/CourierDetail";
import { CourierPool } from "@/components/admin/CourierPool";

export const dynamic = "force-dynamic";

/** Map a CourierRow to the lite shape the detail modal needs. */
function toLite(c: {
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
}): CourierLite {
  return {
    id: c.id,
    studentName: c.studentName,
    admissionNo: c.admissionNo,
    phone: c.phone,
    course: c.course,
    status: c.status,
    depositTsh: c.depositTsh,
    earningsTsh: c.earningsTsh,
    isOnline: c.isOnline,
    idCardImage: c.idCardImage,
    selfieImage: c.selfieImage,
  };
}

export default async function CouriersPage() {
  const [couriers, ratings] = await Promise.all([
    listCouriers(),
    courierRatingStats(),
  ]);
  const pending = couriers.filter((c) => c.status === "pending");
  const rest = couriers.filter((c) => c.status !== "pending");
  const pool = rest.map((c) => ({
    ...toLite(c),
    gender: c.gender ?? null,
    rating: ratings.get(c.id),
  }));

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
                <p className="font-bold">
                  {c.studentName}{" "}
                  {c.gender === "female" ? "♀" : c.gender === "male" ? "♂" : ""}
                </p>
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
            <div className="flex items-center gap-2">
              <CourierApproval courierId={c.id} />
              <CourierDetail courier={toLite(c)} rating={ratings.get(c.id)} />
            </div>
          </Card>
        ))}
      </section>

      {/* Courier pool — live online status + counts */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Courier pool ({rest.length})
        </h2>
        <CourierPool couriers={pool} />
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
