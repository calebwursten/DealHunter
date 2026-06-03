import { NextRequest } from "next/server";

interface AddrInput {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}
interface GeoResult {
  id: string;
  lat: number;
  lng: number;
}

// ── Census batch geocoder ─────────────────────────────────────────────────────
async function censusBatch(props: AddrInput[]): Promise<GeoResult[]> {
  // CSV: index,"street","city","state","zip"
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

  const results: GeoResult[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    // Parse quoted CSV: id,"input",Match|No_Match,type,"matched","lon,lat",...
    const parts = splitQuotedCSV(line);
    if (parts[2] !== "Match") continue;
    const idx = parseInt(parts[0], 10);
    const coordField = parts[5] ?? "";
    const [lonStr, latStr] = coordField.split(",");
    const lat = parseFloat(latStr), lng = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lng) && idx >= 0 && idx < props.length) {
      results.push({ id: props[idx].id, lat, lng });
    }
  }
  return results;
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

// ── Nominatim fallback (OSM — better Pittsburgh coverage) ─────────────────────
async function nominatimOne(p: AddrInput): Promise<GeoResult | null> {
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
    if (data[0]) return { id: p.id, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* silent */ }
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { properties } = (await req.json()) as { properties: AddrInput[] };
  const props = properties.slice(0, 24);

  // 1. Census batch (fast, single request)
  let matched: GeoResult[] = [];
  try {
    matched = await censusBatch(props);
  } catch { /* fall through to Nominatim-only */ }

  const matchedIds = new Set(matched.map((r) => r.id));
  const unmatched = props.filter((p) => !matchedIds.has(p.id));

  // 2. Nominatim fallback for anything Census missed (sequential, ~350ms/req)
  for (const p of unmatched) {
    const result = await nominatimOne(p);
    if (result) matched.push(result);
    await sleep(350); // Nominatim fair-use: ~3 req/s
  }

  return Response.json(matched);
}
