import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
let _ready = false;

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

export async function ensureTable() {
  const sql = getSql();
  if (!sql || _ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      parid        TEXT PRIMARY KEY,
      lat          DOUBLE PRECISION NOT NULL,
      lng          DOUBLE PRECISION NOT NULL,
      address      TEXT,
      geocoded_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  _ready = true;
}

export interface CachedCoord {
  parid: string;
  lat: number;
  lng: number;
}

export async function getCachedCoords(
  parids: string[]
): Promise<Record<string, CachedCoord>> {
  const sql = getSql();
  if (!sql || parids.length === 0) return {};
  await ensureTable();
  const rows = (await sql`
    SELECT parid, lat, lng
    FROM   geocode_cache
    WHERE  parid = ANY(${parids})
  `) as unknown as CachedCoord[];
  return Object.fromEntries(rows.map((r) => [r.parid, r]));
}

export async function storeCachedCoords(
  entries: { parid: string; lat: number; lng: number; address?: string }[]
) {
  const sql = getSql();
  if (!sql || entries.length === 0) return;
  await ensureTable();
  for (const e of entries) {
    await sql`
      INSERT INTO geocode_cache (parid, lat, lng, address)
      VALUES (${e.parid}, ${e.lat}, ${e.lng}, ${e.address ?? null})
      ON CONFLICT (parid) DO NOTHING
    `;
  }
}
