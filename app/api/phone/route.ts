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

  // Always-returned debug envelope — check in DevTools > Network > Response
  const debug: Record<string, unknown> = {
    parid, ownerName, ownerType, address, city, state, zip, step: "",
  };

  // ── 1. DB cache — only use if phones were previously found ───────────────
  // (empty-array entries from old code are now treated as cache misses)
  if (parid) {
    const cached = await getCachedPhone(parid);
    if (cached !== null && cached.length > 0) {
      debug.step = "cache_hit";
      return Response.json({ phones: cached, lookupUrl, cached: true, debug });
    }
  }

  // ── 2. Require API key ────────────────────────────────────────────────────
  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) {
    debug.step = "no_api_key";
    return Response.json({
      phones: [],
      lookupUrl,
      error: "PDL_API_KEY not set — add it in Vercel environment variables",
      debug,
    });
  }

  // ── 3. PDL is individual-only — skip entities ─────────────────────────────
  if (ownerType !== "Individual") {
    debug.step = `skipped_non_individual:${ownerType}`;
    return Response.json({ phones: [], lookupUrl, debug });
  }

  // ── 4. PDL Person Enrichment ──────────────────────────────────────────────
  try {
    const location = [city, state, zip].filter(Boolean).join(" ");
    const pdlPayload = {
      name:            ownerName,
      street_address:  address,
      location,
      required:        "phone_numbers",
      min_likelihood:  5,
    };
    debug.pdlPayload = pdlPayload;

    const res = await fetch("https://api.peopledatalabs.com/v5/person/enrich", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key":    apiKey,
      },
      body: JSON.stringify(pdlPayload),
      signal: AbortSignal.timeout(10_000),
    });

    debug.pdlHttpStatus = res.status;

    // 404 = no match (not charged when required field missing) — don't cache
    if (res.status === 404) {
      debug.step = "pdl_no_match";
      return Response.json({ phones: [], lookupUrl, debug });
    }

    if (res.status === 402) {
      debug.step = "pdl_credits_exhausted";
      return Response.json({ phones: [], lookupUrl, error: "PDL credits exhausted", debug });
    }

    if (res.status === 401) {
      const txt = await res.text();
      debug.step = "pdl_unauthorized";
      debug.pdlError = txt;
      return Response.json({ phones: [], lookupUrl, error: "PDL API key rejected", debug });
    }

    if (!res.ok) {
      const txt = await res.text();
      debug.step = `pdl_error_${res.status}`;
      debug.pdlError = txt;
      console.error("PDL error", res.status, txt);
      return Response.json({ phones: [], lookupUrl, debug });
    }

    const data = await res.json();
    const raw: string[] = data.data?.phone_numbers ?? [];
    const phones = [...new Set(raw.map(fmt))].filter(Boolean);
    debug.step = `pdl_ok:${phones.length}_phones`;

    // Cache only positive results — negatives are free to re-query
    if (parid && phones.length > 0) storeCachedPhone(parid, phones).catch(() => {});

    return Response.json({ phones, lookupUrl, debug });
  } catch (e) {
    console.error("PDL fetch error:", e);
    debug.step = `exception:${String(e)}`;
    return Response.json({ phones: [], lookupUrl, debug });
  }
}
