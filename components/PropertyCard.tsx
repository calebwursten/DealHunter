"use client";

import { useState } from "react";
import { MapPin, Phone, Home, Building2, Trees } from "lucide-react";
import { Property } from "@/lib/types";

const equityStyle: Record<string, { bg: string; color: string }> = {
  high:   { bg: "#dcfce7", color: "#15803d" },
  medium: { bg: "#fef9c3", color: "#a16207" },
  low:    { bg: "#fee2e2", color: "#b91c1c" },
};

// Gradient + icon per property type for the placeholder
const TYPE_STYLE: Record<string, { gradient: string; Icon: React.ElementType }> = {
  "Single Family": { gradient: "linear-gradient(135deg,#1e3a5f 0%,#2d6a9f 100%)", Icon: Home },
  "Multi-Family":  { gradient: "linear-gradient(135deg,#3d2b6b 0%,#6d4caf 100%)", Icon: Building2 },
  "Lot":           { gradient: "linear-gradient(135deg,#1a3d2b 0%,#2e7d52 100%)", Icon: Trees },
  "Commercial":    { gradient: "linear-gradient(135deg,#3b2a1a 0%,#8b5e3c 100%)", Icon: Building2 },
  "Condo":         { gradient: "linear-gradient(135deg,#1a2e4a 0%,#2b5080 100%)", Icon: Home },
};

interface Props {
  property: Property;
  onClick?: () => void;
}

function buildTpsUrl(p: Property): string {
  const addr  = p.ownerMailingLine1 ?? p.address;
  const city  = p.ownerMailingCity  ?? p.city;
  const state = p.ownerMailingState ?? p.state;
  const zip   = p.ownerMailingZip   ?? p.zip;
  const cs    = [city, state, zip].filter(Boolean).join(" ");
  if (p.ownerType === "Individual" && p.ownerName) {
    return (
      "https://www.truepeoplesearch.com/results" +
      `?name=${encodeURIComponent(p.ownerName)}` +
      `&citystatezip=${encodeURIComponent(cs)}`
    );
  }
  return (
    "https://www.truepeoplesearch.com/resultaddress" +
    `?streetaddress=${encodeURIComponent(addr)}` +
    `&citystatezip=${encodeURIComponent(cs)}`
  );
}

export default function PropertyCard({ property, onClick }: Props) {
  const [imgError, setImgError] = useState(false);

  const eq     = equityStyle[property.equityLevel];
  const tpsUrl = buildTpsUrl(property);

  const apiKey    = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const location  = encodeURIComponent(`${property.address}, ${property.city}, ${property.state}`);
  const svUrl     = apiKey
    ? `https://maps.googleapis.com/maps/api/streetview?size=600x280&location=${location}&key=${apiKey}&fov=80&pitch=5&return_error_codes=true`
    : null;
  const showPhoto = !!svUrl && !imgError;

  const typeStyle = TYPE_STYLE[property.propertyType] ?? TYPE_STYLE["Single Family"];
  const TypeIcon  = typeStyle.Icon;

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
      style={{ background: "#fff", border: "1px solid #e5e5e5" }}
      onClick={onClick}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#000000"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e5e5"; }}
    >
      {/* ── Building image / placeholder ── */}
      <div className="relative w-full" style={{ height: "148px" }}>
        {showPhoto ? (
          <img
            src={svUrl!}
            alt={property.address}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: typeStyle.gradient }}
          >
            <TypeIcon size={28} style={{ color: "rgba(255,255,255,0.55)" }} />
            <span className="text-xs font-medium tracking-wide uppercase"
              style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
              {property.propertyType}
            </span>
          </div>
        )}

        {/* Equity badge — overlaid bottom-left */}
        <span
          className="absolute bottom-2 left-2 text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ background: eq.bg, color: eq.color, backdropFilter: "blur(4px)" }}
        >
          {property.equityLevel === "high" ? "High" : property.equityLevel === "medium" ? "Med" : "Low"} Equity
        </span>
      </div>

      {/* ── Content ── */}
      <div className="p-4">
        {/* Address */}
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-semibold truncate" style={{ color: "#111111" }}>
              <MapPin size={13} className="flex-shrink-0" style={{ color: "#000000" }} />
              {property.address}
            </div>
            <p className="text-sm mt-0.5" style={{ color: "#888888" }}>
              {property.city}, {property.state} {property.zip}
              {property.neighborhood && (
                <span className="ml-1.5 text-xs" style={{ color: "#aaaaaa" }}>· {property.neighborhood}</span>
              )}
            </p>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <p className="text-xs" style={{ color: "#888888" }}>Est. Value</p>
            <p className="text-sm font-semibold" style={{ color: "#111111" }}>{property.estimatedValue}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#888888" }}>Equity</p>
            <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>{property.equity}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#888888" }}>Type</p>
            <p className="text-sm font-semibold" style={{ color: "#111111" }}>{property.propertyType}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #f0f0f0" }}>
          <span className="text-xs" style={{ color: "#888888" }}>
            {property.beds > 0 ? `${property.beds}bd / ${property.baths}ba` : "—"}
            {property.sqft > 0 ? ` · ${property.sqft.toLocaleString()} sqft` : ""}
            {property.yearBuilt > 0 ? ` · ${property.yearBuilt}` : ""}
          </span>
          <a
            href={tpsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Look up owner contact info"
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ color: "#555555", border: "1px solid #e5e5e5" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#000000";
              (e.currentTarget as HTMLElement).style.color       = "#000000";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#e5e5e5";
              (e.currentTarget as HTMLElement).style.color       = "#555555";
            }}
          >
            <Phone size={10} />
            Skip trace
          </a>
        </div>

        {property.tags.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {property.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#f0f0f0", color: "#000000" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
