export const runtime = "nodejs";

import { getNote, saveNote } from "@/lib/db";

export async function GET(req: Request) {
  const url   = new URL(req.url);
  const parid = url.searchParams.get("parid") ?? "";
  if (!parid) return Response.json({ error: "Missing parid" }, { status: 400 });
  const notes = await getNote(parid);
  return Response.json({ notes });
}

export async function PUT(req: Request) {
  const { parid, notes } = (await req.json()) as { parid?: string; notes?: string };
  if (!parid) return Response.json({ error: "Missing parid" }, { status: 400 });
  await saveNote(parid, notes ?? "");
  return Response.json({ ok: true });
}
