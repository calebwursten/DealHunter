export const runtime = "nodejs";

// Warm-instance cache — survives repeated calls within one serverless invocation
const cache = new Map<string, { phones: string[]; ts: number }>();
const TTL   = 60 * 60 * 1000; // 1 hour

interface PhoneInput {
  address:   string;
  city:      string;
  state:     string;
  zip:       string;
  ownerName?: string;
  ownerType?: string;
}

function buildTpsUrl({ address, city, state, zip, ownerName, ownerType }: PhoneInput): string {
  const cs = [city, state, zip].filter(Boolean).join(" ");
  // For individual owners search by name; everything else by mailing address
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

async function scrapePhones(url: string): Promise<string[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language":  "en-US,en;q=0.9",
      "Accept-Encoding":  "gzip, deflate, br",
      "Cache-Control":    "no-cache",
      "Sec-Fetch-Dest":   "document",
      "Sec-Fetch-Mode":   "navigate",
      "Sec-Fetch-Site":   "none",
      "Upgrade-Insecure-Requests": "1",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) return [];
  const html = await res.text();

  // Cloudflare / bot-wall — no useful data
  if (html.includes("cf-browser-verification") || html.includes("captcha")) return [];

  // Primary: (XXX) XXX-XXXX
  const standardRe = /\(\d{3}\)\s*\d{3}-\d{4}/g;
  const found = html.match(standardRe) ?? [];

  // Deduplicate and limit
  return [...new Set(found.map((p) => p.trim()))].slice(0, 5);
}

export async function POST(req: Request) {
  const body = (await req.json()) as PhoneInput;
  const lookupUrl = buildTpsUrl(body);

  const cacheKey = `${body.address}|${body.city}|${body.state}|${body.zip}|${body.ownerName ?? ""}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL) {
    return Response.json({ phones: hit.phones, lookupUrl, cached: true });
  }

  try {
    const phones = await scrapePhones(lookupUrl);
    cache.set(cacheKey, { phones, ts: Date.now() });
    return Response.json({ phones, lookupUrl });
  } catch {
    return Response.json({ phones: [], lookupUrl });
  }
}
