export const runtime = "nodejs";

// ── Warm-instance cache (1 hour) ─────────────────────────────────────────────
const cache = new Map<string, { phones: string[]; ts: number }>();
const TTL   = 60 * 60 * 1000;

interface PhoneInput {
  address:   string;
  city:      string;
  state:     string;
  zip:       string;
  ownerName?: string;
  ownerType?: string;
}

// Headers that look like a real browser
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control":   "no-cache",
  "Sec-Fetch-Dest":  "document",
  "Sec-Fetch-Mode":  "navigate",
  "Sec-Fetch-Site":  "none",
  "Upgrade-Insecure-Requests": "1",
};

// ── Bot-wall detection ────────────────────────────────────────────────────────
function isBlocked(html: string): boolean {
  if (html.length < 800) return true;
  const top = html.slice(0, 8000);
  return (
    top.includes("cf-browser-verification") ||
    top.includes("cf_chl_prog") ||
    top.includes("challenge-form") ||
    top.includes("Enable JavaScript and cookies") ||
    top.includes("Please wait while we check") ||
    top.includes("Just a moment") ||
    /captcha/i.test(top)
  );
}

// ── Phone extraction — multiple patterns ─────────────────────────────────────
function extractPhones(html: string): string[] {
  const found = new Set<string>();

  // (XXX) XXX-XXXX — standard with parens (includes non-breaking hyphens ‑)
  (html.match(/\(\d{3}\)\s*\d{3}[-‑]\d{4}/g) ?? [])
    .forEach((p) => found.add(p.trim()));

  // XXX-XXX-XXXX — dashes only; area code must start 2-9
  (html.match(/\b[2-9]\d{2}-\d{3}-\d{4}\b/g) ?? [])
    .forEach((p) => found.add(p));

  // XXX.XXX.XXXX — dots
  (html.match(/\b[2-9]\d{2}\.\d{3}\.\d{4}\b/g) ?? [])
    .forEach((p) => found.add(p));

  // tel: href links — <a href="tel:+14125551234"> or href="tel:4125551234"
  const telRe = /href="tel:(?:\+?1?)?(\d{10})"/g;
  let m: RegExpExecArray | null;
  while ((m = telRe.exec(html)) !== null) {
    const d = m[1];
    found.add(`(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`);
  }

  // JSON-LD structured data — <script type="application/ld+json">...</script>
  const jlRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jlRe.exec(html)) !== null) {
    try {
      const findPhones = (obj: unknown): void => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) { obj.forEach(findPhones); return; }
        const rec = obj as Record<string, unknown>;
        (["telephone", "phone", "phoneNumber"] as const).forEach((k) => {
          if (typeof rec[k] === "string") found.add(rec[k] as string);
        });
        Object.values(rec).forEach(findPhones);
      };
      findPhones(JSON.parse(m[1]));
    } catch { /* malformed JSON */ }
  }

  // Normalise and filter
  return [...found]
    .map((p) => {
      const d = p.replace(/\D/g, "");
      // Already formatted, or needs normalising from JSON-LD
      if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
      if (d.length === 11 && d[0] === "1")
        return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
      return p; // keep original if it already looks formatted
    })
    .filter((p) => {
      const d = p.replace(/\D/g, "");
      if (d.length !== 10) return false;
      if (parseInt(d[0]) < 2) return false; // invalid area code
      if (d.slice(3, 6) === "555") return false; // obvious fake
      return true;
    })
    .slice(0, 5);
}

// ── URL builders ─────────────────────────────────────────────────────────────

// FastPeopleSearch — simpler HTML, usually no Cloudflare, try first
function buildFpsUrl({ address, city, state, zip, ownerName, ownerType }: PhoneInput): string {
  if (ownerType === "Individual" && ownerName) {
    // Name + city/state search
    const nameParts = ownerName.trim().split(/\s+/);
    const last  = nameParts.pop() ?? "";
    const first = nameParts.join(" ");
    const slug  = [first, last].filter(Boolean).join("-").replace(/[^a-zA-Z0-9-]/g, "");
    const loc   = `${city} ${state}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (slug && loc) {
      return `https://www.fastpeoplesearch.com/name/${encodeURIComponent(slug)}_${loc}`;
    }
  }
  // Address-based search
  const fullAddr = [address, city, state, zip].filter(Boolean).join(" ");
  return `https://www.fastpeoplesearch.com/address/${encodeURIComponent(fullAddr)}`;
}

// TruePeopleSearch — secondary attempt
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

// ── Fetch one URL and extract phones ─────────────────────────────────────────
async function tryUrl(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    if (isBlocked(html)) return [];
    return extractPhones(html);
  } catch {
    return [];
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body     = (await req.json()) as PhoneInput;
  const tpsUrl   = buildTpsUrl(body);
  const fpsUrl   = buildFpsUrl(body);
  const cacheKey = `${body.address}|${body.city}|${body.state}|${body.zip}|${body.ownerName ?? ""}`;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL) {
    return Response.json({ phones: hit.phones, lookupUrl: tpsUrl, cached: true });
  }

  // Try FastPeopleSearch first (no Cloudflare), then TruePeopleSearch
  let phones: string[] = [];
  for (const url of [fpsUrl, tpsUrl]) {
    phones = await tryUrl(url);
    if (phones.length > 0) break;
  }

  cache.set(cacheKey, { phones, ts: Date.now() });
  return Response.json({ phones, lookupUrl: tpsUrl });
}
