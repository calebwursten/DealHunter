import { NextRequest, NextResponse } from "next/server";

const CKAN_BASE = "https://data.wprdc.org/api/3/action";
const RESOURCE_ID = "65855e14-549e-4992-b5be-d629afc676fa";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = req.nextUrl.searchParams.get("limit") ?? "24";

  if (!q.trim()) {
    return NextResponse.json({ records: [], total: 0 });
  }

  const params = new URLSearchParams({ resource_id: RESOURCE_ID, q, limit });

  try {
    const res = await fetch(`${CKAN_BASE}/datastore_search?${params}`);
    const data = await res.json();
    return NextResponse.json({
      records: data.result?.records ?? [],
      total: data.result?.total ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
