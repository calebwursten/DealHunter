import { NextRequest } from "next/server";
import { getCachedCoords, storeCachedCoords } from "@/lib/db";

interface AddrInput {
  id: string;   // = PARID
  address: string;
  city: string;
  state: string;
  zip: string;
}

// ── Census batch geocoder ─────────────────────────────────────────────────────
async function censusBatch(
  props: AddrInput[]
): Promise<Map<string, { lat: number; lng: number }>> {
  const csv = props
    .map((p, i) => `${i},"${p.address}","${p.city}","${p.state}","${p.zip}"`)
    .join("\n");

  const form = new FormData();
  form.append("addressFile", new Blob([csv], { type: "text/plain" }), "addr.csv");
  form.append("benchmark", "Public_AR_Current");

  const res = await fetch(
    "https://geocoding.geo.census.gov/geocoder/locations/addressbatch",
    { method: "POST", body: form, signal: AbortSignal.timeout(30_000) }
  );
  const text = await res.text();

  const out = new Map<string, { lat: number; lng: number }>();
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const parts = splitQuotedCSV(line);
    if (parts[2] !== "Match") continue;
    const idx = parseInt(parts[0], 10);
    const [lonStr, latStr] = (parts[5] ?? "").split(",");
    const lat = parseFloat(latStr), lng = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lng) && idx >= 0 && idx < props.length) {
      out.set(props[idx].id, { lat, lng });
    }
  }
  return out;
}

function splitQuotedCSV(line: string): string[] {
  const fields: string[] = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  fields.push(cur.trim());
  return fields;
}

// ── Nominatim fallback ────────────────────────────────────────────────────────
async function nominatimOne(
  p: AddrInput
): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({
      street: p.address,
      city: p.city,
      state: p.state,
      postalcode: p.zip,
      country: "us",
      format: "json",
      limit: "1",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { "User-Agent": "WurstenDeals/1.0 (caleb@wursten.co)" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    const data = await res.json();
    if (data[0])
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* silent */ }
  return null;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { properties } = (await req.json()) as { properties: AddrInput[] };
  const props = properties.slice(0, 24);
  const parids = props.map((p) => p.id);

  // 1. Check the database cache first
  const cached = await getCachedCoords(parids);
  const results: { id: string; lat: number; lng: number }[] = Object.values(
    cached
  ).map((r) => ({ id: r.parid, lat: r.lat, lng: r.lng }));

  const cachedIds = new Set(Object.keys(cached));
  const uncached = props.filter((p) => !cachedIds.has(p.id));

  if (uncached.length === 0) {
    return Response.json(results); // 100% cache hit — instant
  }

  // 2. Census batch for uncached addresses
  let censusMatched = new Map<string, { lat: number; lng: number }>();
  try {
    censusMatched = await censusBatch(uncached);
  } catch { /* fall through */ }

  const newEntries: { parid: string; lat: number; lng: number; address: string }[] = [];

  censusMatched.forEach((coord, id) => {
    results.push({ id, ...coord });
    const p = uncached.find((x) => x.id === id)!;
    newEntries.push({ parid: id, address: p.address, ...coord });
  });

  // 3. Nominatim fallback for anything Census missed
  const stillMissing = uncached.filter((p) => !censusMatched.has(p.id));
  for (const p of stillMissing) {
    const coord = await nominatimOne(p);
    if (coord) {
      results.push({ id: p.id, ...coord });
      newEntries.push({ parid: p.id, address: p.address, ...coord });
    }
    await sleep(350);
  }

  // 4. Persist newly geocoded results to database
  await storeCachedCoords(newEntries).catch(() => {}); // non-blocking failure ok

  return Response.json(results);
}
