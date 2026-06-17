"use client";

import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
/** Fallback centre: Arusha Technical College. */
export const CAMPUS = { lat: -3.364487, lng: 36.677815 };

export interface LatLng {
  lat: number;
  lng: number;
}

/** Strip Google's own POI/business/transit clutter — only Dipdash pins remain. */
const QUIET_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

function Placeholder({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface px-4 text-center text-xs text-muted"
      style={{ height }}
    >
      Map unavailable — set <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable live maps.
    </div>
  );
}

export function MapCanvas({
  center,
  zoom = 15,
  height = 240,
  onPick,
  children,
}: {
  center?: LatLng | null;
  zoom?: number;
  height?: number;
  /** If provided, clicking the map reports the chosen coordinates. */
  onPick?: (p: LatLng) => void;
  children?: ReactNode;
}) {
  if (!KEY) return <Placeholder height={height} />;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <APIProvider apiKey={KEY}>
        <Map
          defaultCenter={center ?? CAMPUS}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          styles={QUIET_STYLES}
          style={{ width: "100%", height }}
          onClick={(e) => {
            if (onPick && e.detail.latLng) onPick(e.detail.latLng);
          }}
        >
          {children}
        </Map>
      </APIProvider>
    </div>
  );
}

/**
 * Anchors arbitrary React content (a styled, animatable DOM node) at a lat/lng
 * via a google.maps.OverlayView — so we can render pulsing CSS markers without
 * the deprecated google.maps.Marker and without needing a cloud mapId.
 */
export function MapOverlay({
  position,
  children,
  onClick,
}: {
  position: LatLng;
  children: ReactNode;
  onClick?: () => void;
}) {
  const map = useMap();
  const [container] = useState(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.transform = "translate(-50%, -50%)";
    el.style.cursor = onClick ? "pointer" : "default";
    return el;
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    if (!map || !container || !g?.maps) return;

    const overlay = new g.maps.OverlayView();
    overlay.onAdd = () => {
      overlay.getPanes().overlayMouseTarget.appendChild(container);
    };
    overlay.draw = () => {
      const p = overlay
        .getProjection()
        ?.fromLatLngToDivPixel(new g.maps.LatLng(position.lat, position.lng));
      if (p) {
        container.style.left = `${p.x}px`;
        container.style.top = `${p.y}px`;
      }
    };
    overlay.onRemove = () => container.remove();
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, container, position.lat, position.lng]);

  if (!container) return null;
  return createPortal(
    <div onClick={onClick}>{children}</div>,
    container
  );
}

/** Draws a polyline between points using the raw Maps API (no extra deps). */
export function Polyline({ path, color = "#16a34a" }: { path: LatLng[]; color?: string }) {
  const map = useMap();
  useEffect(() => {
    if (!map || path.length < 2) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    if (!g?.maps) return;
    const line = new g.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 4,
    });
    line.setMap(map);
    return () => line.setMap(null);
  }, [map, color, path]);
  return null;
}
