import { NextRequest } from "next/server";

const CKAN   = "https://data.wprdc.org/api/3/action";
const RES_ID = "65855e14-549e-4992-b5be-d629afc676fa";

function esc(s: string) {
  return s.replace(/'/g, "''").replace(/[;\\]/g, "").substring(0, 120);
}

const SUFFIX = /\b(STREET|ST|AVENUE|AVE|BOULEVARD|BLVD|ROAD|RD|DRIVE|DR|LANE|LN|WAY|COURT|CT|PLACE|PL|TERRACE|TER|CIRCLE|CIR|HIGHWAY|HWY|PARKWAY|PKWY|PIKE|ALLEY|ALY)\b\.?/gi;

// Pittsburgh neighbourhood → primary ZIP (used when NEIGHDESC has no real name)
const NEIGHBORHOOD_ZIP: Record<string, string> = {
  "lawrenceville":        "15201",
  "upper lawrenceville":  "15201",
  "lower lawrenceville":  "15201",
  "central lawrenceville":"15201",
  "ben avon":             "15202",
  "south side":           "15203",
  "south side flats":     "15203",
  "south side slopes":    "15203",
  "southside":            "15203",
  "elliott":              "15204",
  "esplen":               "15204",
  "crafton heights":      "15205",
  "east liberty":         "15206",
  "highland park":        "15206",
  "lincoln-lemington":    "15206",
  "hazelwood":            "15207",
  "greenfield":           "15207",
  "point breeze":         "15208",
  "millvale":             "15209",
  "knoxville":            "15210",
  "carrick":              "15210",
  "beltzhoover":          "15210",
  "mount washington":     "15211",
  "mt. washington":       "15211",
  "mt washington":        "15211",
  "duquesne heights":     "15211",
  "north side":           "15212",
  "northside":            "15212",
  "allegheny west":       "15212",
  "mexican war streets":  "15212",
  "troy hill":            "15212",
  "spring hill":          "15214",
  "oakland":              "15213",
  "schenley heights":     "15213",
  "perry hilltop":        "15214",
  "perry south":          "15214",
  "spring garden":        "15214",
  "sharpsburg":           "15215",
  "aspinwall":            "15215",
  "beechview":            "15216",
  "squirrel hill":        "15217",
  "squirrel hill south":  "15217",
  "squirrel hill north":  "15217",
  "edgewood":             "15218",
  "swissvale":            "15218",
  "regent square":        "15218",
  "hill district":        "15219",
  "uptown":               "15219",
  "crafton":              "15220",
  "ingram":               "15220",
  "wilkinsburg":          "15221",
  "east hills":           "15221",
  "downtown":             "15222",
  "strip district":       "15222",
  "cultural district":    "15222",
  "garfield":             "15224",
  "bloomfield":           "15224",
  "friendship":           "15224",
  "morningside":          "15224",
  "brookline":            "15226",
  "shadyside":            "15232",
  "manchester":           "15233",
  "chateau":              "15233",
  "castle shannon":       "15234",
  "penn hills":           "15235",
  "south hills":          "15236",
  "library":              "15236",
  "north hills":          "15237",
  "ross township":        "15229",
  "fox chapel":           "15238",
  "plum":                 "15239",
  "plum borough":         "15239",
  "upper st. clair":      "15241",
  "upper st clair":       "15241",
  "scott township":       "15243",
  "baldwin":              "15227",
  "mount lebanon":        "15228",
  "mt. lebanon":          "15228",
  "mt lebanon":           "15228",
  "bethel park":          "15102",
  "carnegie":             "15106",
  "brentwood":            "15227",
  "whitehall":            "15236",
};

async function runSQL(sql: string) {
  const res = await fetch(
    `${CKAN}/datastore_search_sql?sql=${encodeURIComponent(sql)}`,
    { next: { revalidate: 300 } }
  );
  const d = await res.json();
  return d.success ? (d.result?.records ?? []) : null;
}

async function countSQL(where: string): Promise<number> {
  const rows = await runSQL(
    `SELECT COUNT(*) as n FROM "${RES_ID}" WHERE ${where}`
  );
  if (!rows) return 0;
  return parseInt(String((rows as { n: string }[])[0]?.n ?? "0"), 10);
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

  // ── 1. ZIP code ───────────────────────────────────────────────────────────
  if (/^\d{5}$/.test(raw)) {
    where = `"PROPERTYZIP" = '${esc(raw)}'`;
  }

  // ── 2. House number + street: "123 walnut st" ─────────────────────────────
  if (!where) {
    const numMatch = addrRaw.match(/^(\d+)\s+(.+)/);
    if (numMatch) {
      const num = esc(numMatch[1]);
      SUFFIX.lastIndex = 0;
      const kw = esc(numMatch[2].toUpperCase().replace(SUFFIX, "").trim());
      where = `"PROPERTYHOUSENUM" = '${num}' AND "PROPERTYADDRESS" ILIKE '%${kw}%'`;
      if (cityUp)
        where += ` AND "PROPERTYCITY" ILIKE '%${esc(cityUp)}%'`;
    }
  }

  // ── 3. Street name — ONLY when query contains a street-type suffix ─────────
  // "walnut street" or "garfield ave" → yes
  // "garfield" or "shadyside" → NO (those are neighbourhoods, handled in step 4)
  if (!where) {
    const hasSuffix = new RegExp(SUFFIX.source, "i").test(addrUp);
    if (hasSuffix) {
      SUFFIX.lastIndex = 0;
      const kw = esc(addrUp.replace(SUFFIX, "").trim());
      if (kw.length >= 2) {
        where = `"PROPERTYADDRESS" ILIKE '%${kw}%'`;
        if (cityUp)
          where += ` AND ("PROPERTYCITY" ILIKE '%${esc(cityUp)}%' OR "MUNIDESC" ILIKE '%${esc(cityUp)}%')`;
      }
    }
  }

  // ── 4. Neighbourhood / municipality (no house number, no street suffix) ────
  // Strategy:
  //   4a. NEIGHDESC ILIKE '%keyword%'  — catches names stored in the DB (e.g. SHADYSIDE)
  //   4b. PROPERTYZIP = known_zip      — catches neighbourhoods without NEIGHDESC names (e.g. GARFIELD → 15224)
  //   4c. MUNIDESC   ILIKE '%keyword%' — catches borough/township names (e.g. MOUNT LEBANON TOWNSHIP)
  // All three COUNT queries run in parallel; first non-zero result wins.
  if (!where && addrRaw.length >= 3) {
    const kw      = esc(addrUp);
    const zipCode = NEIGHBORHOOD_ZIP[addrRaw.toLowerCase()];

    const cityFilter = cityUp
      ? ` AND ("PROPERTYCITY" ILIKE '%${esc(cityUp)}%' OR "MUNIDESC" ILIKE '%${esc(cityUp)}%')`
      : "";

    const neighWhere = `"NEIGHDESC" ILIKE '%${kw}%'${cityFilter}`;
    const zipWhere   = zipCode ? `"PROPERTYZIP" = '${zipCode}'${cityFilter}` : null;
    const muniWhere  = `"MUNIDESC" ILIKE '%${kw}%'${cityFilter}`;

    const [neighCnt, zipCnt, muniCnt] = await Promise.all([
      countSQL(neighWhere),
      zipWhere ? countSQL(zipWhere) : Promise.resolve(0),
      countSQL(muniWhere),
    ]);

    if      (neighCnt > 0)              where = neighWhere;
    else if (zipWhere && zipCnt > 0)    where = zipWhere;
    else if (muniCnt  > 0)              where = muniWhere;
  }

  // ── SQL path — data + total COUNT in parallel ──────────────────────────────
  if (where) {
    const orderBy  = `ORDER BY "FAIRMARKETTOTAL" DESC NULLS LAST`;
    const dataSql  = `SELECT * FROM "${RES_ID}" WHERE ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    const countSql = `SELECT COUNT(*) as n FROM "${RES_ID}" WHERE ${where}`;

    const [records, countRows] = await Promise.all([
      runSQL(dataSql),
      runSQL(countSql),
    ]);

    if (records !== null) {
      const total = parseInt(
        String((countRows as { n: string }[])?.[0]?.n ?? 0),
        10
      );
      return Response.json({ records, total, mode: "sql" });
    }
  }

  // ── 5. Full-text fallback ──────────────────────────────────────────────────
  const params = new URLSearchParams({
    resource_id: RES_ID,
    q: raw,
    limit: String(limit),
    offset: String(offset),
  });
  const res  = await fetch(`${CKAN}/datastore_search?${params}`, {
    next: { revalidate: 300 },
  });
  const data = await res.json();
  return Response.json({
    records: data.result?.records ?? [],
    total:   data.result?.total   ?? 0,
    mode: "fulltext",
  });
}
