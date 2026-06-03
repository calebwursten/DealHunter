import { Property } from "./types";

const CKAN_BASE = "https://data.wprdc.org/api/3/action";
export const ASSESSMENT_RESOURCE_ID = "65855e14-549e-4992-b5be-d629afc676fa";

export interface WPRDCRecord {
  _id: number;
  PARID: string;
  PROPERTYHOUSENUM: string;
  PROPERTYFRACTION: string;
  PROPERTYADDRESS: string;
  PROPERTYCITY: string;
  PROPERTYSTATE: string;
  PROPERTYUNIT: string;
  PROPERTYZIP: string;
  MUNIDESC: string;
  SCHOOLDESC: string;
  NEIGHDESC: string;
  TAXDESC: string;
  USECODE: string;
  USEDESC: string;
  OWNERCODE: string;
  OWNERDESC: string;
  CLASSDESC: string;
  LOTAREA: number | null;
  HOMESTEADFLAG: string | null;
  SALEDATE: string | null;
  SALEPRICE: number | null;
  PREVSALEDATE: string | null;
  PREVSALEPRICE: number | null;
  COUNTYTOTAL: number | null;
  FAIRMARKETTOTAL: number | null;
  FAIRMARKETBUILDING: number | null;
  FAIRMARKETLAND: number | null;
  YEARBLT: number | null;
  BEDROOMS: number | null;
  FULLBATHS: number | null;
  HALFBATHS: number | null;
  FINISHEDLIVINGAREA: number | null;
  TOTALROOMS: number | null;
  STYLEDESC: string | null;
  CONDITIONDESC: string | null;
  EXTFINISH_DESC: string | null;
  CHANGENOTICEADDRESS1: string | null;
  CHANGENOTICEADDRESS2: string | null;
  CHANGENOTICEADDRESS3: string | null;
  CHANGENOTICEADDRESS4: string | null;
  TAXYEAR: number | null;
}

export interface WPRDCSearchResult {
  records: WPRDCRecord[];
  total: number;
}

function fmt(n: number | null): string {
  if (!n) return "N/A";
  return "$" + n.toLocaleString("en-US");
}

function mapPropertyType(usedesc: string): Property["propertyType"] {
  const u = (usedesc ?? "").toUpperCase();
  if (u.includes("CONDO")) return "Condo";
  if (u.includes("TWO FAMILY") || u.includes("MULTI") || u.includes("APARTMENT") || u.includes("TRIPLEX") || u.includes("FOUR")) return "Multi-Family";
  if (u.includes("COMMERCIAL") || u.includes("OFFICE") || u.includes("STORE") || u.includes("INDUSTRIAL")) return "Commercial";
  return "Single Family";
}

function mapOwnerType(ownerdesc: string): Property["ownerType"] {
  const o = (ownerdesc ?? "").toUpperCase();
  if (o.includes("TRUST")) return "Trust";
  if (o.includes("CORP") || o.includes("INC") || o.includes("LTD")) return "Corporate";
  if (o.includes("LLC") || o.includes("LP") || o.includes("PARTNER")) return "LLC";
  return "Individual";
}

function generateTags(rec: WPRDCRecord, equityPct: number): string[] {
  const tags: string[] = [];
  if (equityPct >= 30) tags.push("High Equity");
  if (rec.HOMESTEADFLAG) tags.push("Owner-Occupied");
  const saleYear = rec.SALEDATE ? parseInt(rec.SALEDATE.split("-").pop() ?? "0") : 0;
  if (saleYear > 0 && new Date().getFullYear() - saleYear >= 15) tags.push("Long-term Owner");
  if (rec.OWNERDESC !== "REGULAR") tags.push(rec.OWNERDESC.charAt(0) + rec.OWNERDESC.slice(1).toLowerCase() + " Owned");
  if (rec.TAXDESC?.includes("Exempt")) tags.push("Tax Exempt");
  return tags.slice(0, 3);
}

// Parse "PITTSBURGH PA  " → { city: "Pittsburgh", state: "PA" }
function parseCityState(raw: string | null): { city: string; state: string } {
  if (!raw) return { city: "", state: "" };
  const parts = raw.trim().split(/\s+/);
  const state = parts.length >= 2 ? parts[parts.length - 1] : "";
  const city = parts.slice(0, -1).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(" ");
  return { city, state };
}

export function wprdcToProperty(rec: WPRDCRecord): Property {
  const fairMarket = rec.FAIRMARKETTOTAL ?? 0;
  const lastSale = rec.SALEPRICE ?? 0;
  const equity = Math.max(0, fairMarket - lastSale);
  const equityPct = fairMarket > 0 ? Math.round((equity / fairMarket) * 100) : 0;

  const ownerRaw = (rec.CHANGENOTICEADDRESS1 ?? "").trim();
  const ownerName = ownerRaw || rec.OWNERDESC;

  const address = [rec.PROPERTYHOUSENUM, rec.PROPERTYFRACTION?.trim(), rec.PROPERTYADDRESS]
    .filter(Boolean).join(" ").trim();

  const { city: mailCity, state: mailState } = parseCityState(rec.CHANGENOTICEADDRESS3);

  return {
    id: rec.PARID,
    address,
    city: rec.PROPERTYCITY ?? "Pittsburgh",
    state: rec.PROPERTYSTATE ?? "PA",
    zip: rec.PROPERTYZIP ?? "",
    propertyType: mapPropertyType(rec.USEDESC ?? ""),
    beds: rec.BEDROOMS ?? 0,
    baths: rec.FULLBATHS ?? 0,
    sqft: rec.FINISHEDLIVINGAREA ?? 0,
    yearBuilt: rec.YEARBLT ?? 0,
    estimatedValue: fmt(fairMarket),
    equity: fmt(equity),
    equityLevel: equityPct >= 30 ? "high" : equityPct >= 15 ? "medium" : "low",
    equityPercent: equityPct,
    ownerName,
    ownerType: mapOwnerType(rec.OWNERDESC ?? ""),
    ownerMailingLine1: (rec.CHANGENOTICEADDRESS1 ?? "").trim() || undefined,
    ownerMailingLine2: (rec.CHANGENOTICEADDRESS2 ?? "").trim() || undefined,
    ownerMailingCity: mailCity || undefined,
    ownerMailingState: mailState || undefined,
    ownerMailingZip: (rec.CHANGENOTICEADDRESS4 ?? "").trim() || undefined,
    isHomestead: rec.HOMESTEADFLAG === "HOM",
    neighborhood: rec.NEIGHDESC ?? undefined,
    lastSaleDate: rec.SALEDATE ?? "Unknown",
    lastSalePrice: fmt(lastSale),
    prevSaleDate: rec.PREVSALEDATE ?? undefined,
    prevSalePrice: rec.PREVSALEPRICE ? fmt(rec.PREVSALEPRICE) : undefined,
    openMortgage: "N/A",
    lotArea: rec.LOTAREA ?? undefined,
    condition: rec.CONDITIONDESC ?? undefined,
    exteriorFinish: rec.EXTFINISH_DESC ?? undefined,
    totalRooms: rec.TOTALROOMS ?? undefined,
    tags: generateTags(rec, equityPct),
  };
}

export async function searchWPRDC(
  query: string,
  limit = 20
): Promise<WPRDCSearchResult> {
  const params = new URLSearchParams({
    resource_id: ASSESSMENT_RESOURCE_ID,
    q: query,
    limit: String(limit),
  });
  const res = await fetch(`${CKAN_BASE}/datastore_search?${params}`, {
    next: { revalidate: 300 },
  });
  const json = await res.json();
  return {
    records: json.result?.records ?? [],
    total: json.result?.total ?? 0,
  };
}

export async function getParcelDetails(parcelId: string) {
  const res = await fetch(
    `https://tools.wprdc.org/property-api/v0/parcels/${parcelId}`,
    { next: { revalidate: 300 } }
  );
  const json = await res.json();
  return json.results?.[0] ?? null;
}
