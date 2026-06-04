"use client";

import {
  X,
  MapPin,
  Home,
  DollarSign,
  Phone,
  ExternalLink,
  Calendar,
  Building2,
} from "lucide-react";
import { Property } from "@/lib/types";
import { useEffect } from "react";
import SaveToListButton from "@/components/SaveToListButton";

interface Props {
  property: Property | null;
  onClose: () => void;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  if (!value) return null;
  return (
    <div
      className="flex justify-between items-baseline py-2.5"
      style={{ borderBottom: "1px solid #f0f0f0" }}
    >
      <span className="text-sm" style={{ color: "#888888" }}>
        {label}
      </span>
      <span
        className="text-sm font-medium ml-4 text-right"
        style={{ color: "#111111" }}
      >
        {String(value)}
      </span>
    </div>
  );
}

export default function PropertyDetailModal({ property, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!property) return null;

  const mailLine1 = property.ownerMailingLine1;
  const mailLine2 = property.ownerMailingLine2;
  const mailCityState = [property.ownerMailingCity, property.ownerMailingState]
    .filter(Boolean)
    .join(", ");
  const mailZip = property.ownerMailingZip;

  const phoneLookupUrl = `https://www.fastpeoplesearch.com/address/${encodeURIComponent(
    [
      mailLine1 ?? property.address,
      mailCityState || `${property.city}, ${property.state}`,
      mailZip ?? property.zip,
    ].join(" ")
  )}`;

  const eqColors = {
    high: { bg: "#dcfce7", color: "#15803d" },
    medium: { bg: "#fef9c3", color: "#a16207" },
    low: { bg: "#fee2e2", color: "#b91c1c" },
  }[property.equityLevel];

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)" }}
      />

      <div
        className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start justify-between p-5 sticky top-0 z-10"
          style={{ background: "#fff", borderBottom: "1px solid #e5e5e5" }}
        >
          <div className="min-w-0 flex-1">
            <div
              className="flex items-center gap-2 font-semibold text-base leading-tight"
              style={{ color: "#111111" }}
            >
              <MapPin
                size={15}
                className="flex-shrink-0"
                style={{ color: "#000000" }}
              />
              <span className="truncate">{property.address}</span>
            </div>
            <p
              className="text-sm mt-0.5 pl-[23px]"
              style={{ color: "#888888" }}
            >
              {property.city}, {property.state} {property.zip}
            </p>
            {/* Save to List */}
            <div className="mt-3 pl-[23px]">
              <SaveToListButton property={property} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: "#888888" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* ── Equity banner ── */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "#f5f5f5" }}
          >
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wide mb-0.5"
                style={{ color: "#888888" }}
              >
                Estimated Value
              </p>
              <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                {property.estimatedValue}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-xs font-medium uppercase tracking-wide mb-0.5"
                style={{ color: "#888888" }}
              >
                Est. Equity
              </p>
              <p className="text-2xl font-bold" style={{ color: "#15803d" }}>
                {property.equity}
              </p>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: eqColors.bg, color: eqColors.color }}
              >
                {property.equityPercent}% · {property.equityLevel}
              </span>
            </div>
          </div>

          {/* ── Owner & Mailing Address ── */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "#888888" }}
            >
              Owner Info
            </h3>
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#888888" }}>
                  Owner Type
                </p>
                <p
                  className="text-sm font-medium"
                  style={{ color: "#111111" }}
                >
                  {property.ownerType}
                  {property.isHomestead && (
                    <span
                      className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#f0f0f0", color: "#555555" }}
                    >
                      Owner-Occupied
                    </span>
                  )}
                </p>
              </div>

              {(mailLine1 || mailCityState) && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "#888888" }}>
                    Owner Mailing Address
                  </p>
                  <div
                    className="text-sm font-medium leading-relaxed"
                    style={{ color: "#111111" }}
                  >
                    {mailLine1 && <p>{mailLine1}</p>}
                    {mailLine2 && <p>{mailLine2}</p>}
                    {(mailCityState || mailZip) && (
                      <p>{[mailCityState, mailZip].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                  {property.neighborhood && (
                    <p className="text-xs mt-1" style={{ color: "#888888" }}>
                      Neighborhood: {property.neighborhood}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-1">
                <p className="text-xs mb-2" style={{ color: "#888888" }}>
                  Phone Number
                </p>
                <p className="text-xs mb-2" style={{ color: "#aaaaaa" }}>
                  Not in public records — search by mailing address to skip
                  trace.
                </p>
                <a
                  href={phoneLookupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "#000000", color: "#ffffff" }}
                >
                  <Phone size={14} />
                  Lookup Phone
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* ── Property Details ── */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "#888888" }}
            >
              Property Details
            </h3>
            <div
              className="rounded-xl px-4 py-1"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <Row label="Type" value={property.propertyType} />
              <Row
                label="Bedrooms"
                value={property.beds > 0 ? property.beds : undefined}
              />
              <Row
                label="Bathrooms"
                value={property.baths > 0 ? property.baths : undefined}
              />
              <Row
                label="Living Area"
                value={
                  property.sqft > 0
                    ? `${property.sqft.toLocaleString()} sqft`
                    : undefined
                }
              />
              <Row label="Total Rooms" value={property.totalRooms} />
              <Row
                label="Year Built"
                value={property.yearBuilt > 0 ? property.yearBuilt : undefined}
              />
              <Row
                label="Lot Area"
                value={
                  property.lotArea
                    ? `${property.lotArea.toLocaleString()} sqft`
                    : undefined
                }
              />
              <Row label="Exterior" value={property.exteriorFinish} />
              <Row label="Condition" value={property.condition} />
            </div>
          </div>

          {/* ── Sale History ── */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "#888888" }}
            >
              Sale History
            </h3>
            <div
              className="rounded-xl px-4 py-1"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <Row
                label="Last Sale Date"
                value={
                  property.lastSaleDate !== "Unknown"
                    ? property.lastSaleDate
                    : undefined
                }
              />
              <Row
                label="Last Sale Price"
                value={
                  property.lastSalePrice !== "N/A"
                    ? property.lastSalePrice
                    : undefined
                }
              />
              <Row label="Previous Sale Date" value={property.prevSaleDate} />
              <Row label="Previous Sale Price" value={property.prevSalePrice} />
            </div>
          </div>

          {/* ── Tags ── */}
          {property.tags.length > 0 && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "#888888" }}
              >
                Flags
              </h3>
              <div className="flex flex-wrap gap-2">
                {property.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: "#f0f0f0", color: "#000000" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: "#aaaaaa" }}>
            Parcel ID: {property.id}
          </p>
        </div>
      </div>
    </div>
  );
}
