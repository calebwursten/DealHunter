import { NextRequest } from "next/server";

interface AddrInput {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

async function geocodeOne(p: AddrInput): Promise<{ id: string; lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${p.address}, ${p.city}, ${p.state} ${p.zip}`);
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${q}&benchmark=Public_AR_Current&format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();
    const match = data.result?.addressMatches?.[0];
    if (match) return { id: p.id, lat: match.coordinates.y, lng: match.coordinates.x };
  } catch {
    // silent
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { properties } = await req.json() as { properties: AddrInput[] };
  const results = await Promise.all(properties.slice(0, 24).map(geocodeOne));
  return Response.json(results.filter(Boolean));
}
