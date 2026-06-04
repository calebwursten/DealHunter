"use client";

import { MapPin, Phone } from "lucide-react";
import { Property } from "@/lib/types";

const equityStyle: Record<string, { bg: string; color: string }> = {
  high:   { bg: "#dcfce7", color: "#15803d" },
  medium: { bg: "#fef9c3", color: "#a16207" },
  low:    { bg: "#fee2e2", color: "#b91c1c" },
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
  const eq     = equityStyle[property.equityLevel];
  const tpsUrl = buildTpsUrl(property);

  return (
    <div
      className="rounded-xl p-5 cursor-pointer transition-all hover:shadow-md"
      style={{ background: "#fff", border: "1px solid #e5e5e5" }}
      onClick={onClick}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#000000"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e5e5"; }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-semibold truncate" style={{ color: "#111111" }}>
            <MapPin size={14} className="flex-shrink-0" style={{ color: "#000000" }} />
            {property.address}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "#888888" }}>
            {property.city}, {property.state} {property.zip}
          </p>
        </div>
        <span className="ml-2 flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: eq.bg, color: eq.color }}>
          {property.equityLevel} equity
        </span>
      </div>

      {/* ── Neighborhood badge ── */}
      {property.neighborhood && (
        <div className="mb-3 mt-1.5">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium"
            style={{ background: "#f0f0f0", color: "#444444" }}>
            <MapPin size={10} style={{ color: "#888888" }} />
            {property.neighborhood}
          </span>
        </div>
      )}

      {/* ── Key stats ── */}
      <div className={`grid grid-cols-3 gap-3 ${property.neighborhood ? "" : "mt-4"}`}>
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

      {/* ── Footer: stats + skip-trace link ── */}
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #f0f0f0" }}>
        <span className="text-xs" style={{ color: "#888888" }}>
          {property.beds > 0 ? `${property.beds}bd/${property.baths}ba` : "—"}{" "}
          {property.sqft > 0 ? `· ${property.sqft.toLocaleString()} sqft` : ""}
        </span>
        <div className="flex items-center gap-2.5">
          {property.yearBuilt > 0 && (
            <span className="text-xs" style={{ color: "#888888" }}>Built {property.yearBuilt}</span>
          )}
          {/* Skip-trace link — stopPropagation prevents opening the detail modal */}
          <a
            href={tpsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Look up owner contact info on TruePeopleSearch"
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
  );
}
