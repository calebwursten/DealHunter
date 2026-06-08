export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  buildNAWhere,
  massGisToProperty,
  queryNA,
  NAQueryParams,
} from "@/lib/massgis";

// Normalize street-name tokens to match MassGIS conventions:
// "Avenue" → "AV"  (MassGIS uses AV, not AVE)
// "Street" → "ST", "Drive" → "DR", etc.
function normalizeStreetName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\bSTREETS?\b/g,    "ST")
    .replace(/\bAVENUES?\b/g,    "AV")
    .replace(/\bAVE\b/g,         "AV")
    .replace(/\bDRIVES?\b/g,     "DR")
    .replace(/\bROADS?\b/g,      "RD")
    .replace(/\bBOULEVARDS?\b/g, "BLVD")
    .replace(/\bLANES?\b/g,      "LN")
    .replace(/\bCOURTS?\b/g,     "CT")
    .replace(/\bPLACES?\b/g,     "PL")
    .replace(/\bCIRCLES?\b/g,    "CIR")
    .replace(/\bTERRACES?\b/g,   "TER")
    .replace(/\s+/g, " ")
    .trim();
}

// Strip city/state/zip noise so "North Adams, MA 01247" → "" (all-properties query)
function stripTownContext(raw: string): string {
  return raw
    .replace(/,?\s*north\s+adams/gi, "")
    .replace(/,?\s*ma\b/gi,    "")
    .replace(/\b01247\b/g,     "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const raw        = (req.nextUrl.searchParams.get("q")         ?? "").trim();
  const limit      = Math.min(parseInt(req.nextUrl.searchParams.get("limit")   ?? "25"), 500);
  const offset     = Math.max(parseInt(req.nextUrl.searchParams.get("offset")  ?? "0"),  0);
  const typesRaw   =           req.nextUrl.searchParams.get("types")    ?? "";
  const valFilter  =           req.nextUrl.searchParams.get("valFilter") ?? "";
  const minYears   = parseInt( req.nextUrl.searchParams.get("minYears") ?? "0") || 0;
  const absenteeOnly = req.nextUrl.searchParams.get("absentee") === "true";

  // Parse value filter "min-max" or "min-"
  let minVal = 0, maxVal = 0;
  if (valFilter) {
    const dash = valFilter.indexOf("-");
    if (dash >= 0) {
      minVal = parseInt(valFilter.slice(0, dash)) || 0;
      maxVal = parseInt(valFilter.slice(dash + 1)) || 0;
    }
  }

  // Strip city/state/zip tokens → determine if this is a town-level or street-level query
  const stripped = stripTownContext(raw);

  // Parse: "82-84 Beaver St" → num="82", street="BEAVER ST"
  //        "Beaver St"       → num=undefined, street="BEAVER ST"
  //        "" or "North Adams" → num=undefined, street=undefined (all-properties)
  let streetName: string | undefined;
  let streetNum:  string | undefined;

  if (stripped) {
    const numStrMatch = stripped.match(/^(\d[\d\-]*)\s+(.+)/);
    if (numStrMatch) {
      streetNum  = String(parseInt(numStrMatch[1])); // leading digits only → "82"
      streetName = normalizeStreetName(numStrMatch[2]);
    } else {
      streetName = normalizeStreetName(stripped);
    }
  }

  const types = typesRaw.split(",").filter(Boolean) as string[];

  const params: NAQueryParams = {
    streetName,
    streetNum,
    absentee:  absenteeOnly,
    minVal:    minVal  > 0 ? minVal  : undefined,
    maxVal:    maxVal  > 0 ? maxVal  : undefined,
    minYears:  minYears > 0 ? minYears : undefined,
    types:     types.length > 0 && types.length < 3 ? types : undefined,
  };

  const where = buildNAWhere(params);
  const { records, total } = await queryNA(where, offset, limit);

  const properties = records.map(massGisToProperty);

  return Response.json({ records: properties, total });
}
