import type { PropertySearchResult, ParcelGroup } from '../types';

/**
 * Returns the 7-digit master prefix of a parcel ID.
 * Parcel IDs that share the first 7 digits belong to the same master parcel family.
 */
export function getMasterPrefix(parcelId: string): string {
  return parcelId.replace(/-/g, '').slice(0, 7);
}

/**
 * Returns true if the parcel ID represents a master parcel (last 3 digits are '000').
 */
export function isMasterParcel(parcelId: string): boolean {
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
 * Groups an array of PropertySearchResult by their 7-digit master prefix.
 * Within each group, the master parcel (ending in '000') appears first,
 * followed by children sorted by parcel ID.
 *
 * Groups are returned in the order determined by the first appearance of any
 * member of that group in the input array (preserving search relevance order).
 */
export function groupByMasterParcel(results: PropertySearchResult[]): ParcelGroup[] {
  const groupMap = new Map<string, { master: PropertySearchResult | null; children: PropertySearchResult[] }>();
  const groupOrder: string[] = [];

  for (const result of results) {
    const prefix = getMasterPrefix(result.parcelId);

    if (!groupMap.has(prefix)) {
      groupMap.set(prefix, { master: null, children: [] });
      groupOrder.push(prefix);
    }

    const group = groupMap.get(prefix)!;

    if (isMasterParcel(result.parcelId)) {
      group.master = result;
    } else {
      group.children.push(result);
    }
  }

  return groupOrder.map((prefix) => {
    const { master, children } = groupMap.get(prefix)!;
    // Sort children by parcel ID for consistent ordering
    children.sort((a, b) => a.parcelId.localeCompare(b.parcelId));
    const allParcels: PropertySearchResult[] = master ? [master, ...children] : [...children];
    return {
      masterPrefix: prefix,
      masterParcel: master,
      children,
      allParcels,
    };
  });
}
