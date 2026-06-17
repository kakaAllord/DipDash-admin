"use client";

import { Marker } from "@vis.gl/react-google-maps";
import { MapCanvas, CAMPUS, type LatLng } from "./MapCanvas";
import { Button } from "@/components/ui/Button";

/** Tap-to-pin location picker with a "use my location" shortcut. */
export function MapPicker({
  value,
  onChange,
  height = 240,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height?: number;
}) {
  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <MapCanvas center={value ?? CAMPUS} height={height} zoom={16} onPick={onChange}>
        {value && <Marker position={value} />}
      </MapCanvas>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {value
            ? `Pinned: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Tap the map to drop a pin"}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={useMyLocation}>
          Use my location
        </Button>
      </div>
    </div>
  );
}
