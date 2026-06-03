import { NextRequest } from "next/server";

const CKAN   = "https://data.wprdc.org/api/3/action";
const RES_ID = "65855e14-549e-4992-b5be-d629afc676fa";

function esc(s: string) {
  return s.replace(/'/g, "''").replace(/[;\\]/g, "").substring(0, 120);
}

const SUFFIX = /\b(STREET|ST|AVENUE|AVE|BOULEVARD|BLVD|ROAD|RD|DRIVE|DR|LANE|LN|WAY|COURT|CT|PLACE|PL|TERRACE|TER|CIRCLE|CIR|HIGHWAY|HWY|PARKWAY|PKWY|PIKE|ALLEY|ALY)\b\.?/gi;

async function runSQL(sql: string) {
  const res = await fetch(`${CKAN}/datastore_search_sql?sql=${encodeURIComponent(sql)}`, {
    next: { revalidate: 300 },
  });
  const d = await res.json();
  return d.success ? (d.result?.records ?? []) : null;
}

export async function GET(req: NextRequest) {
  const raw    = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get("limit")  ?? "25"), 500);
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get("offset") ?? "0"),  0);

  if (!raw) return Response.json({ records: [], total: 0 });

  const comma   = raw.indexOf(",");
  const addrRaw = comma >= 0 ? raw.slice(0, comma).trim() : raw;
  const cityRaw = comma >= 0 ? raw.slice(comma + 1).trim() : "";
  const addrUp  = addrRaw.toUpperCase();
  const cityUp  = cityRaw.toUpperCase();

  let where = "";

  // 1. ZIP
  if (/^\d{5}$/.test(raw)) {
    where = `"PROPERTYZIP" = '${esc(raw)}'`;
  }

  // 2. House number + street
  if (!where) {
    const numMatch = addrRaw.match(/^(\d+)\s+(.+)/);
    if (numMatch) {
      const num = esc(numMatch[1]);
      SUFFIX.lastIndex = 0;
      const kw = esc(numMatch[2].toUpperCase().replace(SUFFIX, "").trim());
      where = `"PROPERTYHOUSENUM" = '${num}' AND "PROPERTYADDRESS" ILIKE '%${kw}%'`;
      if (cityUp) where += ` AND "PROPERTYCITY" ILIKE '%${esc(cityUp)}%'`;
    }
  }

  // 3. Street name (has suffix or explicit city)
  if (!where) {
    const hasSuffix = new RegExp(SUFFIX.source, "i").test(addrUp);
    if (hasSuffix || cityRaw) {
      SUFFIX.lastIndex = 0;
      const kw = esc(addrUp.replace(SUFFIX, "").trim());
      if (kw.length >= 2) {
        where = `"PROPERTYADDRESS" ILIKE '%${kw}%'`;
        if (cityUp)
          where += ` AND ("PROPERTYCITY" ILIKE '%${esc(cityUp)}%' OR "MUNIDESC" ILIKE '%${esc(cityUp)}%')`;
      }
    }
  }

  // SQL path — run data + COUNT in parallel
  if (where) {
    const orderBy = `ORDER BY "FAIRMARKETTOTAL" DESC NULLS LAST`;
    const dataSql  = `SELECT * FROM "${RES_ID}" WHERE ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    const countSql = `SELECT COUNT(*) as n FROM "${RES_ID}" WHERE ${where}`;

    const [records, countRows] = await Promise.all([
      runSQL(dataSql),
      runSQL(countSql),
    ]);

    if (records !== null) {
      const total = parseInt(String((countRows as {n: string}[])?.[0]?.n ?? 0), 10);
      return Response.json({ records, total, mode: "sql" });
    }
  }

  // 4. Full-text fallback
  const params = new URLSearchParams({
    resource_id: RES_ID,
    q: raw,
    limit: String(limit),
    offset: String(offset),
  });
  const res  = await fetch(`${CKAN}/datastore_search?${params}`, { next: { revalidate: 300 } });
  const data = await res.json();
  return Response.json({
    records: data.result?.records ?? [],
    total:   data.result?.total   ?? 0,
    mode: "fulltext",
  });
}
