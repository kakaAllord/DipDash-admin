/*
  Geo helpers. Coordinates are { lat, lng } in decimal degrees.
  NOTE: duplicated across the three Dipdash repos — keep them identical.
*/

export interface LatLng {
  lat: number;
  lng: number;
}

/** Arusha Technical College — the campus center (map default + distance ref). */
export const CAMPUS_CENTER: LatLng = { lat: -3.364487, lng: 36.677815 };

/** Great-circle distance in metres between two points (Haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000; // Earth radius, metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Human-friendly distance, e.g. "320 m" or "1.4 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Distance between two optionally-missing points; null if either is unknown. */
export function distanceBetween(
  a: { lat?: number | null; lng?: number | null } | null | undefined,
  b: { lat?: number | null; lng?: number | null } | null | undefined
): number | null {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) {
    return null;
  }
  return haversineMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
}
