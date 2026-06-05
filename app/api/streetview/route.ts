import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  if (!address) return new Response("Missing address", { status: 400 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return new Response("Not configured", { status: 404 });

  const googleUrl =
    "https://maps.googleapis.com/maps/api/streetview" +
    `?size=600x280` +
    `&location=${encodeURIComponent(address)}` +
    `&key=${apiKey}` +
    `&fov=80&pitch=5` +
    `&return_error_codes=true`;

  try {
    const res = await fetch(googleUrl, { signal: AbortSignal.timeout(8_000) });

    if (!res.ok) return new Response(null, { status: 404 });

    const img = await res.arrayBuffer();
    return new Response(img, {
      status: 200,
      headers: {
        "Content-Type":  res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
