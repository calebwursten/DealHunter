import { Property } from "./types";

const BASE = "https://northadams.patriotproperties.com";

// ── HTML helpers ──────────────────────────────────────────────────────────────

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function splitBr(html: string): [string, string] {
  const parts = html.split(/<br\s*\/?>/i);
  return [stripTags(parts[0] ?? ""), stripTags(parts[1] ?? "")];
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatriotRecord {
  accountNumber: string;
  parcelId:      string;
  streetNumber:  string;
  streetName:    string;
  owner:         string;
  yearBuilt:     number;
  buildType:     string;
  totalValue:    number;
  beds:          number;
  baths:         number;
  lotAcres:      number;
  finSqft:       number;
  luc:           string;
  lucDesc:       string;
  neighborhood:  string;
  saleDate:      string;
  salePrice:     number;
  bookPage:      string;
}

// ── Page parser ───────────────────────────────────────────────────────────────

export function parsePatriotPage(html: string): {
  records: PatriotRecord[];
  totalPages: number;
} {
  const records: PatriotRecord[] = [];

  const pageMatch = html.match(/page\s+\d+\s+of\s+(\d+)/i);
  const totalPages = pageMatch ? parseInt(pageMatch[1]) : 1;

  const rowRegex = /<TR[^>]*>([\s\S]*?)<\/TR>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    if (!/<TD/i.test(rowHtml)) continue; // skip <TH> header rows

    const cellRegex = /<TD[^>]*>([\s\S]*?)<\/TD>/gi;
    const cells: string[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = cellRegex.exec(rowHtml)) !== null) cells.push(cm[1]);
    if (cells.length < 10) continue;

    // Col 0: Parcel ID (inside an <A> tag)
    const parcelId = stripTags(cells[0]).trim();
    if (!parcelId || parcelId.toLowerCase().startsWith("parcel")) continue;
    const acctMatch = cells[0].match(/AccountNumber=(\d+)/i);
    const accountNumber = acctMatch ? acctMatch[1] : "";

    // Col 1: Location "15 A ST" or " A ST"
    const loc = stripTags(cells[1]).trim();
    const locMatch = loc.match(/^([\d][\d\-]*)\s+(.+)/);
    const streetNumber = locMatch ? locMatch[1].trim() : "";
    const streetName   = locMatch ? locMatch[2].trim() : loc;

    // Col 2: Owner
    const owner = stripTags(cells[2]).trim();

    // Col 3: YearBuilt <BR> BuildType
    const [builtStr, buildType] = splitBr(cells[3]);
    const yearBuilt = parseInt(builtStr) || 0;

    // Col 4: Total value "$217,300"
    const totalValue = parseInt(stripTags(cells[4]).replace(/[$,]/g, "")) || 0;

    // Col 5: Beds <BR> Baths
    const [bedsStr, bathsStr] = splitBr(cells[5]);
    const beds  = parseInt(bedsStr)    || 0;
    const baths = parseFloat(bathsStr) || 0;

    // Col 6: LotAcres <BR> FinSqft
    const [lotStr, finStr] = splitBr(cells[6]);
    const lotAcres = parseFloat(lotStr)                           || 0;
    const finSqft  = parseInt(finStr.replace(/,/g, ""))           || 0;

    // Col 7: LUC <BR> Description
    const [luc, lucDesc] = splitBr(cells[7]);

    // Col 8: Neighborhood
    const neighborhood = stripTags(cells[8]).trim();

    // Col 9: SaleDate <BR> SalePrice
    const [saleDateRaw, salePriceRaw] = splitBr(cells[9]);
    const saleDate  = saleDateRaw.replace(/\s+/g, "");
    const salePrice = parseInt(salePriceRaw.replace(/[$,]/g, "")) || 0;

    // Col 10: Book-Page (optional)
    const bookPage = cells[10] ? stripTags(cells[10]).trim() : "";

    records.push({
      accountNumber, parcelId,
      streetNumber, streetName,
      owner, yearBuilt,
      buildType: buildType || builtStr,
      totalValue, beds, baths,
      lotAcres, finSqft,
      luc, lucDesc, neighborhood,
      saleDate, salePrice, bookPage,
    });
  }

  return { records, totalPages };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function fetchNextPage(cookie: string, page: number): Promise<string> {
  try {
    const res = await fetch(`${BASE}/SearchResults.asp?page=${page}`, {
      headers: { Cookie: cookie, Referer: `${BASE}/SearchResults.asp` },
      signal:  AbortSignal.timeout(12_000),
    });
    return res.ok ? res.text() : "";
  } catch { return ""; }
}

// ── Public search ─────────────────────────────────────────────────────────────

export interface PatriotSearchParams {
  streetName?:   string;
  streetNumber?: string;
  owner?:        string;
  parcel?:       string;
  minValue?:     number;
  maxValue?:     number;
  minBaths?:     number;
}

export async function searchPatriot(
  params: PatriotSearchParams
): Promise<PatriotRecord[]> {
  const body = new URLSearchParams({
    SearchParcel:         params.parcel        ?? "",
    SearchOwner:          params.owner         ?? "",
    SearchStreetNumber:   params.streetNumber  ?? "",
    SearchStreetName:     params.streetName    ?? "",
    SearchTotalValue:     params.minValue  ? String(params.minValue)  : "",
    SearchTotalValueThru: params.maxValue  ? String(params.maxValue)  : "",
    SearchBathrooms:      params.minBaths  ? String(params.minBaths)  : "",
    SearchSubmitted:      "1",
    cmdGo:                "Search",
  });

  let res: Response;
  try {
    res = await fetch(`${BASE}/SearchResults.asp`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${BASE}/search-middle-ns.asp`,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch { return []; }

  if (!res.ok) return [];

  // Grab session cookie for pagination
  const rawCookie   = res.headers.get("set-cookie") ?? "";
  const sessionCookie = (rawCookie.split(";")[0] ?? "").trim();

  const html = await res.text();
  const { records, totalPages } = parsePatriotPage(html);

  // Fetch subsequent pages (cap at 10 = ~500 results per search)
  const maxPage = Math.min(totalPages, 10);
  for (let p = 2; p <= maxPage; p++) {
    const pHtml = await fetchNextPage(sessionCookie, p);
    if (!pHtml) break;
    const { records: more } = parsePatriotPage(pHtml);
    records.push(...more);
  }

  return records;
}

// ── Property mapper ───────────────────────────────────────────────────────────

function ownerType(owner: string): Property["ownerType"] {
  const o = owner.toUpperCase();
  if (/LLC|LTD|LP|LIMITED|PARTNER/.test(o)) return "LLC";
  if (/CORP|INC|COMPAN/.test(o))                       return "Corporate";
  if (/TRUST|TRUSTEE/.test(o))                           return "Trust";
  return "Individual";
}

function propertyType(buildType: string, luc: string): Property["propertyType"] {
  const b = (buildType ?? "").toUpperCase();
  const l = parseInt(luc) || 0;
  if (/VACANT|UNDEV/.test(b) || (l >= 130 && l <= 139))            return "Lot";
  if (/CONDO/.test(b))                                              return "Condo";
  if (/TWO FAM|THREE FAM|MULTI|DUPLEX|TRIPLEX|APARTMENT/.test(b) ||
      (l >= 104 && l <= 112))                                        return "Multi-Family";
  if (/COMM|STORE|OFFICE|SHOP|BANK|REST|FAST FOOD|NIGHT|FUNCTION|WAREHOUSE|INDUSTRIAL|HOTEL|MOTEL/.test(b) ||
      (l >= 300 && l <= 399))                                        return "Commercial";
  return "Single Family";
}

function fmt(n: number): string {
  return n > 0 ? "$" + n.toLocaleString("en-US") : "N/A";
}

function saleYear(saleDate: string): number {
  if (!saleDate) return 0;
  const parts = saleDate.split("/");
  const y = parseInt(parts[parts.length - 1] ?? "0");
  return y < 100 ? y + 2000 : y;
}

export function patriotToProperty(rec: PatriotRecord): Property {
  const equity    = rec.salePrice > 0 ? Math.max(0, rec.totalValue - rec.salePrice) : 0;
  const equityPct = rec.totalValue > 0 && rec.salePrice > 0
    ? Math.round((equity / rec.totalValue) * 100) : 0;

  const address = [rec.streetNumber, rec.streetName].filter(Boolean).join(" ").trim();
  const ot      = ownerType(rec.owner);
  const pt      = propertyType(rec.buildType, rec.luc);

  const tags: string[] = [];
  if (equityPct >= 30) tags.push("High Equity");
  const sy = saleYear(rec.saleDate);
  if (sy > 0 && new Date().getFullYear() - sy >= 15) tags.push("Long-term Owner");
  if (ot !== "Individual") tags.push(ot + " Owned");

  return {
    id:             rec.parcelId,
    address,
    city:           "North Adams",
    state:          "MA",
    zip:            "01247",
    propertyType:   pt,
    beds:           rec.beds,
    baths:          rec.baths,
    sqft:           rec.finSqft,
    yearBuilt:      rec.yearBuilt,
    estimatedValue: fmt(rec.totalValue),
    equity:         fmt(equity),
    equityLevel:    equityPct >= 30 ? "high" : equityPct >= 15 ? "medium" : "low",
    equityPercent:  equityPct,
    ownerName:      rec.owner,
    ownerType:      ot,
    ownerMailingLine1:  undefined,
    ownerMailingLine2:  undefined,
    ownerMailingCity:   undefined,
    ownerMailingState:  undefined,
    ownerMailingZip:    undefined,
    isHomestead:    false,
    neighborhood:   rec.neighborhood || undefined,
    lastSaleDate:   rec.saleDate || "Unknown",
    lastSalePrice:  fmt(rec.salePrice),
    prevSaleDate:   undefined,
    prevSalePrice:  undefined,
    openMortgage:   "N/A",
    lotArea:        rec.lotAcres > 0 ? Math.round(rec.lotAcres * 43560) : undefined,
    condition:      undefined,
    exteriorFinish: undefined,
    totalRooms:     undefined,
    tags:           tags.slice(0, 3),
  };
}
