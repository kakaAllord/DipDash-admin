"use client";

import { Marker } from "@vis.gl/react-google-maps";
import { MapCanvas, Polyline, type LatLng } from "./MapCanvas";

/** Read-only map: pickup (V), drop-off (D) and the live courier (C). */
export function LiveMap({
  vendor,
  deliver,
  courier,
  height = 260,
}: {
  vendor?: LatLng | null;
  deliver?: LatLng | null;
  courier?: LatLng | null;
  height?: number;
}) {
  const center = courier ?? deliver ?? vendor ?? null;
  const path: LatLng[] =
    courier && deliver
      ? [courier, deliver]
      : vendor && deliver
        ? [vendor, deliver]
        : [];

  return (
    <MapCanvas center={center} height={height} zoom={15}>
      {vendor && <Marker position={vendor} label="V" title="Pickup" />}
      {deliver && <Marker position={deliver} label="D" title="Drop-off" />}
      {courier && <Marker position={courier} label="C" title="Courier" />}
      {path.length === 2 && <Polyline path={path} />}
    </MapCanvas>
  );
}
