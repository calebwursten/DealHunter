import { NextRequest } from "next/server";

const CKAN   = "https://data.wprdc.org/api/3/action";
const RES_ID = "65855e14-549e-4992-b5be-d629afc676fa";

// Safe string for SQL string literals (not LIKE wildcards — those we add ourselves)
function esc(s: string) {
  return s.replace(/'/g, "''").replace(/[;\\]/g, "").substring(0, 120);
}

// Common street-type words to strip when building the keyword
const SUFFIX = /\b(STREET|ST|AVENUE|AVE|BOULEVARD|BLVD|ROAD|RD|DRIVE|DR|LANE|LN|WAY|COURT|CT|PLACE|PL|TERRACE|TER|CIRCLE|CIR|HIGHWAY|HWY|PARKWAY|PKWY|PIKE|ALLEY|ALY)\b\.?/gi;

interface SearchResult { records: unknown[]; total: number; mode: string }

// ── SQL path (street / address / ZIP queries) ─────────────────────────────────
async function sqlSearch(sql: string, limit: number): Promise<SearchResult | null> {
  try {
    const url = `${CKAN}/datastore_search_sql?sql=${encodeURIComponent(sql)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    if (data.success && Array.isArray(data.result?.records)) {
      return { records: data.result.records, total: data.result.records.length, mode: "sql" };
    }
  } catch { /* fall through */ }
  return null;
}

// ── Full-text fallback (neighborhood / general terms) ─────────────────────────
async function fulltextSearch(q: string, limit: number): Promise<SearchResult> {
  const params = new URLSearchParams({ resource_id: RES_ID, q, limit: String(limit) });
  const res = await fetch(`${CKAN}/datastore_search?${params}`, { next: { revalidate: 300 } });
  const data = await res.json();
  return {
    records: data.result?.records ?? [],
    total:   data.result?.total   ?? 0,
    mode: "fulltext",
  };
}

export async function GET(req: NextRequest) {
  const raw   = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "24"), 100);

  if (!raw) return Response.json({ records: [], total: 0 });

  const upper  = raw.toUpperCase();
  // Split on first comma: "walnut street, pittsburgh" → ["walnut street", "pittsburgh"]
  const comma  = raw.indexOf(",");
  const addrRaw = comma >= 0 ? raw.slice(0, comma).trim() : raw;
  const cityRaw = comma >= 0 ? raw.slice(comma + 1).trim() : "";
  const addrUp  = addrRaw.toUpperCase();
  const cityUp  = cityRaw.toUpperCase();

  // ── 1. ZIP code ────────────────────────────────────────────────────────────
  if (/^\d{5}$/.test(raw)) {
    const sql = `SELECT * FROM "${RES_ID}" WHERE "PROPERTYZIP" = '${esc(raw)}' ORDER BY "FAIRMARKETTOTAL" DESC NULLS LAST LIMIT ${limit}`;
    const r = await sqlSearch(sql, limit);
    if (r) return Response.json(r);
  }

  // ── 2. House number + street: "123 walnut st" ─────────────────────────────
  const numMatch = addrRaw.match(/^(\d+)\s+(.+)/);
  if (numMatch) {
    const num    = esc(numMatch[1]);
    const kw     = esc(numMatch[2].toUpperCase().replace(SUFFIX, "").trim());
    let where    = `"PROPERTYHOUSENUM" = '${num}' AND "PROPERTYADDRESS" ILIKE '%${kw}%'`;
    if (cityUp)  where += ` AND "PROPERTYCITY" ILIKE '%${esc(cityUp)}%'`;
    const sql = `SELECT * FROM "${RES_ID}" WHERE ${where} LIMIT ${limit}`;
    const r = await sqlSearch(sql, limit);
    if (r?.records.length) return Response.json(r);
    // If specific address returns nothing, widen to street
  }

  // ── 3. Street name (contains suffix word OR has an explicit city part) ─────
  const hasSuffix = new RegExp(SUFFIX.source, "i").test(addrUp);
  if (hasSuffix || cityRaw) {
    SUFFIX.lastIndex = 0;
    const kw = esc(addrUp.replace(SUFFIX, "").trim());
    if (kw.length >= 2) {
      let where = `"PROPERTYADDRESS" ILIKE '%${kw}%'`;
      if (cityUp) where += ` AND ("PROPERTYCITY" ILIKE '%${esc(cityUp)}%' OR "MUNIDESC" ILIKE '%${esc(cityUp)}%')`;
      const sql = `SELECT * FROM "${RES_ID}" WHERE ${where} ORDER BY "FAIRMARKETTOTAL" DESC NULLS LAST LIMIT ${limit}`;
      const r = await sqlSearch(sql, limit);
      if (r?.records.length) return Response.json(r);
    }
  }

  // ── 4. Neighborhood / general — full-text search ──────────────────────────
  const r = await fulltextSearch(raw, limit);
  return Response.json(r);
}
