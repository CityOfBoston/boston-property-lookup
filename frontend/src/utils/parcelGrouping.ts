import type { PropertySearchResult, ParcelGroup } from '../types';

/**
 * Returns the 7-digit master prefix of a parcel ID.
 * Parcel IDs that share the first 7 digits belong to the same master parcel family.
 */
export function getMasterPrefix(parcelId: string): string {
  return parcelId.replace(/-/g, '').slice(0, 7);
}

/**
 * Returns true if the parcel ID looks like a master parcel by convention (last 3 digits are '000').
 * Use only when Layer 15 data is not available (e.g. pairings). Otherwise use result.isMasterParcel from the API.
 */
export function isMasterParcelBySuffix(parcelId: string): boolean {
  const normalized = parcelId.replace(/-/g, '');
  return normalized.slice(7) === '000';
}

/**
 * Returns the master parcel ID for a given parcel ID (prefix + '000').
 */
export function getMasterParcelId(parcelId: string): string {
  return getMasterPrefix(parcelId) + '000';
}

/**
 * Whether this search result is the group's master. Prefer Layer 15 (API) flag; fall back to suffix convention.
 */
function isGroupMaster(result: PropertySearchResult): boolean {
  if (result.isMasterParcel) return true;
  return isMasterParcelBySuffix(result.parcelId);
}

/**
 * Groups an array of PropertySearchResult by their 7-digit master prefix.
 * The master parcel is taken from Layer 15 (result.isMasterParcel) when present; otherwise the
 * suffix convention (last 3 digits '000') is used. Master appears first, then children by parcel ID.
 *
 * Groups are returned in the order determined by the first appearance of any
 * member of that group in the input array (preserving search relevance order).
 *
 * @param prefixIndex Optional map from prefix to all parcels in that family,
 *   used to compute totalChildCount when expansion is limited (uses suffix convention; no API data).
 */
export function groupByMasterParcel(
  results: PropertySearchResult[],
  prefixIndex?: Map<string, { parcelId: string }[]>
): ParcelGroup[] {
  const groupMap = new Map<string, { master: PropertySearchResult | null; children: PropertySearchResult[] }>();
  const groupOrder: string[] = [];

  for (const result of results) {
    const prefix = getMasterPrefix(result.parcelId);

    if (!groupMap.has(prefix)) {
      groupMap.set(prefix, { master: null, children: [] });
      groupOrder.push(prefix);
    }

    const group = groupMap.get(prefix)!;

    if (isGroupMaster(result)) {
      group.master = result;
    } else {
      group.children.push(result);
    }
  }

  return groupOrder.map((prefix) => {
    const { master, children } = groupMap.get(prefix)!;
    children.sort((a, b) => a.parcelId.localeCompare(b.parcelId));
    const allParcels: PropertySearchResult[] = master ? [master, ...children] : [...children];

    let totalChildCount = children.length;
    if (prefixIndex) {
      const family = prefixIndex.get(prefix);
      if (family) {
        totalChildCount = family.filter((p) => !isMasterParcelBySuffix(p.parcelId)).length;
      }
    }

    return {
      masterPrefix: prefix,
      masterParcel: master,
      children,
      allParcels,
      totalChildCount,
    };
  });
}
