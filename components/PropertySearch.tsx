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
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            LIVE · Allegheny County
          </span>
          <span className="text-xs text-gray-400">140,000+ properties · updated daily</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder="Search by address, neighborhood, or ZIP..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => runSearch(query)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {/* Quick suggestions */}
        {!searched && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400 self-center">Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); runSearch(s); }}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Filters row */}
        {searched && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {["Single Family", "Multi-Family", "High Equity", "Owner-Occupied"].map((f) => (
              <button
                key={f}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results header */}
      {searched && !isPending && !error && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> properties found
            {query && <span className="text-gray-400"> for &ldquo;{query}&rdquo;</span>}
          </p>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {searched && !isPending && !error && results.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">No properties found</p>
          <p className="text-sm text-gray-400 mt-1">Try a street name, ZIP code, or neighborhood</p>
        </div>
      )}

      {/* Results grid */}
      {!isPending && properties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}

      {/* Pre-search empty state */}
      {!searched && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 md:p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-blue-500" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">Search Pittsburgh properties</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Live data from Allegheny County — ownership, assessed values, sale history, and building details.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[["140K+", "Properties"], ["Daily", "Updates"], ["Free", "No API key"]].map(([val, label]) => (
              <div key={label}>
                <p className="font-bold text-blue-600 text-lg">{val}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
