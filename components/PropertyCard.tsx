import { MapPin } from "lucide-react";
import { Property } from "@/lib/types";

const equityStyle: Record<string, { bg: string; color: string }> = {
  high:   { bg: "#dcfce7", color: "#15803d" },
  medium: { bg: "#fef9c3", color: "#a16207" },
  low:    { bg: "#fee2e2", color: "#b91c1c" },
};

export default function PropertyCard({ property }: { property: Property }) {
  const eq = equityStyle[property.equityLevel];
  return (
    <div
      className="rounded-xl p-5 cursor-pointer transition-shadow hover:shadow-md"
      style={{ background: "#fff", border: "1px solid #e8e2db" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 font-semibold" style={{ color: "#2d2825" }}>
            <MapPin size={14} style={{ color: "#492b23" }} />
            {property.address}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "#9e948c" }}>
            {property.city}, {property.state} {property.zip}
          </p>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: eq.bg, color: eq.color }}
        >
          {property.equityLevel} equity
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <p className="text-xs" style={{ color: "#9e948c" }}>Est. Value</p>
          <p className="text-sm font-semibold" style={{ color: "#2d2825" }}>{property.estimatedValue}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "#9e948c" }}>Equity</p>
          <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>{property.equity}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "#9e948c" }}>Owner</p>
          <p className="text-sm font-semibold truncate" style={{ color: "#2d2825" }}>{property.ownerName}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #f0ebe6" }}>
        <span className="text-xs" style={{ color: "#9e948c" }}>
          {property.propertyType} · {property.beds > 0 ? `${property.beds}bd/${property.baths}ba` : "—"}
        </span>
        <span className="text-xs" style={{ color: "#9e948c" }}>
          {property.sqft > 0 ? `${property.sqft.toLocaleString()} sqft` : "—"}
        </span>
      </div>

      {property.tags.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {property.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#f9e2dc", color: "#492b23" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
