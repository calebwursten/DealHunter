"use client";

import {
  X,
  MapPin,
  Phone,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Property } from "@/lib/types";
import { useEffect, useState, useRef } from "react";
import SaveToListButton from "@/components/SaveToListButton";

interface Props {
  property: Property | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-baseline py-2.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
      <span className="text-sm" style={{ color: "#888888" }}>{label}</span>
      <span className="text-sm font-medium ml-4 text-right" style={{ color: "#111111" }}>
        {String(value)}
      </span>
    </div>
  );
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

export default function PropertyDetailModal({ property, onClose }: Props) {
  const [phoneState, setPhoneState] = useState<"idle" | "loading" | "done">("idle");
  const [phones, setPhones]         = useState<string[]>([]);
  const [debugStep, setDebugStep]   = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [tpsUrl, setTpsUrl]         = useState("");

  // Notes
  const [notes, setNotes]           = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function lookupPhone(p: Property) {
    setPhoneState("loading");
    try {
      const res = await fetch("/api/phone", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parid:     p.id,
          address:   p.ownerMailingLine2 ?? p.address,
          city:      p.ownerMailingCity  ?? p.city,
          state:     p.ownerMailingState ?? p.state,
          zip:       p.ownerMailingZip   ?? p.zip,
          ownerName: p.ownerName,
          ownerType: p.ownerType,
        }),
      });
      const data = await res.json();
      setPhones(data.phones ?? []);
      setDebugStep(data.debug?.step ?? "");
      setPhoneError(data.error ?? "");
    } catch (e) {
      setPhones([]);
      setDebugStep(`exception:${String(e)}`);
    }
    setPhoneState("done");
  }

  async function loadNotes(parid: string) {
    try {
      const res  = await fetch(`/api/notes?parid=${encodeURIComponent(parid)}`);
      const data = await res.json();
      const text = data.notes ?? "";
      setNotes(text);
      setSavedNotes(text);
    } catch {
      // ignore
    }
  }

  function handleNotesChange(val: string) {
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSaveNotes(val), 1000);
  }

  async function autoSaveNotes(val: string) {
    if (!property) return;
    setSavingNotes(true);
    try {
      await fetch("/api/notes", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ parid: property.id, notes: val }),
      });
      setSavedNotes(val);
    } catch {
      // ignore
    }
    setSavingNotes(false);
  }

  // Reset + auto-lookup whenever the displayed property changes
  useEffect(() => {
    setPhoneState("idle");
    setPhones([]);
    setDebugStep("");
    setPhoneError("");
    setNotes("");
    setSavedNotes("");
    if (saveTimer.current) clearTimeout(saveTimer.current);

    if (property) {
      setTpsUrl(buildTpsUrl(property));
      lookupPhone(property);
      loadNotes(property.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!property) return null;

  const mailLine1     = property.ownerMailingLine1;
  const mailLine2     = property.ownerMailingLine2;
  const mailCityState = [property.ownerMailingCity, property.ownerMailingState]
    .filter(Boolean).join(", ");
  const mailZip = property.ownerMailingZip;

  const eqColors = {
    high:   { bg: "#dcfce7", color: "#15803d" },
    medium: { bg: "#fef9c3", color: "#a16207" },
    low:    { bg: "#fee2e2", color: "#b91c1c" },
  }[property.equityLevel];

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />

      <div
        className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 sticky top-0 z-10"
          style={{ background: "#fff", borderBottom: "1px solid #e5e5e5" }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold text-base leading-tight"
              style={{ color: "#111111" }}>
              <MapPin size={15} className="flex-shrink-0" style={{ color: "#000000" }} />
              <span className="truncate">{property.address}</span>
            </div>
            <p className="text-sm mt-0.5 pl-[23px]" style={{ color: "#888888" }}>
              {property.city}, {property.state} {property.zip}
            </p>
            <div className="mt-3 pl-[23px]">
              <SaveToListButton property={property} />
            </div>
          </div>
          <button onClick={onClose}
            className="ml-3 flex-shrink-0 p-1.5 rounded-lg"
            style={{ color: "#888888" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">

          {/* ── Equity banner ── */}
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#f5f5f5" }}>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: "#888888" }}>
                Estimated Value
              </p>
              <p className="text-2xl font-bold" style={{ color: "#111111" }}>{property.estimatedValue}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: "#888888" }}>
                Est. Equity
              </p>
              <p className="text-2xl font-bold" style={{ color: "#15803d" }}>{property.equity}</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: eqColors.bg, color: eqColors.color }}>
                {property.equityPercent}% · {property.equityLevel}
              </span>
            </div>
          </div>

          {/* ── Owner Info ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>
              Owner Info
            </h3>
            <div className="rounded-xl p-4 space-y-4" style={{ border: "1px solid #e5e5e5" }}>

              {/* Owner type */}
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#888888" }}>Owner Type</p>
                <p className="text-sm font-medium" style={{ color: "#111111" }}>
                  {property.ownerType}
                  {property.isHomestead && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#f0f0f0", color: "#555555" }}>
                      Owner-Occupied
                    </span>
                  )}
                </p>
              </div>

              {/* Mailing address */}
              {(mailLine1 || mailCityState) && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "#888888" }}>Owner Mailing Address</p>
                  <div className="text-sm font-medium leading-relaxed" style={{ color: "#111111" }}>
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

              {/* ── Phone ── */}
              <div>
                <p className="text-xs mb-2 font-medium" style={{ color: "#888888" }}>Phone Number</p>

                {phoneState === "loading" && (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 size={14} className="animate-spin" style={{ color: "#888888" }} />
                    <span className="text-sm" style={{ color: "#888888" }}>Looking up…</span>
                  </div>
                )}

                {phoneState === "done" && phones.length > 0 && (
                  <div className="space-y-2">
                    {phones.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <a href={`tel:${p.replace(/\D/g, "")}`}
                          className="text-sm font-semibold" style={{ color: "#111111" }}>
                          {p}
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(p)}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ background: "#f0f0f0", color: "#555555" }}>
                          Copy
                        </button>
                      </div>
                    ))}
                    <a href={tpsUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: "#888888" }}>
                      View full profile on TruePeopleSearch
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}

                {phoneState === "done" && phones.length === 0 && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: "#aaaaaa" }}>
                      {phoneError
                        ? phoneError
                        : debugStep === "pdl_no_match"
                          ? "Not in People Data Labs — search manually:"
                          : debugStep?.startsWith("skipped:")
                            ? "Corporate owner — search by address:"
                            : debugStep === "no_usable_name"
                              ? "Owner name not available — search by address:"
                              : "Not found automatically — search manually:"}
                    </p>
                    <a href={tpsUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                      style={{ background: "#000000", color: "#ffffff" }}>
                      <Phone size={14} />
                      Search TruePeopleSearch
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888888" }}>
                Notes
              </h3>
              {savingNotes ? (
                <span className="text-xs" style={{ color: "#aaaaaa" }}>Saving…</span>
              ) : savedNotes && notes === savedNotes ? (
                <span className="text-xs" style={{ color: "#aaaaaa" }}>Saved</span>
              ) : null}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about this property…"
              rows={4}
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none resize-none"
              style={{ border: "1px solid #e5e5e5", color: "#111111", lineHeight: "1.5" }}
              onFocus={(e) => (e.target.style.borderColor = "#000000")}
              onBlur={(e)  => (e.target.style.borderColor = "#e5e5e5")}
            />
          </div>

          {/* ── Property Details ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>
              Property Details
            </h3>
            <div className="rounded-xl px-4 py-1" style={{ border: "1px solid #e5e5e5" }}>
              <Row label="Type"        value={property.propertyType} />
              <Row label="Bedrooms"    value={property.beds   > 0 ? property.beds   : undefined} />
              <Row label="Bathrooms"   value={property.baths  > 0 ? property.baths  : undefined} />
              <Row label="Living Area" value={property.sqft   > 0 ? `${property.sqft.toLocaleString()} sqft` : undefined} />
              <Row label="Total Rooms" value={property.totalRooms} />
              <Row label="Year Built"  value={property.yearBuilt > 0 ? property.yearBuilt : undefined} />
              <Row label="Lot Area"    value={property.lotArea ? `${property.lotArea.toLocaleString()} sqft` : undefined} />
              <Row label="Exterior"    value={property.exteriorFinish} />
              <Row label="Condition"   value={property.condition} />
            </div>
          </div>

          {/* ── Sale History ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>
              Sale History
            </h3>
            <div className="rounded-xl px-4 py-1" style={{ border: "1px solid #e5e5e5" }}>
              <Row label="Last Sale Date"      value={property.lastSaleDate !== "Unknown" ? property.lastSaleDate : undefined} />
              <Row label="Last Sale Price"     value={property.lastSalePrice !== "N/A"    ? property.lastSalePrice : undefined} />
              <Row label="Previous Sale Date"  value={property.prevSaleDate} />
              <Row label="Previous Sale Price" value={property.prevSalePrice} />
            </div>
          </div>

          {/* ── Flags / Tags ── */}
          {property.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>
                Flags
              </h3>
              <div className="flex flex-wrap gap-2">
                {property.tags.map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: "#f0f0f0", color: "#000000" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: "#aaaaaa" }}>Parcel ID: {property.id}</p>
        </div>
      </div>
    </div>
  );
}
