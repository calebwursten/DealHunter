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

const PGH_SUGGESTIONS = [
  "Squirrel Hill Pittsburgh",
  "Shadyside 15232",
  "Mount Washington Pittsburgh",
  "Lawrenceville 15201",
  "Oakland Pittsburgh",
];

const NA_SUGGESTIONS = [
  "Main St",
  "State St",
  "Church St",
  "River St",
  "Eagle St",
];

type City            = "pittsburgh" | "northadams";
type OccupancyFilter = "" | "owner" | "non-owner";
type TypeFilter      = "single" | "multi" | "lot";

// "Last purchased before" year options for NA (maps to minYears sent to API)
const YEAR_NOW = new Date().getFullYear();
const NA_PURCHASE_YEARS = [
  { label: "Any",    minYears: "" },
  { label: "5+ yrs", minYears: "5"  },
  { label: "10+ yrs",minYears: "10" },
  { label: "15+ yrs",minYears: "15" },
  { label: "20+ yrs",minYears: "20" },
  { label: "25+ yrs",minYears: "25" },
] as const;

void YEAR_NOW; // suppress unused-variable warning

export default function PropertySearch() {
  const [city, setCity]             = useState<City>("pittsburgh");
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<Property[]>([]);
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
  const [ownerFilter,   setOwnerFilter]   = useState<OccupancyFilter>("");
  const [typeFilter,    setTypeFilter]    = useState<Set<TypeFilter>>(new Set<TypeFilter>());
  const [valueFilter,   setValueFilter]   = useState("");
  const [bathFilter,    setBathFilter]    = useState("");
  const [yearsFilter,   setYearsFilter]   = useState("");
  const [absenteeOnly,  setAbsenteeOnly]  = useState(false);

  // ── URL builder ───────────────────────────────────────────────────────────
  function buildUrl(
    q: string, limit: number, offset: number,
    owner: OccupancyFilter, types: Set<TypeFilter>,
    val = "", bath = "", years = "", absentee = false, c: City = city
  ): string {
    const endpoint = c === "northadams" ? "/api/na-search" : "/api/search";
    const p = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
    if (owner)   p.set("occupancy", owner);
    const ta = [...types];
    if (ta.length > 0) p.set("types", ta.join(","));
    if (val)     p.set("valFilter", val);
    if (bath)    p.set("minBaths", bath);
    if (years)   p.set("minYears", years);
    if (absentee && c === "northadams") p.set("absentee", "true");
    return `${endpoint}?${p}`;
  }

  const errMsg = (c: City) =>
    c === "northadams"
      ? "Could not reach the North Adams assessor database. Try again."
      : "Could not reach the Pittsburgh property database. Try again.";

  // ── List fetch ────────────────────────────────────────────────────────────
  function fetchListPage(
    q: string, pageNum: number,
    owner      = ownerFilter,
    types      = typeFilter,
    val        = valueFilter,
    bath       = bathFilter,
    years      = yearsFilter,
    absentee   = absenteeOnly,
    c: City    = city
  ) {
    const url = buildUrl(q, PAGE_SIZE, (pageNum - 1) * PAGE_SIZE, owner, types, val, bath, years, absentee, c);
    setError("");
    setSearched(true);
    startTransition(async () => {
      try {
        const res  = await fetch(url);
        const data = await res.json();
        const recs = (data.records ?? []) as (WPRDCRecord | Property)[];
        const props = c === "northadams"
          ? (recs as Property[])
          : (recs as WPRDCRecord[]).map(wprdcToProperty);
        setResults(props);
        setTotalCount(data.total ?? 0);
        setPage(pageNum);
      } catch {
        setError(errMsg(c));
        setResults([]);
        setTotalCount(0);
      }
    });
  }

  // ── Map fetch ─────────────────────────────────────────────────────────────
  async function fetchAllMapPages(
    q: string,
    owner    = ownerFilter,
    types    = typeFilter,
    val      = valueFilter,
    bath     = bathFilter,
    years    = yearsFilter,
    absentee = absenteeOnly,
    c: City  = city
  ) {
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
    let all: Property[] = [];

    try {
      while (offset < total && !ac.signal.aborted) {
        const res  = await fetch(buildUrl(q, MAP_PAGE, offset, owner, types, val, bath, years, absentee, c), { signal: ac.signal });
        const data = await res.json();
        total = data.total ?? 0;
        const recs = (data.records ?? []) as (WPRDCRecord | Property)[];
        const props = c === "northadams"
          ? (recs as Property[])
          : (recs as WPRDCRecord[]).map(wprdcToProperty);
        all = [...all, ...props];
        setResults([...all]);
        setTotalCount(total);
        if (props.length < MAP_PAGE) break;
        offset += MAP_PAGE;
      }
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError(errMsg(c));
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

  // ── City switch ───────────────────────────────────────────────────────────
  function switchCity(next: City) {
    setCity(next);
    setQuery("");
    setResults([]);
    setTotalCount(0);
    setSearched(false);
    setError("");
    setOwnerFilter("");
    setTypeFilter(new Set());
    setValueFilter("");
    setBathFilter("");
    setYearsFilter("");
    setAbsenteeOnly(false);
  }

  // ── Filter handlers ───────────────────────────────────────────────────────
  function applyOwnerFilter(val: OccupancyFilter) {
    setOwnerFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, val, typeFilter, valueFilter, bathFilter, yearsFilter, absenteeOnly);
      else fetchListPage(query, 1, val, typeFilter, valueFilter, bathFilter, yearsFilter, absenteeOnly);
    }
  }

  function toggleTypeFilter(val: TypeFilter) {
    const next = new Set(typeFilter);
    if (next.has(val)) next.delete(val); else next.add(val);
    setTypeFilter(next);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, next, valueFilter, bathFilter, yearsFilter, absenteeOnly);
      else fetchListPage(query, 1, ownerFilter, next, valueFilter, bathFilter, yearsFilter, absenteeOnly);
    }
  }

  function applyValueFilter(val: string) {
    setValueFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, typeFilter, val, bathFilter, yearsFilter, absenteeOnly);
      else fetchListPage(query, 1, ownerFilter, typeFilter, val, bathFilter, yearsFilter, absenteeOnly);
    }
  }

  function applyBathFilter(val: string) {
    setBathFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, typeFilter, valueFilter, val, yearsFilter, absenteeOnly);
      else fetchListPage(query, 1, ownerFilter, typeFilter, valueFilter, val, yearsFilter, absenteeOnly);
    }
  }

  function applyYearsFilter(val: string) {
    setYearsFilter(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, typeFilter, valueFilter, bathFilter, val, absenteeOnly);
      else fetchListPage(query, 1, ownerFilter, typeFilter, valueFilter, bathFilter, val, absenteeOnly);
    }
  }

  function applyAbsenteeFilter(val: boolean) {
    setAbsenteeOnly(val);
    if (searched && query) {
      if (view === "map") fetchAllMapPages(query, ownerFilter, typeFilter, valueFilter, bathFilter, yearsFilter, val);
      else fetchListPage(query, 1, ownerFilter, typeFilter, valueFilter, bathFilter, yearsFilter, val);
    }
  }

  const activeFilterCount =
    (ownerFilter ? 1 : 0) + (typeFilter.size > 0 ? 1 : 0) +
    (valueFilter ? 1 : 0) + (bathFilter ? 1 : 0) + (yearsFilter ? 1 : 0) +
    (absenteeOnly ? 1 : 0);

  const properties  = results;
  const totalPages  = Math.ceil(totalCount / PAGE_SIZE);
  const suggestions = city === "northadams" ? NA_SUGGESTIONS : PGH_SUGGESTIONS;

  return (
    <div>
      {/* ── Search bar + filters ── */}
      <div className="rounded-xl p-4 md:p-5 mb-5 md:mb-6" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>

        {/* City selector */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
            <button onClick={() => switchCity("pittsburgh")}
              className="px-3 py-1.5 text-xs font-medium whitespace-nowrap"
              style={{
                background: city === "pittsburgh" ? "#000000" : "#fafafa",
                color:      city === "pittsburgh" ? "#ffffff" : "#555555",
              }}>
              Pittsburgh, PA
            </button>
            <button onClick={() => switchCity("northadams")}
              className="px-3 py-1.5 text-xs font-medium whitespace-nowrap"
              style={{
                background: city === "northadams" ? "#000000" : "#fafafa",
                color:      city === "northadams" ? "#ffffff" : "#555555",
                borderLeft: "1px solid #e5e5e5",
              }}>
              North Adams, MA
            </button>
          </div>
          <span className="text-xs" style={{ color: "#888888" }}>
            {city === "northadams"
              ? "5,500+ properties · Berkshire County Assessor"
              : "140,000+ properties · updated daily"}
          </span>
        </div>

        {/* Input row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder={city === "northadams"
                ? "Search by street, address, or owner name..."
                : "Search by address, neighborhood, or ZIP..."}
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
                setOwnerFilter(""); setTypeFilter(new Set()); setValueFilter("");
                setBathFilter(""); setYearsFilter(""); setAbsenteeOnly(false);
                if (searched && query) {
                  if (view === "map") fetchAllMapPages(query, "", new Set(), "", "", "", false);
                  else fetchListPage(query, 1, "", new Set(), "", "", "", false);
                }
              }}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              Clear {activeFilterCount}
            </button>
          )}

          {/* Occupancy (Pittsburgh only) */}
          {city === "pittsburgh" && (
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
          )}

          {/* Absentee owner toggle (North Adams only) */}
          {city === "northadams" && (
            <button
              onClick={() => applyAbsenteeFilter(!absenteeOnly)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap"
              style={{
                background: absenteeOnly ? "#000000" : "#fff",
                color:      absenteeOnly ? "#ffffff" : "#555555",
                border:     "1px solid #e5e5e5",
              }}>
              Absentee Owner
            </button>
          )}

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

          {/* Last purchased / years owned */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
            <span className="flex items-center px-3 text-xs font-medium whitespace-nowrap"
              style={{ color: "#888888", borderRight: "1px solid #e5e5e5", background: "#fafafa" }}>
              {city === "northadams" ? "Purchased" : "Owned"}
            </span>
            {city === "northadams"
              ? NA_PURCHASE_YEARS.slice(1).map((opt) => (
                  <button key={opt.minYears}
                    onClick={() => applyYearsFilter(yearsFilter === opt.minYears ? "" : opt.minYears)}
                    className="px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={{
                      background: yearsFilter === opt.minYears ? "#000000" : "#ffffff",
                      color:      yearsFilter === opt.minYears ? "#ffffff" : "#555555",
                      borderLeft: "1px solid #e5e5e5",
                    }}>
                    {opt.label}
                  </button>
                ))
              : (["0","1","5","10","15","20"] as const).map((n) => {
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
                })
            }
          </div>

          {/* Assessed value */}
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

        {/* Suggestions */}
        {!searched && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-xs self-center" style={{ color: "#888888" }}>Try:</span>
            {suggestions.map((s) => (
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

      {/* ── Map view ── */}
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
          {city === "northadams" ? (
            <>
              <p className="font-semibold mb-1" style={{ color: "#111111" }}>Search North Adams properties</p>
              <p className="text-sm max-w-xs mx-auto" style={{ color: "#888888" }}>
                Live data from the North Adams Assessor — ownership, assessed values, sale history, and building details.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
                {[["5.5K+","Properties"],["Annual","Updates"],["Owner","Names Included"]].map(([val,label]) => (
                  <div key={label}>
                    <p className="font-bold text-lg" style={{ color: "#000000" }}>{val}</p>
                    <p className="text-xs" style={{ color: "#888888" }}>{label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      <PropertyDetailModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />
    </div>
  );
}
