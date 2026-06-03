"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import { Property } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface Props {
  properties: Property[];
  onSelect: (p: Property) => void;
}

interface Coord { lat: number; lng: number; }

// Equity dot colours
const EQ = {
  high:   "#16a34a",
  medium: "#ca8a04",
  low:    "#dc2626",
};

function markerHtml(eq: Property["equityLevel"]) {
  return `<div style="
    width:14px;height:14px;border-radius:50%;
    background:${EQ[eq]};border:2.5px solid #fff;
    box-shadow:0 1px 5px rgba(0,0,0,.45);
    cursor:pointer;transition:transform .1s;
  " onmouseenter="this.style.transform='scale(1.4)'" onmouseleave="this.style.transform='scale(1)'"></div>`;
}

export default function MapView({ properties, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<L.Marker[]>([]);
  const [coords, setCoords]   = useState<Record<string, Coord>>({});
  const [loading, setLoading] = useState(false);
  const [mapped, setMapped]   = useState(0);

  // Init Leaflet (import dynamically to avoid SSR)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: false }).setView([40.4406, -79.9959], 12);

      // CartoDB Positron — clean light basemap
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© <a href='https://openstreetmap.org'>OSM</a> contributors © <a href='https://carto.com'>CARTO</a>",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Geocode whenever properties change
  useEffect(() => {
    if (properties.length === 0) return;
    const toGeocode = properties.filter((p) => !coords[p.id]);
    if (toGeocode.length === 0) return;

    setLoading(true);
    fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: toGeocode.map((p) => ({
          id: p.id,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
        })),
      }),
    })
      .then((r) => r.json())
      .then((results: { id: string; lat: number; lng: number }[]) => {
        const next: Record<string, Coord> = {};
        results.forEach((r) => { next[r.id] = { lat: r.lat, lng: r.lng }; });
        setCoords((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [properties]); // eslint-disable-line react-hooks/exhaustive-deps

  // Place / refresh markers whenever coords or properties change
  useEffect(() => {
    if (!mapRef.current) return;

    // Defer until Leaflet is ready (it may not be on first render)
    const tick = setTimeout(async () => {
      const L = await import("leaflet");
      if (!mapRef.current) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const placed: L.Marker[] = [];

      properties.forEach((p) => {
        const c = coords[p.id];
        if (!c) return;

        const icon = L.divIcon({
          html: markerHtml(p.equityLevel),
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([c.lat, c.lng], { icon })
          .addTo(mapRef.current!)
          .on("click", () => onSelect(p));

        // Tooltip on hover
        marker.bindTooltip(
          `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5">
            <strong>${p.address}</strong><br/>
            ${p.estimatedValue} &nbsp;·&nbsp; <span style="color:${EQ[p.equityLevel]}">${p.equity} equity</span>
          </div>`,
          { direction: "top", offset: [0, -8] }
        );

        placed.push(marker);
      });

      markersRef.current = placed;
      setMapped(placed.length);

      if (placed.length > 1) {
        const group = L.featureGroup(placed);
        mapRef.current.fitBounds(group.getBounds().pad(0.15));
      } else if (placed.length === 1) {
        const c = coords[properties.find(p => coords[p.id])!.id];
        mapRef.current.setView([c.lat, c.lng], 15);
      }
    }, 100);

    return () => clearTimeout(tick);
  }, [coords, properties, onSelect]);

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: "400px", border: "1px solid #e5e5e5" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Status badge */}
      <div
        className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs shadow-md"
        style={{ background: "#fff", border: "1px solid #e5e5e5", color: "#555555" }}
      >
        {loading ? (
          <><Loader2 size={12} className="animate-spin" /> Geocoding addresses…</>
        ) : (
          <>{mapped} / {properties.length} properties mapped</>
        )}
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-8 left-3 z-[1000] px-3 py-2 rounded-lg text-xs shadow-md space-y-1"
        style={{ background: "#fff", border: "1px solid #e5e5e5" }}
      >
        {(["high", "medium", "low"] as const).map((lvl) => (
          <div key={lvl} className="flex items-center gap-2">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: EQ[lvl], border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
            <span style={{ color: "#555555" }}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)} equity</span>
          </div>
        ))}
      </div>
    </div>
  );
}
