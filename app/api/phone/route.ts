export const runtime = "nodejs";

import { getCachedPhone, storeCachedPhone } from "@/lib/db";

interface PhoneInput {
  parid:      string;
  address:    string;
  city:       string;
  state:      string;
  zip:        string;
  ownerName?: string;
  ownerType?: string;
}

// E.164 "+14125551234" or bare "4125551234" → "(412) 555-1234"
function fmt(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const digits = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function buildTpsUrl({ address, city, state, zip, ownerName, ownerType }: PhoneInput): string {
  const cs = [city, state, zip].filter(Boolean).join(" ");
  if (ownerType === "Individual" && ownerName) {
    return (
      "https://www.truepeoplesearch.com/results" +
      `?name=${encodeURIComponent(ownerName)}` +
      `&citystatezip=${encodeURIComponent(cs)}`
    );
  }
  return (
    "https://www.truepeoplesearch.com/resultaddress" +
    `?streetaddress=${encodeURIComponent(address)}` +
    `&citystatezip=${encodeURIComponent(cs)}`
  );
}

export async function POST(req: Request) {
  const body      = (await req.json()) as PhoneInput;
  const { parid, address, city, state, zip, ownerName, ownerType } = body;
  const lookupUrl = buildTpsUrl(body);

  // ── 1. DB cache — free, persistent across instances ──────────────────────
  if (parid) {
    const cached = await getCachedPhone(parid);
    if (cached !== null) {
      return Response.json({ phones: cached, lookupUrl, cached: true });
    }
  }

  // ── 2. PDL is individual-only — skip entities to save credits ────────────
  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) {
    return Response.json({
      phones: [],
      lookupUrl,
      error: "PDL_API_KEY not set — add it in Vercel environment variables",
    });
  }

  if (ownerType !== "Individual") {
    // Entities (LLC, Trust, Corp) aren't in PDL — go straight to fallback link
    return Response.json({ phones: [], lookupUrl });
  }

  // ── 3. PDL Person Enrichment ──────────────────────────────────────────────
  try {
    const location = [city, state, zip].filter(Boolean).join(" ");
    const res = await fetch("https://api.peopledatalabs.com/v5/person/enrich", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key":    apiKey,
      },
      body: JSON.stringify({
        name:           ownerName,
        street_address: address,
        location,
        // Only charge a credit when phone_numbers are actually present in the record
        required:        "phone_numbers",
        // 0–10 confidence threshold; 5 avoids low-confidence mismatches
        min_likelihood:  5,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    // 404 = no match or required field missing — not charged
    if (res.status === 404) {
      if (parid) storeCachedPhone(parid, []).catch(() => {});
      return Response.json({ phones: [], lookupUrl });
    }

    if (res.status === 402) {
      return Response.json({ phones: [], lookupUrl, error: "PDL credits exhausted" });
    }

    if (!res.ok) {
      console.error("PDL error", res.status, await res.text());
      return Response.json({ phones: [], lookupUrl });
    }

    const data = await res.json();
    const raw: string[] = data.data?.phone_numbers ?? [];
    const phones = [...new Set(raw.map(fmt))].filter(Boolean);

    // Cache to DB (non-blocking)
    if (parid) storeCachedPhone(parid, phones).catch(() => {});

    return Response.json({ phones, lookupUrl });
  } catch (e) {
    console.error("PDL fetch error:", e);
    return Response.json({ phones: [], lookupUrl });
  }
}
