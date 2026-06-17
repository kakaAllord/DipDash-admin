"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MapPicker } from "@/components/maps/MapPicker";
import type { LatLng } from "@/components/maps/MapCanvas";
import { createVendor } from "@/app/(dash)/admin-actions";

export function VendorCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [location, setLocation] = useState<"in_campus" | "out_campus">("in_campus");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createVendor({
        name,
        location,
        blurb,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      setName("");
      setBlurb("");
      setCoords(null);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Add vendor</Button>;
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-bold">New vendor</h2>
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Campus Café"
      />
      <Input
        label="Blurb"
        value={blurb}
        onChange={(e) => setBlurb(e.target.value)}
        placeholder="Quick bites by the library"
      />
      <div>
        <span className="mb-1.5 block text-sm font-medium text-text">Location</span>
        <div className="grid grid-cols-2 gap-2">
          {(["in_campus", "out_campus"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                location === loc
                  ? "border-primary bg-primary-soft text-primary-dark"
                  : "border-border text-muted"
              }`}
            >
              {loc === "in_campus" ? "In campus" : "Off campus"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-text">
          Pickup location — tap the map to set coordinates
        </span>
        <MapPicker value={coords} onChange={setCoords} />
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending || !name}>
          {pending ? "Saving…" : "Save vendor"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
