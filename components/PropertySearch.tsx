"use client";

import { useState, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Loader2, Building2, List, Map, ChevronLeft, ChevronRight } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import { wprdcToProperty, WPRDCRecord } from "@/lib/wprdc";
import { Property } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl flex items-center justify-center"
      style={{ height: "calc(100vh - 220px)", minHeight: "460px", background: "#f5f5f5", border: "1px solid #e5e5e5" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "#888888" }} />
    </div>
  ),
});

const PAGE_SIZE = 25;
const MAP_PAGE  = 500;

const SUGGESTIONS = [
  "Squirrel Hill Pittsburgh",
  "Shadyside 15232",
  "Mount Washington Pittsburgh",
  "Lawrenceville 15201",
  "Oakland Pittsburgh",
];

type OccupancyFilter = "" | "owner" | "non-owner";
type TypeFilter      = "single" | "multi" | "lot";

export default function PropertySearch() {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<WPRDCRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [searched, setSearched]     = useState(false);
  const [error, setError]           = useState("");
  const [view, setView]             = useState<"list" | "map">("list");
  const [isPending, startTransition] = useTransition();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapSearchKey, setMapSearchKey]          = useState(0);
  const mapAbortRef = useRef<AbortController | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [ownerFilter, setOwnerFilter] = useState<OccupancyFilter>("");
  const [typeFilter, setTypeFilter]   = useState<Set<TypeFilter>>(new Set<TypeFilter>());
  const [valueFilter, setValueFilter] = useState("");   // "" | "0-50000" | "50000-100000" etc.
  const [bathFilter,  setBathFilter]  = useState("");   // "" | "1"-"5" (min baths)
  const [yearsFilter, setYearsFilter] = useState("");   // "" | "1"|"5"|"10"|"15"|"20" (min years owned)

  // ── URL builder ───────────────────────────────────────────────────────────
  function buildUrl(q: string, limit: number, offset: number,
                    owner: OccupancyFilter, types: Set<TypeFilter>, val = "", bath = "", years = ""): string {
    const p = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
    if (owner) p.set("occupancy", owner);
    const ta = [...types];
    if (ta.length > 0) p.set("types", ta.join(","));
    if (val)   p.set("valFilter", val);
    if (bath)  p.set("minBaths", bath);
    if (years) p.set("minYears", years);
    return `/api/search?${p}`;
  }

  // ── List view ─────────────────────────────────────────────────────────────
  function fetchListPage(q: string, pageNum: number,
                         owner = ownerFilter, types = typeFilter, val = valueFilter, bath = bathFilter, years = yearsFilter) {
    const url = buildUrl(q, PAGE_SIZE, (pageNum - 1) * PAGE_SIZE, owner, types, val, bath, years);
    setError("");
    setSearched(true);
    startTransition(async () => {
      try {
        const res  = await fetch(url);
        const data = await res.json();
        setResults(data.records ?? []);
        setTotalCount(data.total ?? 0);
        setPage(pageNum);
      } catch {
        setError("Could not reach the Pittsburgh property database. Try again.");
        setResults([]);
        setTotalCount(0);
      }
    });
  }

  // ── Map view — paginate all results ──────────────────────────────────────
  async function fetchAllMapPages(q: string,
                                  owner = ownerFilter, types = typeFilter, val = valueFilter, bath = bathFilter, years = yearsFilter) {
    mapAbortRef.current?.abort();
    const ac = new AbortController();
    mapAbortRef.current = ac;

    setResults([]);
    setTotalCount(0);
    setSearched(true);
    setError("");
    setMapSearchKey((k) => k + 1);

    let offset = 0;
    let total  = Infinity;
    let all: WPRDCRecord[] = [];

    try {
      while (offset < total && !ac.signal.aborted) {
        const res  = await fetch(buildUrl(q, MAP_PAGE, offset, owner, types, val, bath, years), { signal: ac.signal });
        const data = await res.json();
        total = data.total ?? 0;
        const pg = (data.records ?? []) as WPRDCRecord[];
        all = [...all, ...pg];
        setResults([...all]);
        setTotalCount(total);
        if (pg.length < MAP_PAGE) break;
        offset += MAP_PAGE;
      }
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError")
        setError("Could not reach the Pittsburgh property database. Try again.");
    }
  }

  // ── Unified entry point ───────────────────────────────────────────────────
  function runSearch(q: string, currentView = view) {
    if (!q.trim()) return;
    if (currentView === "map") fetchAllMapPages(q);
    else fetchListPage(q, 1);
  }

  function goToPage(p: number) {
    fetchListPage(query, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function switchView(next: "list" | "map") {
    setView(next);
    if (searched && query) {
      if (next === "map") fetchAllMapPages(query);
      else fetchListPage(query, 1);
    }
  }

  // ── Filter handlers ───────────────────────────────────────────────────────
  function applyOwnerFilter(val: OccupancyFilter) {
    setOwnerFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, val, typeFilter, valueFilter, bathFilter, yearsFilter);
      else fetchListPage(query, 1, val, typeFilter, valueFilter, bathFilter, yearsFilter);
    }
  }

  function toggleTypeFilter(val: TypeFilter) {
    const next = new Set(typeFilter);
    if (next.has(val)) next.delete(val); else next.add(val);
    setTypeFilter(next);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, next, valueFilter, bathFilter, yearsFilter);
      else fetchListPage(query, 1, ownerFilter, next, valueFilter, bathFilter, yearsFilter);
    }
  }

  function applyValueFilter(val: string) {
    setValueFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, typeFilter, val, bathFilter, yearsFilter);
      else fetchListPage(query, 1, ownerFilter, typeFilter, val, bathFilter, yearsFilter);
    }
  }

  function applyBathFilter(val: string) {
    setBathFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, typeFilter, valueFilter, val, yearsFilter);
      else fetchListPage(query, 1, ownerFilter, typeFilter, valueFilter, val, yearsFilter);
    }
  }

  function applyYearsFilter(val: string) {
    setYearsFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, typeFilter, valueFilter, bathFilter, val);
      else fetchListPage(query, 1, ownerFilter, typeFilter, valueFilter, bathFilter, val);
    }
  }

  const activeFilterCount =
    (ownerFilter ? 1 : 0) + (typeFilter.size > 0 ? 1 : 0) + (valueFilter ? 1 : 0) + (bathFilter ? 1 : 0) + (yearsFilter ? 1 : 0);

  const properties = results.map(wprdcToProperty);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      {/* ── Search bar + filters ── */}
      <div className="rounded-xl p-4 md:p-5 mb-5 md:mb-6" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f0f0f0", color: "#000000" }}>
            LIVE · Allegheny County
          </span>
          <span className="text-xs" style={{ color: "#888888" }}>140,000+ properties · updated daily</span>
        </div>

        {/* Input row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder="Search by address, neighborhood, or ZIP..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #e5e5e5" }}
              onFocus={(e) => (e.target.style.borderColor = "#000000")}
              onBlur={(e)  => (e.target.style.borderColor = "#e5e5e5")}
            />
          </div>
          <button onClick={() => runSearch(query)} disabled={isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#000000" }}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="mt-3 pt-3 flex flex-wrap gap-2 items-center" style={{ borderTop: "1px solid #f0f0f0" }}>
          <span className="text-xs font-medium" style={{ color: "#888888" }}>Filters</span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setOwnerFilter(""); setTypeFilter(new Set()); setValueFilter(""); setBathFilter(""); setYearsFilter("");
                if (searched && query) {
                  if (view === "map") fetchAllMapPages(query, "", new Set(), "", "", "");
                  else fetchListPage(query, 1, "", new Set(), "", "", "");
                }
              }}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              Clear {activeFilterCount}
            </button>
          )}

          {/* Occupancy */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
            {([
              ["", "All Owners"],
              ["owner", "Owner-Occupied"],
              ["non-owner", "Non-Owner"],
            ] as [OccupancyFilter, string][]).map(([val, label], i) => (
              <button key={val} onClick={() => applyOwnerFilter(val)}
                className="px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                style={{
                  background: ownerFilter === val ? "#000000" : "#fff",
                  color:      ownerFilter === val ? "#ffffff" : "#555555",
                  borderLeft: i > 0 ? "1px solid #e5e5e5" : undefined,
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Property type */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
            {([
              ["single", "Single Family"],
              ["multi",  "Multifamily"],
              ["lot",    "Lot"],
            ] as [TypeFilter, string][]).map(([val, label], i) => (
              <button key={val} onClick={() => toggleTypeFilter(val)}
                className="px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                style={{
                  background: typeFilter.has(val) ? "#000000" : "#fff",
                  color:      typeFilter.has(val) ? "#ffffff" : "#555555",
                  borderLeft: i > 0 ? "1px solid #e5e5e5" : undefined,
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Min bathrooms */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
            <span className="flex items-center px-3 text-xs font-medium"
              style={{ color: "#888888", borderRight: "1px solid #e5e5e5", background: "#fafafa" }}>
              Baths
            </span>
            {["1","2","3","4","5"].map((n) => (
              <button key={n} onClick={() => applyBathFilter(bathFilter === n ? "" : n)}
                className="px-2.5 py-1.5 text-xs font-medium"
                style={{
                  background: bathFilter === n ? "#000000" : "#ffffff",
                  color:      bathFilter === n ? "#ffffff" : "#555555",
                  borderLeft: "1px solid #e5e5e5",
                }}>
                {n}+
              </button>
            ))}
          </div>



          {/* Years owned */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
            <span className="flex items-center px-3 text-xs font-medium"
              style={{ color: "#888888", borderRight: "1px solid #e5e5e5", background: "#fafafa" }}>
              Owned
            </span>
            {(["0","1","5","10","15","20"] as const).map((n) => {
              const isActive = n === "0" ? yearsFilter === "" : yearsFilter === n;
              return (
                <button key={n}
                  onClick={() => applyYearsFilter(n === "0" ? "" : (yearsFilter === n ? "" : n))}
                  className="px-2.5 py-1.5 text-xs font-medium"
                  style={{
                    background: isActive ? "#000000" : "#ffffff",
                    color:      isActive ? "#ffffff" : "#555555",
                    borderLeft: "1px solid #e5e5e5",
                  }}>
                  {n}+
                </button>
              );
            })}
          </div>

      {/* Assessed value range */}
          <select
            value={valueFilter}
            onChange={(e) => applyValueFilter(e.target.value)}
            className="text-xs rounded-lg px-3 py-1.5 outline-none font-medium"
            style={{
              border: "1px solid #e5e5e5",
              background: valueFilter ? "#000000" : "#ffffff",
              color:      valueFilter ? "#ffffff" : "#555555",
            }}>
            <option value="">Any Value</option>
            <option value="0-50000">Under $50K</option>
            <option value="50000-100000">$50K – $100K</option>
            <option value="100000-200000">$100K – $200K</option>
            <option value="200000-500000">$200K – $500K</option>
            <option value="500000-">$500K+</option>
          </select>
        </div>

        {/* Suggestions (pre-search only) */}
        {!searched && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-xs self-center" style={{ color: "#888888" }}>Try:</span>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => { setQuery(s); runSearch(s); }}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ border: "1px solid #e5e5e5", color: "#555555" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#000000"; (e.currentTarget as HTMLElement).style.color = "#000000"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e5e5"; (e.currentTarget as HTMLElement).style.color = "#555555"; }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Results header ── */}
      {searched && !isPending && !error && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm" style={{ color: "#888888" }}>
            <span className="font-semibold" style={{ color: "#111111" }}>{totalCount.toLocaleString()}</span>
            {" "}properties found{query && <span> for &ldquo;{query}&rdquo;</span>}
            {view === "list" && totalPages > 1 && (
              <span className="ml-2" style={{ color: "#aaaaaa" }}>· page {page} of {totalPages}</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
              <button onClick={() => switchView("list")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                style={{ background: view === "list" ? "#000000" : "#fff", color: view === "list" ? "#fff" : "#555555" }}>
                <List size={13} /> List
              </button>
              <button onClick={() => switchView("map")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                style={{ background: view === "map" ? "#000000" : "#fff", color: view === "map" ? "#fff" : "#555555", borderLeft: "1px solid #e5e5e5" }}>
                <Map size={13} /> Map
              </button>
            </div>
            <select className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ border: "1px solid #e5e5e5", background: "#fff", color: "#111111" }}>
              <option>Highest Equity</option>
              <option>Lowest Price</option>
              <option>Newest Sale</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      {searched && !isPending && !error && results.length === 0 && view === "list" && (
        <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
          <Building2 size={40} className="mx-auto mb-3" style={{ color: "#e5e5e5" }} />
          <p className="font-medium" style={{ color: "#555555" }}>No properties found</p>
          <p className="text-sm mt-1" style={{ color: "#888888" }}>Try adjusting your filters or search a different area</p>
        </div>
      )}

      {/* ── Map view — hidden (not unmounted) when modal is open ── */}
      {searched && !isPending && view === "map" && (
        <div style={{ display: selectedProperty ? "none" : "block" }}>
          <MapView
            properties={properties}
            searchKey={mapSearchKey}
            totalCount={totalCount}
            onSelect={setSelectedProperty}
          />
        </div>
      )}

      {/* ── List view ── */}
      {!isPending && properties.length > 0 && view === "list" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} onClick={() => setSelectedProperty(p)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                style={{ border: "1px solid #e5e5e5", color: "#111111" }}
                onMouseEnter={(e) => { if (page > 1) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <ChevronLeft size={15} /> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e-${i}`} className="px-1 text-sm" style={{ color: "#aaaaaa" }}>…</span>
                  ) : (
                    <button key={p} onClick={() => goToPage(p as number)}
                      className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: p === page ? "#000000" : "transparent",
                        color: p === page ? "#ffffff" : "#111111",
                        border: p === page ? "none" : "1px solid #e5e5e5",
                      }}
                      onMouseEnter={(e) => { if (p !== page) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { if (p !== page) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      {p}
                    </button>
                  )
                )}

              <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                style={{ border: "1px solid #e5e5e5", color: "#111111" }}
                onMouseEnter={(e) => { if (page < totalPages) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Pre-search ── */}
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

      <PropertyDetailModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />
    </div>
  );
}


