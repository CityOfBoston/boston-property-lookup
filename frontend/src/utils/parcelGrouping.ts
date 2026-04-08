import type { PropertySearchResult, ParcelGroup } from '../types';

/**
 * Returns the 7-digit prefix of a parcel ID (fuzzy search / pairings bucketing only — not Layer 15 family).
 */
export function getMasterPrefix(parcelId: string): string {
  return parcelId.replace(/-/g, '').slice(0, 7);
}

/** Normalize parcel ID to 10-digit string (aligns with backend Layer 15 lookups). */
export function normalizeParcelId(id: string): string {
  const digits = id.replace(/\D/g, '');
  return digits.padStart(10, '0').slice(-10);
}

/**
 * Layer 15 family identity for grouping: children share their master's ID; a master or standalone parcel is its own family.
 */
export function getLayer15FamilyKey(result: PropertySearchResult): string {
  if (result.masterParcelId) return normalizeParcelId(result.masterParcelId);
  return normalizeParcelId(result.parcelId);
}

/** Master row in the table: Layer 15 `isMasterParcel` only (summaries API). */
function isGroupMaster(result: PropertySearchResult): boolean {
  return result.isMasterParcel;
}

/**
 * Master parcel ID from Layer 15 only (summaries: isMasterParcel row, or child.masterParcelId).
 * No synthetic IDs — returns null if the loaded results do not include that relationship.
 */
export function getLayer15MasterParcelId(group: ParcelGroup): string | null {
  const layerMaster = group.allParcels.find((r) => r.isMasterParcel);
  if (layerMaster) return layerMaster.parcelId;
  const fromChild = group.children.find((c) => c.masterParcelId)?.masterParcelId;
  if (fromChild) return fromChild;
  return null;
}

/**
 * Groups search summaries by Layer 15 family — not by 7-digit ID prefix (multiple families can share a prefix).
 * The master row is whoever Layer 15 marks as isMasterParcel. Other parcels are children.
 * Master appears first when present, then children by parcel ID.
 *
 * Groups are returned in the order determined by the first appearance of any
 * member of that group in the input array (preserving search relevance order).
 */
export function groupByMasterParcel(results: PropertySearchResult[]): ParcelGroup[] {
  const groupMap = new Map<string, { master: PropertySearchResult | null; children: PropertySearchResult[] }>();
  const groupOrder: string[] = [];

  for (const result of results) {
    const familyKey = getLayer15FamilyKey(result);

    if (!groupMap.has(familyKey)) {
      groupMap.set(familyKey, { master: null, children: [] });
      groupOrder.push(familyKey);
    }

    const group = groupMap.get(familyKey)!;

    if (isGroupMaster(result)) {
      group.master = result;
    } else {
      group.children.push(result);
    }
  }

  return groupOrder.map((layer15FamilyKey) => {
    const { master, children } = groupMap.get(layer15FamilyKey)!;
    children.sort((a, b) => a.parcelId.localeCompare(b.parcelId));
    const allParcels: PropertySearchResult[] = master ? [master, ...children] : [...children];

    const totalChildCount = children.length;

    return {
      layer15FamilyKey,
      masterParcel: master,
      children,
      allParcels,
      totalChildCount,
    };
  });
}
