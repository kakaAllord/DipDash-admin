import { getActiveSurge } from "@/lib/repo/surge";
import { SurgeManager } from "@/components/admin/SurgeManager";

export default async function SurgePage() {
  const surge = await getActiveSurge();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Surge pricing</h1>
        <p className="text-sm text-muted">
          Add a temporary delivery surcharge (e.g. heavy rain, late night). It
          applies on top of the base fee, per location, and updates students live.
        </p>
      </div>

      <SurgeManager
        active={
          surge
            ? {
                reason: surge.reason,
                inCampusTsh: surge.inCampusTsh,
                outCampusTsh: surge.outCampusTsh,
                startsAt: surge.startsAt,
                endsAt: surge.endsAt,
              }
            : null
        }
      />
    </div>
  );
}
