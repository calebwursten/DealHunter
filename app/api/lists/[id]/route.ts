import { NextRequest } from "next/server";
import { getListProperties, addToList, removeFromList } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/lists/[id]  → { properties: Property[] }
export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params;
  const properties = await getListProperties(id);
  return Response.json({ properties });
}

// POST /api/lists/[id]  body: { parid, snapshot }  → { ok: true }
export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params;
  const { parid, snapshot } = (await req.json()) as {
    parid: string;
    snapshot: unknown;
  };
  if (!parid)
    return Response.json({ error: "parid required" }, { status: 400 });
  await addToList(id, parid, snapshot);
  return Response.json({ ok: true });
}

// DELETE /api/lists/[id]?parid=X  → { ok: true }
export async function DELETE(
  req: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params;
  const parid = req.nextUrl.searchParams.get("parid");
  if (!parid)
    return Response.json({ error: "parid required" }, { status: 400 });
  await removeFromList(id, parid);
  return Response.json({ ok: true });
}
