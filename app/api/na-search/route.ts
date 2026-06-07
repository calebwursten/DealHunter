export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { searchPatriot, patriotToProperty, PatriotSearchParams } from "@/lib/patriot";

// Normalize street name suffixes to match Patriot Properties abbreviations
function normalizeStreetName(name: string): string {
  return name
    .replace(/\bSTREETS?\b/g,    "ST")
    .replace(/\bAVENUES?\b/g,    "AVE")
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

export async function GET(req: NextRequest) {
  const raw      = (req.nextUrl.searchParams.get("q")         ?? "").trim();
  const limit    = Math.min(parseInt(req.nextUrl.searchParams.get("limit")    ?? "25"), 500);
  const offset   = Math.max(parseInt(req.nextUrl.searchParams.get("offset")   ?? "0"),  0);
  const typesRaw =           req.nextUrl.searchParams.get("types")     ?? "";
  const valFilter=           req.nextUrl.searchParams.get("valFilter") ?? "";
  const minBaths = parseInt( req.nextUrl.searchParams.get("minBaths")  ?? "0") || 0;
  const minYears = parseInt( req.nextUrl.searchParams.get("minYears")  ?? "0") || 0;

  if (!raw) return Response.json({ records: [], total: 0 });

  // Parse value filter "min-max" or "min-"
  let minVal = 0, maxVal = 0;
  if (valFilter) {
    const dash = valFilter.indexOf("-");
    if (dash >= 0) {
      minVal = parseInt(valFilter.slice(0, dash)) || 0;
      maxVal = parseInt(valFilter.slice(dash + 1)) || 0;
    }
  }

  // Determine street number vs street name.
  // Handles plain numbers ("82 Beaver") and hyphenated ranges ("82-84 Beaver").
  const numStrMatch = raw.match(/^(\d[\d\-]*)\s+(.+)/);
  const rawStreetName = numStrMatch ? numStrMatch[2] : raw;
  const params: PatriotSearchParams = {
    streetNumber: numStrMatch ? numStrMatch[1]                               : undefined,
    streetName:   normalizeStreetName(rawStreetName.toUpperCase()),
    minValue:     minVal  > 0 ? minVal  : undefined,
    maxValue:     maxVal  > 0 ? maxVal  : undefined,
    minBaths:     minBaths > 0 ? minBaths : undefined,
  };

  const records = await searchPatriot(params);
  let properties = records.map(patriotToProperty);

  // Type filter (client-side since Patriot doesn't have an exact match)
  if (typesRaw) {
    const types = typesRaw.split(",").filter(Boolean);
    if (types.length > 0 && types.length < 3) {
      properties = properties.filter(p => {
        if (types.includes("single") && p.propertyType === "Single Family") return true;
        if (types.includes("multi")  && p.propertyType === "Multi-Family")  return true;
        if (types.includes("lot")    && p.propertyType === "Lot")           return true;
        return false;
      });
    }
  }

  // Years-since-sale filter
  if (minYears > 0) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - minYears);
    properties = properties.filter(p => {
      if (!p.lastSaleDate || p.lastSaleDate === "Unknown") return true; // unknown = potentially old
      const parts = p.lastSaleDate.split("/");
      if (parts.length < 3) return false;
      const yr = parseInt(parts[parts.length - 1]);
      const mo = parseInt(parts[0]);
      const d  = new Date(yr < 100 ? yr + 2000 : yr, mo - 1);
      return d <= cutoff;
    });
  }

  const total = properties.length;
  const page  = properties.slice(offset, offset + limit);

  return Response.json({ records: page, total });
}
