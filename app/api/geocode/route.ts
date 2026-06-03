export const runtime = "edge";

import { getCachedCoords, storeCachedCoords } from "@/lib/db";

interface AddrInput {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

// ── Census batch ──────────────────────────────────────────────────────────────
async function censusBatch(props: AddrInput[]): Promise<Map<string, { lat: number; lng: number }>> {
  // Skip entries with no house number — Census can't match them
  const geocodable = props.filter((p) => /\d/.test(p.address));
  if (geocodable.length === 0) return new Map();

  const csv = geocodable
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
    const parts = splitCSV(line);
    if (parts[2] !== "Match") continue;
    const idx = parseInt(parts[0], 10);
    const [lonStr, latStr] = (parts[5] ?? "").split(",");
    const lat = parseFloat(latStr), lng = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lng) && idx >= 0 && idx < geocodable.length) {
      out.set(geocodable[idx].id, { lat, lng });
    }
  }
  return out;
}

function splitCSV(line: string): string[] {
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
async function nominatimOne(p: AddrInput): Promise<{ lat: number; lng: number } | null> {
  // Try structured query first, then a looser one-line query
  const attempts = [
    new URLSearchParams({ street: p.address, city: p.city, state: p.state, postalcode: p.zip, country: "us", format: "json", limit: "1" }),
    new URLSearchParams({ q: `${p.address}, ${p.city}, ${p.state}`, format: "json", limit: "1", countrycodes: "us" }),
  ];
  for (const params of attempts) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "User-Agent": "WurstenDeals/1.0 (caleb@wursten.co)" },
        signal: AbortSignal.timeout(6_000),
      });
      const data = await res.json() as { lat: string; lon: string }[];
      if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* try next */ }
  }
  return null;
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

// ── Streaming handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const { properties } = (await req.json()) as { properties: AddrInput[] };
  const props = properties.slice(0, 100);
  const parids = props.map((p) => p.id);
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (id: string, lat: number, lng: number) =>
        ctrl.enqueue(enc.encode(JSON.stringify({ id, lat, lng }) + "\n"));

      // 1 — DB cache (instant)
      const cached = await getCachedCoords(parids);
      for (const r of Object.values(cached)) send(r.parid, r.lat, r.lng);

      const cachedIds = new Set(Object.keys(cached));
      const uncached = props.filter((p) => !cachedIds.has(p.id));
      if (uncached.length === 0) { ctrl.close(); return; }

      // 2 — Census batch
      let censusMap = new Map<string, { lat: number; lng: number }>();
      try { censusMap = await censusBatch(uncached); } catch { /* continue */ }

      const toStore: { parid: string; lat: number; lng: number; address: string }[] = [];
      censusMap.forEach((c, id) => {
        send(id, c.lat, c.lng);
        toStore.push({ parid: id, lat: c.lat, lng: c.lng, address: uncached.find((p) => p.id === id)!.address });
      });
      await storeCachedCoords(toStore).catch(() => {});

      // 3 — Nominatim fallback for addresses Census missed
      const stillMissing = uncached.filter((p) => !censusMap.has(p.id));
      for (const p of stillMissing) {
        const c = await nominatimOne(p);
        if (c) {
          send(p.id, c.lat, c.lng);
          await storeCachedCoords([{ parid: p.id, lat: c.lat, lng: c.lng, address: p.address }]).catch(() => {});
        }
        await sleep(320);
      }

      ctrl.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
