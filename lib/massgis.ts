// MassGIS L3 Parcel REST API — Massachusetts Property Tax Parcels
// Provides owner mailing address (OWN_ADDR/OWN_CITY/OWN_STATE/OWN_ZIP) for North Adams parcels.
// REST endpoint: https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Property_Tax_Parcels/FeatureServer/0

const MASSGIS =
  "https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services" +
  "/Massachusetts_Property_Tax_Parcels/FeatureServer/0";

const NA_TOWN_ID = 209; // TOWN_ID for North Adams, MA

export interface MassGisParcel {
  addrNum:  string; // ADDR_NUM  — leading street number (e.g. "82" for "82-84 Beaver St")
  fullStr:  string; // FULL_STR  — normalized street name (e.g. "BEAVER ST")
  siteAddr: string; // SITE_ADDR — full site address string
  owner1:   string; // OWNER1
  ownAddr:  string; // OWN_ADDR  — mailing street address
  ownCity:  string; // OWN_CITY
  ownState: string; // OWN_STATE
  ownZip:   string; // OWN_ZIP
}

/** True when the owner's mailing address is outside North Adams, MA. */
export function isAbsentee(p: MassGisParcel): boolean {
  const city  = (p.ownCity  ?? "").toUpperCase().trim();
  const state = (p.ownState ?? "").toUpperCase().trim();
  return city !== "NORTH ADAMS" || state !== "MA";
}

/**
 * Fetch all MassGIS parcels on a given street in North Adams.
 * streetName should already be normalized (e.g. "BEAVER ST").
 * Uses a LIKE prefix match so "BEAVER ST" and "BEAVER" both work.
 */
export async function queryNAStreet(streetName: string): Promise<MassGisParcel[]> {
  const safe   = streetName.replace(/'/g, "''"); // escape single quotes
  const params = new URLSearchParams({
    where:             `TOWN_ID=${NA_TOWN_ID} AND FULL_STR LIKE '${safe}%'`,
    outFields:         "ADDR_NUM,FULL_STR,SITE_ADDR,OWNER1,OWN_ADDR,OWN_CITY,OWN_STATE,OWN_ZIP",
    resultRecordCount: "1000",
    f:                 "json",
  });

  try {
    const res = await fetch(`${MASSGIS}/query?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: { attributes: Record<string, string | number | null> }[];
    };
    return (data.features ?? []).map((f) => ({
      addrNum:  String(f.attributes.ADDR_NUM  ?? ""),
      fullStr:  String(f.attributes.FULL_STR  ?? ""),
      siteAddr: String(f.attributes.SITE_ADDR ?? ""),
      owner1:   String(f.attributes.OWNER1    ?? ""),
      ownAddr:  String(f.attributes.OWN_ADDR  ?? ""),
      ownCity:  String(f.attributes.OWN_CITY  ?? ""),
      ownState: String(f.attributes.OWN_STATE ?? ""),
      ownZip:   String(f.attributes.OWN_ZIP   ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Build a map from leading address number → MassGisParcel.
 * For "82-84 BEAVER ST", ADDR_NUM is "82" and parseInt("82-84") === 82,
 * so Patriot streetNumbers join cleanly via parseInt().
 */
export function buildAddrMap(parcels: MassGisParcel[]): Map<number, MassGisParcel> {
  const map = new Map<number, MassGisParcel>();
  for (const p of parcels) {
    const n = parseInt(p.addrNum);
    if (!isNaN(n) && !map.has(n)) map.set(n, p);
  }
  return map;
}
