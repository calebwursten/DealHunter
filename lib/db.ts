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
  await sql`
    CREATE TABLE IF NOT EXISTS lists (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS list_properties (
      list_id    TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      parid      TEXT NOT NULL,
      snapshot   JSONB,
      added_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (list_id, parid)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS phone_cache (
      parid      TEXT PRIMARY KEY,
      phones     TEXT[] NOT NULL DEFAULT '{}',
      cached_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS property_notes (
      parid      TEXT PRIMARY KEY,
      notes      TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  _ready = true;
}

// ── Geocode cache ─────────────────────────────────────────────────────────────

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

// ── Lists ─────────────────────────────────────────────────────────────────────

export interface ListRow {
  id: string;
  name: string;
  count: number;
  created_at: string;
}

export async function getLists(): Promise<ListRow[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureTable();
  const rows = (await sql`
    SELECT l.id, l.name, l.created_at,
           COUNT(lp.parid)::int AS count
    FROM   lists l
    LEFT JOIN list_properties lp ON lp.list_id = l.id
    GROUP BY l.id, l.name, l.created_at
    ORDER BY l.created_at ASC
  `) as unknown as ListRow[];
  return rows;
}

export async function getPropertyListIds(parid: string): Promise<string[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureTable();
  const rows = (await sql`
    SELECT list_id FROM list_properties WHERE parid = ${parid}
  `) as unknown as { list_id: string }[];
  return rows.map((r) => r.list_id);
}

export async function createList(name: string): Promise<ListRow> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureTable();
  const rows = (await sql`
    INSERT INTO lists (name) VALUES (${name})
    RETURNING id, name, created_at
  `) as unknown as Omit<ListRow, "count">[];
  return { ...rows[0], count: 0 };
}

export async function deleteList(id: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable();
  await sql`DELETE FROM lists WHERE id = ${id}`;
}

export async function addToList(
  listId: string,
  parid: string,
  snapshot: unknown
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable();
  await sql`
    INSERT INTO list_properties (list_id, parid, snapshot)
    VALUES (${listId}, ${parid}, ${JSON.stringify(snapshot)})
    ON CONFLICT (list_id, parid) DO NOTHING
  `;
}

export async function removeFromList(
  listId: string,
  parid: string
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable();
  await sql`
    DELETE FROM list_properties WHERE list_id = ${listId} AND parid = ${parid}
  `;
}

export async function getListProperties(listId: string): Promise<unknown[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureTable();
  const rows = (await sql`
    SELECT snapshot
    FROM   list_properties
    WHERE  list_id = ${listId}
    ORDER  BY added_at DESC
  `) as unknown as { snapshot: unknown }[];
  return rows.map((r) => r.snapshot);
}

// ── Phone cache ───────────────────────────────────────────────────────────────

export async function getCachedPhone(parid: string): Promise<string[] | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureTable();
  const rows = (await sql`
    SELECT phones FROM phone_cache
    WHERE  parid     = ${parid}
    AND    cached_at > NOW() - INTERVAL '30 days'
  `) as unknown as { phones: string[] }[];
  return rows.length > 0 ? rows[0].phones : null;
}

export async function storeCachedPhone(parid: string, phones: string[]): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable();
  await sql`
    INSERT INTO phone_cache (parid, phones)
    VALUES (${parid}, ${phones})
    ON CONFLICT (parid)
    DO UPDATE SET phones = ${phones}, cached_at = NOW()
  `;
}

// ── Property notes ────────────────────────────────────────────────────────────

export async function getNote(parid: string): Promise<string> {
  const sql = getSql();
  if (!sql) return "";
  await ensureTable();
  const rows = (await sql`
    SELECT notes FROM property_notes WHERE parid = ${parid}
  `) as unknown as { notes: string }[];
  return rows.length > 0 ? rows[0].notes : "";
}

export async function saveNote(parid: string, notes: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable();
  await sql`
    INSERT INTO property_notes (parid, notes)
    VALUES (${parid}, ${notes})
    ON CONFLICT (parid)
    DO UPDATE SET notes = ${notes}, updated_at = NOW()
  `;
}
