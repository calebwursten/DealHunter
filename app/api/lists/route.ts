import { NextRequest } from "next/server";
import {
  getLists,
  getPropertyListIds,
  createList,
  deleteList,
} from "@/lib/db";

// GET /api/lists           → { lists: ListRow[] }
// GET /api/lists?parid=X   → { listIds: string[] }
export async function GET(req: NextRequest) {
  const parid = req.nextUrl.searchParams.get("parid");
  if (parid) {
    const listIds = await getPropertyListIds(parid);
    return Response.json({ listIds });
  }
  const lists = await getLists();
  return Response.json({ lists });
}

// POST /api/lists  body: { name: string }  → { list: ListRow }
export async function POST(req: NextRequest) {
  const { name } = (await req.json()) as { name: string };
  if (!name?.trim())
    return Response.json({ error: "Name required" }, { status: 400 });
  try {
    const list = await createList(name.trim());
    return Response.json({ list });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/lists?id=X  → { ok: true }
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return Response.json({ error: "id required" }, { status: 400 });
  await deleteList(id);
  return Response.json({ ok: true });
}
