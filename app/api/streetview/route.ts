import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Each unique address is cached for 30 days at the CDN edge —
// so Google is only billed once per property per month.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  if (!address) return new Response("Missing address", { status: 400 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // Return a 1×1 transparent GIF so the img onError fires cleanly
    const empty = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    return new Response(empty, {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
  }

  const googleUrl =
    "https://maps.googleapis.com/maps/api/streetview" +
    `?size=600x280` +
    `&location=${encodeURIComponent(address)}` +
    `&key=${apiKey}` +
    `&fov=80&pitch=5` +
    `&return_error_codes=true`;

  try {
    const res = await fetch(googleUrl, { signal: AbortSignal.timeout(8_000) });

    // 404 = no Street View coverage — let onError show the placeholder
    if (res.status === 404) {
      return new Response(null, { status: 404 });
    }

    const img = await res.arrayBuffer();
    return new Response(img, {
      status: 200,
      headers: {
        "Content-Type":  res.headers.get("Content-Type") ?? "image/jpeg",
        // 30-day immutable cache — Vercel CDN + browser won't re-fetch
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
