"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Loader2, Building2, List, Map } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import { wprdcToProperty, WPRDCRecord } from "@/lib/wprdc";
import { Property } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl flex items-center justify-center" style={{ height: "calc(100vh - 220px)", minHeight: "400px", background: "#f5f5f5", border: "1px solid #e5e5e5" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "#888888" }} />
    </div>
  ),
});

const SUGGESTIONS = [
  "Squirrel Hill Pittsburgh",
  "Shadyside 15232",
  "Mount Washington Pittsburgh",
  "Lawrenceville 15201",
  "Oakland Pittsburgh",
];

export default function PropertySearch() {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<WPRDCRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [searched, setSearched]   = useState(false);
  const [error, setError]         = useState("");
  const [view, setView]           = useState<"list" | "map">("list");
  const [isPending, startTransition] = useTransition();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setError("");
    setSearched(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=24`);
        const data = await res.json();
        setResults(data.records ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setError("Could not reach the Pittsburgh property database. Try again.");
        setResults([]);
      }
    });
  }

  const properties = results.map(wprdcToProperty);

  return (
    <div>
      {/* ── Search bar ── */}
      <div className="rounded-xl p-4 md:p-5 mb-5 md:mb-6" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f0f0f0", color: "#000000" }}>
            LIVE · Allegheny County
          </span>
          <span className="text-xs" style={{ color: "#888888" }}>140,000+ properties · updated daily</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder="Search by address, neighborhood, or ZIP..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #e5e5e5" }}
              onFocus={(e) => (e.target.style.borderColor = "#000000")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
            />
          </div>
          <button
            onClick={() => runSearch(query)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#000000" }}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {!searched && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-xs self-center" style={{ color: "#888888" }}>Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); runSearch(s); }}
                className="text-xs px-2.5 py-1 rounded-full transition-colors"
                style={{ border: "1px solid #e5e5e5", color: "#555555" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#000000"; (e.currentTarget as HTMLElement).style.color = "#000000"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e5e5"; (e.currentTarget as HTMLElement).style.color = "#555555"; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Results header with view toggle ── */}
      {searched && !isPending && !error && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: "#888888" }}>
            <span className="font-semibold" style={{ color: "#111111" }}>{total.toLocaleString()}</span> properties found
            {query && <span> for &ldquo;{query}&rdquo;</span>}
          </p>
          <div className="flex items-center gap-2">
            {/* List / Map toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
              <button
                onClick={() => setView("list")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === "list" ? "#000000" : "#fff",
                  color:      view === "list" ? "#fff"     : "#555555",
                }}
              >
                <List size={13} /> List
              </button>
              <button
                onClick={() => setView("map")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === "map" ? "#000000" : "#fff",
                  color:      view === "map" ? "#fff"     : "#555555",
                  borderLeft: "1px solid #e5e5e5",
                }}
              >
                <Map size={13} /> Map
              </button>
            </div>
            <select
              className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ border: "1px solid #e5e5e5", background: "#fff", color: "#111111" }}
            >
              <option>Highest Equity</option>
              <option>Lowest Price</option>
              <option>Newest Sale</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
              <div className="h-4 rounded w-3/4 mb-2" style={{ background: "#f0f0f0" }} />
              <div className="h-3 rounded w-1/2 mb-4" style={{ background: "#f5f5f5" }} />
              <div className="grid grid-cols-3 gap-3">
                {[0,1,2].map(j => <div key={j} className="h-8 rounded" style={{ background: "#f5f5f5" }} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl p-5 text-sm" style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {/* ── No results ── */}
      {searched && !isPending && !error && results.length === 0 && (
        <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
          <Building2 size={40} className="mx-auto mb-3" style={{ color: "#e5e5e5" }} />
          <p className="font-medium" style={{ color: "#555555" }}>No properties found</p>
          <p className="text-sm mt-1" style={{ color: "#888888" }}>Try a street name, ZIP code, or neighborhood</p>
        </div>
      )}

      {/* ── Map view ── */}
      {!isPending && properties.length > 0 && view === "map" && (
        <MapView properties={properties} onSelect={setSelectedProperty} />
      )}

      {/* ── List view ── */}
      {!isPending && properties.length > 0 && view === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} onClick={() => setSelectedProperty(p)} />
          ))}
        </div>
      )}

      {/* ── Pre-search state ── */}
      {!searched && (
        <div className="rounded-xl p-10 md:p-16 text-center" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0f0f0" }}>
            <Search size={24} style={{ color: "#000000" }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: "#111111" }}>Search Pittsburgh properties</p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "#888888" }}>
            Live data from Allegheny County — ownership, assessed values, sale history, and building details.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[["140K+","Properties"],["Daily","Updates"],["Free","No API key"]].map(([val,label]) => (
              <div key={label}>
                <p className="font-bold text-lg" style={{ color: "#000000" }}>{val}</p>
                <p className="text-xs" style={{ color: "#888888" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail drawer ── */}
      <PropertyDetailModal
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
    </div>
  );
}
