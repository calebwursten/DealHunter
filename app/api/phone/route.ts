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

// OWNERDESC fallback values that are NOT real names
const NON_NAME = new Set(["REGULAR", "FIDUCIARY", "GOVERNMENT", "EXEMPT", "OTHER", ""]);

export async function POST(req: Request) {
  const body      = (await req.json()) as PhoneInput;
  const { parid, address, city, state, zip, ownerName, ownerType } = body;
  const lookupUrl = buildTpsUrl(body);

  const debug: Record<string, unknown> = {
    parid, ownerName, ownerType, address, city, state, zip, step: "",
  };

  // ── 1. DB cache (positive hits only) ────────────────────────────────────────
  if (parid) {
    const cached = await getCachedPhone(parid);
    if (cached !== null && cached.length > 0) {
      debug.step = "cache_hit";
      return Response.json({ phones: cached, lookupUrl, cached: true, debug });
    }
  }

  // ── 2. Require API key ───────────────────────────────────────────────────────
  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) {
    debug.step = "no_api_key";
    return Response.json({
      phones: [], lookupUrl,
      error: "PDL_API_KEY not configured in Vercel environment variables",
      debug,
    });
  }

  // ── 3. Skip non-individuals ──────────────────────────────────────────────────
  if (ownerType !== "Individual") {
    debug.step = `skipped:${ownerType}`;
    return Response.json({ phones: [], lookupUrl, debug });
  }

  // ── 4. Skip if name is a known non-name OWNERDESC fallback ──────────────────
  const name = (ownerName ?? "").trim().toUpperCase();
  if (!name || NON_NAME.has(name)) {
    debug.step = "no_usable_name";
    return Response.json({
      phones: [], lookupUrl,
      error: "Owner name unavailable — use the manual search link",
      debug,
    });
  }

  // ── 5. PDL Person Enrichment ─────────────────────────────────────────────────
  try {
    const location = [city, state, zip].filter(Boolean).join(" ");
    const pdlPayload = {
      name,
      street_address: address || undefined,
      location:       location || undefined,
      // Only charge a credit when phone_numbers are present
      required:       "phone_numbers",
      // Lowered from 5 → 2 to catch more real matches
      min_likelihood: 2,
    };
    debug.pdlPayload = pdlPayload;

    const res = await fetch("https://api.peopledatalabs.com/v5/person/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify(pdlPayload),
      signal: AbortSignal.timeout(10_000),
    });

    debug.pdlHttpStatus = res.status;

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
      return Response.json({ phones: [], lookupUrl, error: "PDL API key rejected — check Vercel env", debug });
    }
    if (!res.ok) {
      const txt = await res.text();
      debug.step = `pdl_error_${res.status}`;
      debug.pdlError = txt;
      return Response.json({ phones: [], lookupUrl, debug });
    }

    const data = await res.json();
    const raw: string[] = data.data?.phone_numbers ?? [];
    const phones = [...new Set(raw.map(fmt))].filter(Boolean);
    debug.step = `pdl_ok:${phones.length}`;

    if (parid && phones.length > 0) storeCachedPhone(parid, phones).catch(() => {});

    return Response.json({ phones, lookupUrl, debug });
  } catch (e) {
    debug.step = `exception:${String(e)}`;
    return Response.json({ phones: [], lookupUrl, debug });
  }
}
