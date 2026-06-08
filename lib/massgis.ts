// MassGIS Level 3 Standardized Assessors Parcels — North Adams, MA
// REST service: https://services1.arcgis.com/hGdibHYSPO59RG1h/.../Massachusetts_Property_Tax_Parcels/FeatureServer/0
// TOWN_ID 209 = North Adams, MA

import { Property } from "./types";

const MASSGIS =
  "https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services" +
  "/Massachusetts_Property_Tax_Parcels/FeatureServer/0";

export const NA_TOWN_ID = 209;

const OUTFIELDS = [
  "ADDR_NUM","FULL_STR","SITE_ADDR","CITY","ZIP",
  "OWNER1","OWN_ADDR","OWN_CITY","OWN_STATE","OWN_ZIP",
  "TOTAL_VAL","BLDG_VAL","LS_DATE","LS_PRICE",
  "USE_CODE","YEAR_BUILT","BLD_AREA","RES_AREA",
  "UNITS","LOT_SIZE","LOT_UNITS","NUM_ROOMS","STORIES","LOC_ID",
].join(",");

// ── Raw record as returned by ArcGIS REST API ────────────────────────────────

export interface MassGisRecord {
  ADDR_NUM:   string | null;
  FULL_STR:   string | null;
  SITE_ADDR:  string | null;
  CITY:       string | null;
  ZIP:        string | null;
  OWNER1:     string | null;
  OWN_ADDR:   string | null;
  OWN_CITY:   string | null;
  OWN_STATE:  string | null;
  OWN_ZIP:    string | null;
  TOTAL_VAL:  number | null;
  BLDG_VAL:   number | null;
  LS_DATE:    string | number | null;
  LS_PRICE:   number | null;
  USE_CODE:   string | null;
  YEAR_BUILT: number | null;
  BLD_AREA:   number | null;
  RES_AREA:   number | null;
  UNITS:      number | null;
  LOT_SIZE:   number | null;
  LOT_UNITS:  string | null;
  NUM_ROOMS:  number | null;
  STORIES:    string | null;
  LOC_ID:     string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isAbsentee(r: MassGisRecord): boolean {
  const city  = (r.OWN_CITY  ?? "").toUpperCase().trim();
  const state = (r.OWN_STATE ?? "").toUpperCase().trim();
  return !city || city !== "NORTH ADAMS" || state !== "MA";
}

function formatSaleDate(lsDate: string | number | null): string {
  if (!lsDate) return "Unknown";
  const ds = String(lsDate).replace(/\D/g, "");
  if (ds.length === 8)
    return `${ds.slice(4, 6)}/${ds.slice(6, 8)}/${ds.slice(0, 4)}`;
  return "Unknown";
}

function useCodeToPropertyType(
  useCode: string | null,
  units: number | null
): Property["propertyType"] {
  const c = parseInt(useCode ?? "") || 0;
  const u = units ?? 0;
  if (c === 102)                         return "Condo";
  if (c === 101 || c === 103)            return "Single Family";
  if (c >= 104 && c <= 125)             return "Multi-Family";
  if (c >= 130 && c <= 139)             return "Lot";
  if ((c >= 300 && c <= 399) ||
      (c >= 400 && c <= 499))           return "Commercial";
  // Fallback on unit count
  if (u > 1)  return "Multi-Family";
  if (u === 1) return "Single Family";
  return "Single Family";
}

function ownerTypeFromName(name: string | null): Property["ownerType"] {
  const n = (name ?? "").toUpperCase();
  if (/LLC|LTD|LP\b|LIMITED|PARTNER/.test(n)) return "LLC";
  if (/CORP|INC\b|COMPAN/.test(n))             return "Corporate";
  if (/TRUST|TRUSTEE/.test(n))                  return "Trust";
  return "Individual";
}

// ── Property mapper ───────────────────────────────────────────────────────────

export function massGisToProperty(r: MassGisRecord): Property {
  const addrNum = (r.ADDR_NUM ?? "").trim();
  const address = [addrNum, r.FULL_STR ?? ""]
    .filter(Boolean).join(" ").trim() || (r.SITE_ADDR ?? "").trim();

  const totalVal  = Number(r.TOTAL_VAL) || 0;
  const lsPrice   = Number(r.LS_PRICE)  || 0;
  const equity    = totalVal > 0 && lsPrice > 0 ? Math.max(0, totalVal - lsPrice) : 0;
  const equityPct = totalVal > 0 && lsPrice > 0 ? Math.round((equity / totalVal) * 100) : 0;

  const pt       = useCodeToPropertyType(r.USE_CODE, r.UNITS);
  const ot       = ownerTypeFromName(r.OWNER1);
  const abs      = isAbsentee(r);
  const saleDate = formatSaleDate(r.LS_DATE);

  const tags: string[] = [];
  if (equityPct >= 30) tags.push("High Equity");
  if (saleDate !== "Unknown") {
    const yr = parseInt(saleDate.split("/")[2] ?? "0");
    if (yr > 0 && new Date().getFullYear() - yr >= 15) tags.push("Long-term Owner");
  }
  if (abs && ot === "Individual") tags.push("Absentee Owner");
  if (ot !== "Individual") tags.push(`${ot} Owned`);

  const lotAcres = Number(r.LOT_SIZE) || 0;

  return {
    id:             r.LOC_ID ?? `${addrNum}-${r.FULL_STR ?? ""}`,
    address,
    city:           r.CITY  ?? "North Adams",
    state:          "MA",
    zip:            r.ZIP   ?? "01247",
    propertyType:   pt,
    beds:           0,  // not in MassGIS L3 data
    baths:          0,  // not in MassGIS L3 data
    sqft:           Number(r.BLD_AREA) || Number(r.RES_AREA) || 0,
    yearBuilt:      Number(r.YEAR_BUILT) || 0,
    estimatedValue: totalVal > 0 ? "$" + totalVal.toLocaleString("en-US") : "N/A",
    equity:         equity  > 0 ? "$" + equity.toLocaleString("en-US")   : "N/A",
    equityLevel:    equityPct >= 30 ? "high" : equityPct >= 15 ? "medium" : "low",
    equityPercent:  equityPct,
    ownerName:      r.OWNER1   ?? "",
    ownerType:      ot,
    ownerMailingLine1: r.OWN_ADDR  ?? undefined,
    ownerMailingCity:  r.OWN_CITY  ?? undefined,
    ownerMailingState: r.OWN_STATE ?? undefined,
    ownerMailingZip:   r.OWN_ZIP   ?? undefined,
    isHomestead:    !abs,
    lastSaleDate:   saleDate,
    lastSalePrice:  lsPrice > 0 ? "$" + lsPrice.toLocaleString("en-US") : "N/A",
    openMortgage:   "N/A",
    lotArea:        lotAcres > 0 ? Math.round(lotAcres * 43560) : undefined,
    totalRooms:     r.NUM_ROOMS ?? undefined,
    tags:           tags.filter((t, i, a) => a.indexOf(t) === i).slice(0, 3),
  };
}

// ── Query builder ─────────────────────────────────────────────────────────────

export interface NAQueryParams {
  streetName?:  string;          // normalized FULL_STR prefix (e.g. "BEAVER ST")
  streetNum?:   string;          // leading address number (e.g. "82")
  absentee?:    boolean;
  minVal?:      number;
  maxVal?:      number;
  minYears?:    number;          // cutoff: LS_DATE <= (now - minYears years)
  types?:       string[];        // "single" | "multi" | "lot"
}

export function buildNAWhere(p: NAQueryParams): string {
  const conds: string[] = [`TOWN_ID=${NA_TOWN_ID}`];

  if (p.streetName) {
    const safe = p.streetName.replace(/'/g, "''");
    conds.push(`FULL_STR LIKE '${safe}%'`);
  }
  if (p.streetNum) {
    const safe = p.streetNum.replace(/'/g, "''");
    conds.push(`ADDR_NUM = '${safe}'`);
  }

  if (p.absentee) {
    conds.push(`OWN_CITY IS NOT NULL`);
    conds.push(`(OWN_CITY <> 'NORTH ADAMS' OR OWN_STATE <> 'MA')`);
  }

  if (p.minVal && p.minVal > 0) conds.push(`TOTAL_VAL >= ${p.minVal}`);
  if (p.maxVal && p.maxVal > 0) conds.push(`TOTAL_VAL <= ${p.maxVal}`);

  if (p.minYears && p.minYears > 0) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - p.minYears);
    const ds =
      String(cutoff.getFullYear()) +
      String(cutoff.getMonth() + 1).padStart(2, "0") +
      String(cutoff.getDate()).padStart(2, "0");
    conds.push(`LS_DATE <= '${ds}'`);
  }

  if (p.types && p.types.length > 0 && p.types.length < 3) {
    const codes: string[] = [];
    if (p.types.includes("single"))
      codes.push("'101'","'102'","'103'","'100'");
    if (p.types.includes("multi"))
      codes.push("'104'","'105'","'106'","'107'","'108'",
                 "'109'","'111'","'112'","'113'","'121'");
    if (p.types.includes("lot"))
      codes.push("'130'","'131'","'132'","'133'","'134'",
                 "'135'","'136'","'137'","'138'","'139'");
    if (codes.length > 0) conds.push(`USE_CODE IN (${codes.join(",")})`);
  }

  return conds.join(" AND ");
}

// ── Paginated query ───────────────────────────────────────────────────────────

export async function queryNA(
  where: string,
  offset: number,
  limit: number
): Promise<{ records: MassGisRecord[]; total: number }> {
  const pageParams = new URLSearchParams({
    where,
    outFields:         OUTFIELDS,
    resultRecordCount: String(limit),
    resultOffset:      String(offset),
    orderByFields:     "FULL_STR,ADDR_NUM",
    f:                 "json",
  });
  const countParams = new URLSearchParams({
    where,
    returnCountOnly: "true",
    f:               "json",
  });

  const [pageRes, countRes] = await Promise.all([
    fetch(`${MASSGIS}/query?${pageParams}`,  { signal: AbortSignal.timeout(15_000) }),
    fetch(`${MASSGIS}/query?${countParams}`, { signal: AbortSignal.timeout(10_000) }),
  ]);

  if (!pageRes.ok) return { records: [], total: 0 };

  const [pageData, countData] = await Promise.all([
    pageRes.json() as Promise<{ features?: { attributes: Record<string, unknown> }[] }>,
    countRes.ok ? (countRes.json() as Promise<{ count?: number }>) : Promise.resolve(null),
  ]);

  const records = (pageData.features ?? []).map(
    (f) => f.attributes as MassGisRecord
  );
  const total = countData?.count ?? records.length;

  return { records, total };
}

// ── Legacy helpers (used by PropertyDetailModal phone-lookup enrichment) ──────

export interface MassGisParcel {
  addrNum:  string;
  fullStr:  string;
  siteAddr: string;
  owner1:   string;
  ownAddr:  string;
  ownCity:  string;
  ownState: string;
  ownZip:   string;
}

export function buildAddrMap(parcels: MassGisParcel[]): Map<number, MassGisParcel> {
  const map = new Map<number, MassGisParcel>();
  for (const p of parcels) {
    const n = parseInt(p.addrNum);
    if (!isNaN(n) && !map.has(n)) map.set(n, p);
  }
  return map;
}

export async function queryNAStreet(streetName: string): Promise<MassGisParcel[]> {
  const safe   = streetName.replace(/'/g, "''");
  const params = new URLSearchParams({
    where:             `TOWN_ID=${NA_TOWN_ID} AND FULL_STR LIKE '${safe}%'`,
    outFields:         "ADDR_NUM,FULL_STR,SITE_ADDR,OWNER1,OWN_ADDR,OWN_CITY,OWN_STATE,OWN_ZIP",
    resultRecordCount: "1000",
    f:                 "json",
  });
  try {
    const res = await fetch(`${MASSGIS}/query?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: { attributes: Record<string, string | number | null> }[];
    };
    return (data.features ?? []).map((f) => ({
      addrNum:  String(f.attributes.ADDR_NUM  ?? ""),
      fullStr:  String(f.attributes.FULL_STR  ?? ""),
      siteAddr: String(f.attributes.SITE_ADDR ?? ""),
      owner1:   String(f.attributes.OWNER1    ?? ""),
      ownAddr:  String(f.attributes.OWN_ADDR  ?? ""),
      ownCity:  String(f.attributes.OWN_CITY  ?? ""),
      ownState: String(f.attributes.OWN_STATE ?? ""),
      ownZip:   String(f.attributes.OWN_ZIP   ?? ""),
    }));
  } catch {
    return [];
  }
}
