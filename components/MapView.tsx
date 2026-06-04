"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Property } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface Props {
  properties: Property[];
  searchKey: number;   // increments on every new search → tells MapView to wipe state
  totalCount: number;  // total results from CKAN (may exceed properties.length while paginating)
  onSelect: (p: Property) => void;
}
interface Coord { lat: number; lng: number; }

const EQ = { high: "#16a34a", medium: "#ca8a04", low: "#dc2626" } as const;

function dot(eq: Property["equityLevel"]) {
  return `<div style="width:13px;height:13px;border-radius:50%;background:${EQ[eq]};border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);cursor:pointer;transition:transform .1s" onmouseenter="this.style.transform='scale(1.5)'" onmouseleave="this.style.transform='scale(1)'"></div>`;
}

export default function MapView({ properties, searchKey, totalCount, onSelect }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<unknown>(null);
  const markersRef    = useRef<Map<string, unknown>>(new Map());
  // IDs already sent to the geocode API — so we only geocode NEW pages, not the whole set
  const processedRef  = useRef<Set<string>>(new Set());
  // All active AbortControllers — aborted together when searchKey changes
  const abortSetRef   = useRef<Set<AbortController>>(new Set());
  // Whether to auto-fit the map to the first cluster of markers
  const hasFitRef     = useRef(false);

  const [coords, setCoords]       = useState<Record<string, Coord>>({});
  const [geocoding, setGeocoding] = useState(false);
  const [mapped, setMapped]       = useState(0);

  // ── Init Leaflet (once) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: false }).setView([40.4406, -79.9959], 12);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© <a href='https://openstreetmap.org'>OSM</a> © <a href='https://carto.com'>CARTO</a>",
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      (mapRef.current as { remove?: () => void })?.remove?.();
      mapRef.current = null;
    };
  }, []);

  // ── Reset everything when a new search starts ─────────────────────────────
  // Triggered only by searchKey, not by new pages arriving
  useEffect(() => {
    // Abort every in-progress geocode stream
    abortSetRef.current.forEach((ac) => ac.abort());
    abortSetRef.current.clear();
    // Remove all markers from the map
    markersRef.current.forEach((m) => (m as { remove: () => void }).remove());
    markersRef.current.clear();
    // Reset tracking refs & state
    processedRef.current.clear();
    hasFitRef.current = false;
    setCoords({});
    setMapped(0);
    setGeocoding(false);
  }, [searchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Geocode only the NEW properties in each arriving page ─────────────────
  useEffect(() => {
    const newProps = properties.filter((p) => !processedRef.current.has(p.id));
    if (newProps.length === 0) return;

    // Mark immediately so if this effect fires again before the fetch finishes,
    // we don't double-send the same IDs.
    newProps.forEach((p) => processedRef.current.add(p.id));

    const ac = new AbortController();
    abortSetRef.current.add(ac);
    setGeocoding(true);

    (async () => {
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            properties: newProps.map((p) => ({
              id: p.id, address: p.address, city: p.city,
              state: p.state, zip: p.zip,
            })),
          }),
          signal: ac.signal,
        });
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop()!;
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const r = JSON.parse(line) as { id: string; lat: number; lng: number };
              setCoords((prev) => ({ ...prev, [r.id]: { lat: r.lat, lng: r.lng } }));
            } catch { /* malformed line */ }
          }
        }
      } catch (e: unknown) {
        if ((e as { name?: string }).name !== "AbortError") console.error(e);
      } finally {
        abortSetRef.current.delete(ac);
        // Only flip the spinner off when all concurrent geocodes have finished
        if (abortSetRef.current.size === 0) setGeocoding(false);
      }
    })();

    // No cleanup abort here — let in-flight streams finish for their page.
    // The searchKey reset effect is responsible for aborting when a new search starts.
  }, [properties]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Place / refresh markers whenever coords or properties update ──────────
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!mapRef.current) return;
    const tick = setTimeout(async () => {
      const L = await import("leaflet");
      if (!mapRef.current) return;
      const map = mapRef.current as {
        fitBounds: (b: unknown, o: unknown) => void;
        setView: (c: [number, number], z: number) => void;
      };

      // Add only NEW markers — existing ones stay put so the map doesn't flicker
      let placed = 0;
      properties.forEach((p) => {
        if (markersRef.current.has(p.id)) return;
        const c = coords[p.id];
        if (!c) return;

        const icon = L.divIcon({
          html: dot(p.equityLevel),
          className: "",
          iconSize: [13, 13],
          iconAnchor: [6.5, 6.5],
        });
        const marker = L.marker([c.lat, c.lng], { icon })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .addTo(mapRef.current as any)
          .on("click", () => onSelectRef.current(p));
        marker.bindTooltip(
          `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5">` +
          `<strong>${p.address}</strong><br/>` +
          `${p.estimatedValue} &nbsp;·&nbsp; ` +
          `<span style="color:${EQ[p.equityLevel]}">${p.equity} equity</span></div>`,
          { direction: "top", offset: [0, -8] }
        );
        markersRef.current.set(p.id, marker);
        placed++;
      });

      if (placed > 0) setMapped(markersRef.current.size);

      // Auto-fit to the first meaningful cluster, then leave the user alone
      if (!hasFitRef.current && markersRef.current.size >= 3) {
        const group = L.featureGroup(
          [...markersRef.current.values()] as Parameters<typeof L.featureGroup>[0]
        );
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
        hasFitRef.current = true;
      }
    }, 50);
    return () => clearTimeout(tick);
  }, [coords, properties]);

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ height: "calc(100vh - 220px)", minHeight: "460px", border: "1px solid #e5e5e5" }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Status badge */}
      <div
        className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs shadow-md"
        style={{ background: "#fff", border: "1px solid #e5e5e5", color: "#555555" }}
      >
        {geocoding ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            Geocoding… {mapped.toLocaleString()} / {totalCount.toLocaleString()} mapped
          </>
        ) : (
          <>{mapped.toLocaleString()} / {totalCount.toLocaleString()} properties mapped</>
        )}
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-8 left-3 z-[1000] px-3 py-2 rounded-lg text-xs shadow-md space-y-1"
        style={{ background: "#fff", border: "1px solid #e5e5e5" }}
      >
        {(["high", "medium", "low"] as const).map((lvl) => (
          <div key={lvl} className="flex items-center gap-2">
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: EQ[lvl], border: "2px solid #fff",
              boxShadow: "0 1px 3px rgba(0,0,0,.3)",
            }} />
            <span style={{ color: "#555555" }}>
              {lvl.charAt(0).toUpperCase() + lvl.slice(1)} equity
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
