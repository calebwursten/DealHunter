import { NextRequest } from "next/server";

const CKAN   = "https://data.wprdc.org/api/3/action";
const RES_ID = "65855e14-549e-4992-b5be-d629afc676fa";

function esc(s: string) {
  return s.replace(/'/g, "''").replace(/[;\\]/g, "").substring(0, 120);
}

const SUFFIX = /\b(STREET|ST|AVENUE|AVE|BOULEVARD|BLVD|ROAD|RD|DRIVE|DR|LANE|LN|WAY|COURT|CT|PLACE|PL|TERRACE|TER|CIRCLE|CIR|HIGHWAY|HWY|PARKWAY|PKWY|PIKE|ALLEY|ALY)\b\.?/gi;

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
  const rows = await runSQL(`SELECT COUNT(*) as n FROM "${RES_ID}" WHERE ${where}`);
  if (!rows) return 0;
  return parseInt(String((rows as { n: string }[])[0]?.n ?? "0"), 10);
}

// ── Filter SQL constants ───────────────────────────────────────────────────────
const LOT_COND =
  `("USEDESC" ILIKE '%VACANT%' OR ("USEDESC" ILIKE '%LAND%' AND "USEDESC" NOT ILIKE '%HIGHLAND%'))`;

const MULTI_COND =
  `("USEDESC" ILIKE '%TWO FAMILY%' OR "USEDESC" ILIKE '%MULTI%' OR ` +
  `"USEDESC" ILIKE '%APARTMENT%' OR "USEDESC" ILIKE '%TRIPLEX%' OR ` +
  `"USEDESC" ILIKE '%FOUR FAMILY%' OR "USEDESC" ILIKE '%FIVE FAMILY%')`;

// Single-family = not a lot, not multi, not condo, not commercial/industrial
const SINGLE_COND =
  `(NOT ${LOT_COND} AND NOT ${MULTI_COND} AND ` +
  `"USEDESC" NOT ILIKE '%CONDO%' AND ` +
  `"CLASSDESC" NOT ILIKE '%COMMERCIAL%' AND ` +
  `"CLASSDESC" NOT ILIKE '%INDUSTRIAL%' AND ` +
  `"CLASSDESC" NOT ILIKE '%GOVERNMENTAL%')`;

export async function GET(req: NextRequest) {
  const raw       = (req.nextUrl.searchParams.get("q")         ?? "").trim();
  const limit     = Math.min(parseInt(req.nextUrl.searchParams.get("limit")     ?? "25"),  500);
  const offset    = Math.max(parseInt(req.nextUrl.searchParams.get("offset")    ?? "0"),   0);
  const occupancy =          req.nextUrl.searchParams.get("occupancy") ?? ""; // "owner"|"non-owner"|""
  const typesRaw  =          req.nextUrl.searchParams.get("types")     ?? ""; // "single,multi,lot"
  const typeList  = typesRaw.split(",").filter(Boolean);
  const valFilter =          req.nextUrl.searchParams.get("valFilter") ?? ""; // "50000-100000" etc.
  const minBaths  = parseInt(req.nextUrl.searchParams.get("minBaths")  ?? "0") || 0;
  const minYears  = parseInt(req.nextUrl.searchParams.get("minYears")  ?? "0") || 0;

  if (!raw) return Response.json({ records: [], total: 0 });

  // ── Build filter SQL ──────────────────────────────────────────────────────
  const filterParts: string[] = [];

  if (occupancy === "owner") {
    filterParts.push(`"HOMESTEADFLAG" = 'HOM'`);
  } else if (occupancy === "non-owner") {
    filterParts.push(`("HOMESTEADFLAG" IS NULL OR "HOMESTEADFLAG" != 'HOM')`);
  }

  // Type filter — OR between selected types; skip entirely if all 3 selected (= no filter)
  if (typeList.length > 0 && typeList.length < 3) {
    const typeParts: string[] = [];
    if (typeList.includes("lot"))    typeParts.push(LOT_COND);
    if (typeList.includes("multi"))  typeParts.push(MULTI_COND);
    if (typeList.includes("single")) typeParts.push(SINGLE_COND);
    if (typeParts.length > 0) filterParts.push(`(${typeParts.join(" OR ")})`);
  }

  // Assessed value range — "min-max" or "min-" (no upper bound)
  if (valFilter) {
    const dash = valFilter.indexOf("-");
    const minStr = dash >= 0 ? valFilter.slice(0, dash) : valFilter;
    const maxStr = dash >= 0 ? valFilter.slice(dash + 1) : "";
    const minVal = parseInt(minStr) || 0;
    const maxVal = parseInt(maxStr) || 0;
    if (minVal > 0) filterParts.push(`"FAIRMARKETTOTAL" >= ${minVal}`);
    if (maxVal > 0) filterParts.push(`"FAIRMARKETTOTAL" <= ${maxVal}`);
  }

  if (minBaths > 0) filterParts.push(`"FULLBATHS" >= ${minBaths}`);

  if (minYears > 0) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - minYears);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    filterParts.push(`"SALEDATE" IS NOT NULL AND "SALEDATE" <= '${cutoffStr}'`);
  }

  const filterSql = filterParts.join(" AND ");

  /** Append active filter conditions to any base WHERE clause. */
  function withFilters(base: string): string {
    if (!filterSql) return base;
    if (!base)      return filterSql;
    return `(${base}) AND ${filterSql}`;
  }

  // ── Parse query ───────────────────────────────────────────────────────────
  const comma   = raw.indexOf(",");
  const addrRaw = comma >= 0 ? raw.slice(0, comma).trim() : raw;
  const cityRaw = comma >= 0 ? raw.slice(comma + 1).trim() : "";
  const addrUp  = addrRaw.toUpperCase();
  const cityUp  = cityRaw.toUpperCase();

  let baseWhere = "";

  // ── 1. ZIP code ───────────────────────────────────────────────────────────
  if (/^\d{5}$/.test(raw)) {
    baseWhere = `"PROPERTYZIP" = '${esc(raw)}'`;
  }

  // ── 2. House number + street ──────────────────────────────────────────────
  if (!baseWhere) {
    const numMatch = addrRaw.match(/^(\d+)\s+(.+)/);
    if (numMatch) {
      const num = esc(numMatch[1]);
      SUFFIX.lastIndex = 0;
      const kw = esc(numMatch[2].toUpperCase().replace(SUFFIX, "").trim());
      baseWhere = `"PROPERTYHOUSENUM" = '${num}' AND "PROPERTYADDRESS" ILIKE '%${kw}%'`;
      if (cityUp)
        baseWhere += ` AND "PROPERTYCITY" ILIKE '%${esc(cityUp)}%'`;
    }
  }

  // ── 3. Street name (only when suffix word present) ────────────────────────
  if (!baseWhere) {
    const hasSuffix = new RegExp(SUFFIX.source, "i").test(addrUp);
    if (hasSuffix) {
      SUFFIX.lastIndex = 0;
      const kw = esc(addrUp.replace(SUFFIX, "").trim());
      if (kw.length >= 2) {
        baseWhere = `"PROPERTYADDRESS" ILIKE '%${kw}%'`;
        if (cityUp)
          baseWhere += ` AND ("PROPERTYCITY" ILIKE '%${esc(cityUp)}%' OR "MUNIDESC" ILIKE '%${esc(cityUp)}%')`;
      }
    }
  }

  // ── 4. Neighbourhood / municipality ──────────────────────────────────────
  // Parallel COUNT queries to discover which match type wins; filters are NOT
  // applied here — we're just testing whether the area exists in the data.
  if (!baseWhere && addrRaw.length >= 3) {
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

    if      (neighCnt > 0)           baseWhere = neighWhere;
    else if (zipWhere && zipCnt > 0) baseWhere = zipWhere;
    else if (muniCnt  > 0)           baseWhere = muniWhere;
  }

  // ── SQL path — apply filters then fetch data + count in parallel ──────────
  if (baseWhere) {
    const where    = withFilters(baseWhere);
    const orderBy  = `ORDER BY "FAIRMARKETTOTAL" DESC NULLS LAST`;
    const dataSql  = `SELECT * FROM "${RES_ID}" WHERE ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    const countSql = `SELECT COUNT(*) as n FROM "${RES_ID}" WHERE ${where}`;

    const [records, countRows] = await Promise.all([runSQL(dataSql), runSQL(countSql)]);

    if (records !== null) {
      const total = parseInt(String((countRows as { n: string }[])?.[0]?.n ?? 0), 10);
      return Response.json({ records, total, mode: "sql" });
    }
  }

  // ── 5. Full-text fallback ─────────────────────────────────────────────────
  // When filters are active, datastore_search can't apply SQL conditions,
  // so fall back to a simple ILIKE query with filters applied.
  if (filterSql) {
    const where = withFilters(
      `("PROPERTYADDRESS" ILIKE '%${esc(raw)}%' OR "PROPERTYCITY" ILIKE '%${esc(raw)}%')`
    );
    const [records, countRows] = await Promise.all([
      runSQL(`SELECT * FROM "${RES_ID}" WHERE ${where} ORDER BY "FAIRMARKETTOTAL" DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`),
      runSQL(`SELECT COUNT(*) as n FROM "${RES_ID}" WHERE ${where}`),
    ]);
    if (records !== null) {
      const total = parseInt(String((countRows as { n: string }[])?.[0]?.n ?? 0), 10);
      return Response.json({ records, total, mode: "sql-fallback" });
    }
  }

  // Pure full-text — no active filters
  const params = new URLSearchParams({ resource_id: RES_ID, q: raw, limit: String(limit), offset: String(offset) });
  const res  = await fetch(`${CKAN}/datastore_search?${params}`, { next: { revalidate: 300 } });
  const data = await res.json();
  return Response.json({ records: data.result?.records ?? [], total: data.result?.total ?? 0, mode: "fulltext" });
}


