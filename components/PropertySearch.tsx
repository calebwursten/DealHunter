"use client";

import { useState, useTransition } from "react";
import { Search, MapPin, Loader2, Building2 } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";
import { wprdcToProperty, WPRDCRecord } from "@/lib/wprdc";

const SUGGESTIONS = [
  "Squirrel Hill Pittsburgh",
  "Shadyside 15232",
  "Mount Washington Pittsburgh",
  "Lawrenceville 15201",
  "Oakland Pittsburgh",
];

export default function PropertySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WPRDCRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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
      {/* Search bar */}
      <div className="rounded-xl p-4 md:p-5 mb-5 md:mb-6" style={{ background: "#fff", border: "1px solid #e8e2db" }}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#f9e2dc", color: "#492b23" }}
          >
            LIVE · Allegheny County
          </span>
          <span className="text-xs" style={{ color: "#9e948c" }}>140,000+ properties · updated daily</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9e948c" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder="Search by address, neighborhood, or ZIP..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #e8e2db" }}
              onFocus={(e) => (e.target.style.borderColor = "#492b23")}
              onBlur={(e) => (e.target.style.borderColor = "#e8e2db")}
            />
          </div>
          <button
            onClick={() => runSearch(query)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#492b23" }}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {!searched && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-xs self-center" style={{ color: "#9e948c" }}>Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); runSearch(s); }}
                className="text-xs px-2.5 py-1 rounded-full transition-colors"
                style={{ border: "1px solid #e8e2db", color: "#5d544c" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#492b23"; (e.currentTarget as HTMLElement).style.color = "#492b23"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e8e2db"; (e.currentTarget as HTMLElement).style.color = "#5d544c"; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {searched && !isPending && !error && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: "#9e948c" }}>
            <span className="font-semibold" style={{ color: "#2d2825" }}>{total.toLocaleString()}</span> properties found
            {query && <span> for &ldquo;{query}&rdquo;</span>}
          </p>
          <select
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ border: "1px solid #e8e2db", background: "#fff", color: "#2d2825" }}
          >
            <option>Highest Equity</option>
            <option>Lowest Price</option>
            <option>Newest Sale</option>
          </select>
        </div>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: "#fff", border: "1px solid #e8e2db" }}>
              <div className="h-4 rounded w-3/4 mb-2" style={{ background: "#f0ebe6" }} />
              <div className="h-3 rounded w-1/2 mb-4" style={{ background: "#f5f1ee" }} />
              <div className="grid grid-cols-3 gap-3">
                {[0,1,2].map(j => <div key={j} className="h-8 rounded" style={{ background: "#f5f1ee" }} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-5 text-sm" style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {/* No results */}
      {searched && !isPending && !error && results.length === 0 && (
        <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid #e8e2db" }}>
          <Building2 size={40} className="mx-auto mb-3" style={{ color: "#e8e2db" }} />
          <p className="font-medium" style={{ color: "#5d544c" }}>No properties found</p>
          <p className="text-sm mt-1" style={{ color: "#9e948c" }}>Try a street name, ZIP code, or neighborhood</p>
        </div>
      )}

      {/* Results */}
      {!isPending && properties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}

      {/* Pre-search */}
      {!searched && (
        <div className="rounded-xl p-10 md:p-16 text-center" style={{ background: "#fff", border: "1px solid #e8e2db" }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#f9e2dc" }}
          >
            <Search size={24} style={{ color: "#492b23" }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: "#2d2825" }}>Search Pittsburgh properties</p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "#9e948c" }}>
            Live data from Allegheny County — ownership, assessed values, sale history, and building details.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[["140K+","Properties"],["Daily","Updates"],["Free","No API key"]].map(([val,label]) => (
              <div key={label}>
                <p className="font-bold text-lg" style={{ color: "#492b23" }}>{val}</p>
                <p className="text-xs" style={{ color: "#9e948c" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
