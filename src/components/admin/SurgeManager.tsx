"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { tsh } from "@/lib/format";
import { getSocket, emitSurge } from "@/lib/realtime";
import { setSurge, terminateSurge } from "@/app/(dash)/admin-actions";

interface ActiveSurge {
  reason: string;
  inCampusTsh: number;
  outCampusTsh: number;
  startsAt: number;
  endsAt: number | null;
}

/** Live "ends in 4m 12s" countdown, or null once lapsed / open-ended. */
function useCountdown(endsAt: number | null): string | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (endsAt == null) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (endsAt == null) return null;
  const ms = endsAt - Date.now();
  if (ms <= 0) return "ending…";
  const secs = Math.round(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function SurgeManager({ active }: { active: ActiveSurge | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [inCampus, setInCampus] = useState("");
  const [outCampus, setOutCampus] = useState("");
  const [durationMin, setDurationMin] = useState("");

  const countdown = useCountdown(active?.endsAt ?? null);

  function broadcast() {
    try {
      emitSurge(getSocket({ role: "admin", id: "admin" }));
    } catch {
      /* relay offline — students still get it on next quote */
    }
  }

  function apply() {
    setError(null);
    const mins = durationMin ? Number(durationMin) : 0;
    const endsAt = mins > 0 ? Date.now() + mins * 60_000 : null;
    start(async () => {
      const res = await setSurge({
        reason,
        inCampusTsh: Number(inCampus) || 0,
        outCampusTsh: Number(outCampus) || 0,
        endsAt,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed to set surge");
        return;
      }
      broadcast();
      setReason("");
      setInCampus("");
      setOutCampus("");
      setDurationMin("");
      router.refresh();
    });
  }

  function stop() {
    start(async () => {
      await terminateSurge();
      broadcast();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {active ? (
        <Card className="flex flex-col gap-3 border-accent/40 bg-accent-soft/30">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Surge active</h2>
            <Badge tone="accent">
              {countdown ? `ends in ${countdown}` : "until terminated"}
            </Badge>
          </div>
          <p className="text-sm text-muted">{active.reason}</p>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="In-campus" value={tsh(active.inCampusTsh)} />
            <Stat label="Out-of-campus" value={tsh(active.outCampusTsh)} />
          </div>
          <Button variant="ghost" onClick={stop} disabled={pending}>
            {pending ? "…" : "Terminate surge now"}
          </Button>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            No surge active — students pay the standard delivery fee.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="font-bold">{active ? "Replace surge" : "Start a surge"}</h2>
        <Input
          label="Reason"
          name="reason"
          placeholder="e.g. Heavy rain, Late night"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="In-campus add-on (TSh)"
            name="inCampus"
            type="number"
            min={0}
            step={50}
            placeholder="0"
            value={inCampus}
            onChange={(e) => setInCampus(e.target.value)}
          />
          <Input
            label="Out-of-campus add-on (TSh)"
            name="outCampus"
            type="number"
            min={0}
            step={50}
            placeholder="0"
            value={outCampus}
            onChange={(e) => setOutCampus(e.target.value)}
          />
        </div>
        <Input
          label="Auto-end after (minutes, optional)"
          name="durationMin"
          type="number"
          min={1}
          placeholder="Leave blank to run until terminated"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
        />
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <Button size="lg" onClick={apply} disabled={pending}>
          {pending ? "Applying…" : active ? "Replace surge" : "Start surge"}
        </Button>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
    </div>
  );
}
