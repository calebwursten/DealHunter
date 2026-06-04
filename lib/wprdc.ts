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
  MUNICODE: string;
  MUNIDESC: string;
  SCHOOLCODE: string;
  SCHOOLDESC: string;
  NEIGHCODE: string;
  NEIGHDESC: string;
  TAXCODE: string;
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

// ── Neighborhood resolution ───────────────────────────────────────────────────

// Pittsburgh ZIP → primary neighborhood name
const ZIP_NEIGHBORHOOD: Record<string, string> = {
  "15201": "Lawrenceville",
  "15202": "Ben Avon",
  "15203": "South Side",
  "15204": "Elliott",
  "15205": "Crafton Heights",
  "15206": "East Liberty",
  "15207": "Hazelwood",
  "15208": "Point Breeze",
  "15209": "Millvale",
  "15210": "Knoxville",
  "15211": "Mt. Washington",
  "15212": "North Side",
  "15213": "Oakland",
  "15214": "Perry Hilltop",
  "15215": "Sharpsburg",
  "15216": "Beechview",
  "15217": "Squirrel Hill",
  "15218": "Edgewood",
  "15219": "Hill District",
  "15220": "Crafton",
  "15221": "Wilkinsburg",
  "15222": "Downtown",
  "15223": "Sharpsburg",
  "15224": "Garfield",
  "15225": "Neville Island",
  "15226": "Brookline",
  "15227": "Baldwin",
  "15228": "Mt. Lebanon",
  "15229": "Ross Township",
  "15232": "Shadyside",
  "15233": "Manchester",
  "15234": "Castle Shannon",
  "15235": "Penn Hills",
  "15236": "South Hills",
  "15237": "North Hills",
  "15238": "Fox Chapel",
  "15239": "Plum",
  "15241": "Upper St. Clair",
  "15243": "Scott Township",
};

// Words that signal a building/condo complex name rather than a neighbourhood
const BUILDING_RE =
  /\b(tower|loft|plaza|manor|court|gardens?|complex|building|bldg|pre-?war|post-?war|muni\s*\d|hoose|atrium|piatt|regency|carlyle|townhouse|highwood|saybrook|niagara|dithridge|bellefield|beacon|trimont|marmont|holde|neville)\b/i;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(?:^|[\s\-/])\w/g, (c) => c.toUpperCase())
    .replace(/\bMt\b/g, "Mt.")
    .trim();
}

/** Return a human-readable neighbourhood name for a WPRDC record. */
function resolveNeighborhood(rec: WPRDCRecord): string | undefined {
  const neigh = (rec.NEIGHDESC ?? "").trim();
  const muni  = (rec.MUNIDESC  ?? "").trim();
  const zip   = (rec.PROPERTYZIP ?? "").trim().substring(0, 5);
  const city  = (rec.PROPERTYCITY ?? "").toUpperCase().trim();

  // ── 1. "WARD XX - NEIGHBORHOOD NAME" pattern ──────────────────────────────
  const wardMatch = neigh.match(/^WARD\s+\d+\s*-\s*(.+)$/i);
  if (wardMatch) {
    const name = wardMatch[1]
      .split(/[/]/)[0]          // "NORTH SHORE/ALLEGHENY" → "NORTH SHORE"
      .replace(/-\s*CITY VIEW$/i, "")  // "SPRING HILL-CITY VIEW" → "SPRING HILL"
      .trim();
    if (name && !/^WARD\s+\d+/i.test(name)) return titleCase(name);
  }

  // ── 2. Plain NEIGHDESC if it's a real name ─────────────────────────────────
  const isNumeric   = /^\d+$/.test(neigh);
  const isAlphaCode = /^[A-Z0-9]{4,}$/i.test(neigh) && /\d/.test(neigh); // e.g. "51C21A"
  const isGeneric   = /^(PITTSBURGH URBAN|SUBURBAN\s*\()/i.test(neigh);
  const isBuilding  = BUILDING_RE.test(neigh);
  const hasDigit    = /\d/.test(neigh) && !wardMatch;

  if (neigh && !isNumeric && !isAlphaCode && !isGeneric && !isBuilding && !hasDigit) {
    // Strip " OF PITTSBURGH" suffix ("BLUFF DISTRICT OF PITTSBURGH" → "Bluff District")
    const cleaned = neigh.replace(/\s+OF\s+PITTSBURGH$/i, "").trim();
    if (cleaned.length > 2) return titleCase(cleaned);
  }

  // ── 3. ZIP lookup for Pittsburgh proper ───────────────────────────────────
  if (city === "PITTSBURGH" && ZIP_NEIGHBORHOOD[zip]) {
    return ZIP_NEIGHBORHOOD[zip];
  }

  // ── 4. MUNIDESC cleanup for suburbs/boroughs ──────────────────────────────
  if (muni && !muni.toUpperCase().includes("PITTSBURGH")) {
    // "MOUNT LEBANON TOWNSHIP" → "Mount Lebanon"
    // "PLUM BOROUGH" → "Plum"
    const stripped = muni
      .replace(/\s+(TOWNSHIP|BOROUGH|CITY|COUNTY|WARD\s*\d*)$/i, "")
      .trim();
    if (stripped.length > 1) return titleCase(stripped);
  }

  return undefined;
}

// ── Property mapping ──────────────────────────────────────────────────────────

function fmt(n: number | null): string {
  if (!n) return "N/A";
  return "$" + n.toLocaleString("en-US");
}

function mapPropertyType(usedesc: string, classdesc = ""): Property["propertyType"] {
  const u = (usedesc ?? "").toUpperCase();
  const c = (classdesc ?? "").toUpperCase();
  // Vacant / land parcels — check before other categories
  if (u.includes("VACANT") || (u.includes("LAND") && !u.includes("HIGHLAND")))
    return "Lot";
  if (u.includes("CONDO")) return "Condo";
  if (
    u.includes("TWO FAMILY") ||
    u.includes("MULTI") ||
    u.includes("APARTMENT") ||
    u.includes("TRIPLEX") ||
    u.includes("FOUR FAMILY") ||
    u.includes("FIVE FAMILY") ||
    u.includes("SIX FAMILY")
  )
    return "Multi-Family";
  if (
    c.includes("COMMERCIAL") || c.includes("INDUSTRIAL") ||
    u.includes("COMMERCIAL") || u.includes("OFFICE") ||
    u.includes("STORE")       || u.includes("INDUSTRIAL")
  )
    return "Commercial";
  return "Single Family";
}

function mapOwnerType(ownerdesc: string): Property["ownerType"] {
  const o = (ownerdesc ?? "").toUpperCase();
  if (o.includes("TRUST")) return "Trust";
  if (o.includes("CORP") || o.includes("INC") || o.includes("LTD"))
    return "Corporate";
  if (o.includes("LLC") || o.includes("LP") || o.includes("PARTNER"))
    return "LLC";
  return "Individual";
}

function generateTags(rec: WPRDCRecord, equityPct: number): string[] {
  const tags: string[] = [];
  if (equityPct >= 30) tags.push("High Equity");
  if (rec.HOMESTEADFLAG) tags.push("Owner-Occupied");
  const saleYear = rec.SALEDATE
    ? parseInt(rec.SALEDATE.split("-").pop() ?? "0")
    : 0;
  if (saleYear > 0 && new Date().getFullYear() - saleYear >= 15)
    tags.push("Long-term Owner");
  if (rec.OWNERDESC !== "REGULAR")
    tags.push(
      rec.OWNERDESC.charAt(0) + rec.OWNERDESC.slice(1).toLowerCase() + " Owned"
    );
  if (rec.TAXDESC?.includes("Exempt")) tags.push("Tax Exempt");
  return tags.slice(0, 3);
}

// Parse "PITTSBURGH PA  " → { city: "Pittsburgh", state: "PA" }
function parseCityState(raw: string | null): { city: string; state: string } {
  if (!raw) return { city: "", state: "" };
  const parts = raw.trim().split(/\s+/);
  const state = parts.length >= 2 ? parts[parts.length - 1] : "";
  const city = parts
    .slice(0, -1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return { city, state };
}

export function wprdcToProperty(rec: WPRDCRecord): Property {
  const fairMarket = rec.FAIRMARKETTOTAL ?? 0;
  const lastSale   = rec.SALEPRICE ?? 0;
  const equity     = Math.max(0, fairMarket - lastSale);
  const equityPct  = fairMarket > 0 ? Math.round((equity / fairMarket) * 100) : 0;

  const ownerRaw = (rec.CHANGENOTICEADDRESS1 ?? "").trim();
  const ownerName = ownerRaw || rec.OWNERDESC;

  const address = [
    rec.PROPERTYHOUSENUM,
    rec.PROPERTYFRACTION?.trim(),
    rec.PROPERTYADDRESS,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const { city: mailCity, state: mailState } = parseCityState(
    rec.CHANGENOTICEADDRESS3
  );

  return {
    id:            rec.PARID,
    address,
    city:          rec.PROPERTYCITY ?? "Pittsburgh",
    state:         rec.PROPERTYSTATE ?? "PA",
    zip:           rec.PROPERTYZIP ?? "",
    propertyType:  mapPropertyType(rec.USEDESC ?? "", rec.CLASSDESC ?? ""),
    beds:          rec.BEDROOMS ?? 0,
    baths:         rec.FULLBATHS ?? 0,
    sqft:          rec.FINISHEDLIVINGAREA ?? 0,
    yearBuilt:     rec.YEARBLT ?? 0,
    estimatedValue: fmt(fairMarket),
    equity:        fmt(equity),
    equityLevel:   equityPct >= 30 ? "high" : equityPct >= 15 ? "medium" : "low",
    equityPercent: equityPct,
    ownerName,
    ownerType:     mapOwnerType(rec.OWNERDESC ?? ""),
    ownerMailingLine1: (rec.CHANGENOTICEADDRESS1 ?? "").trim() || undefined,
    ownerMailingLine2: (rec.CHANGENOTICEADDRESS2 ?? "").trim() || undefined,
    ownerMailingCity:  mailCity  || undefined,
    ownerMailingState: mailState || undefined,
    ownerMailingZip:   (rec.CHANGENOTICEADDRESS4 ?? "").trim() || undefined,
    isHomestead:   rec.HOMESTEADFLAG === "HOM",
    neighborhood:  resolveNeighborhood(rec),
    lastSaleDate:  rec.SALEDATE ?? "Unknown",
    lastSalePrice: fmt(lastSale),
    prevSaleDate:  rec.PREVSALEDATE ?? undefined,
    prevSalePrice: rec.PREVSALEPRICE ? fmt(rec.PREVSALEPRICE) : undefined,
    openMortgage:  "N/A",
    lotArea:       rec.LOTAREA ?? undefined,
    condition:     rec.CONDITIONDESC ?? undefined,
    exteriorFinish: rec.EXTFINISH_DESC ?? undefined,
    totalRooms:    rec.TOTALROOMS ?? undefined,
    tags:          generateTags(rec, equityPct),
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
