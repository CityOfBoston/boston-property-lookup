/**
 * Hook for managing parcel ID address pairings with caching and fuzzy search
 */

import { useState, useEffect, useMemo } from 'react';
import Fuse, { FuseResult } from 'fuse.js';
import { getCurrentParcelIdAddressPairings } from './firebaseConfig';
import { indexedDBService } from './useIndexedDB';
import { getMasterPrefix } from '@utils/parcelGrouping';
import {
  extractTrailingUnitFromQuery,
  extractUnitFromAddress,
  normalizeAddressForSearch,
  stripApartmentSegments,
  unitsMatch,
} from '@utils/addressSearchNormalize';

interface ParcelPairing {
  parcelId: string;
  fullAddress: string;
}

type ParcelPairingForSearch = ParcelPairing & { normAddress: string };

interface UseParcelPairingsReturn {
  pairings: ParcelPairing[];
  fuse: Fuse<ParcelPairingForSearch> | null;
  prefixIndex: Map<string, ParcelPairing[]>;
  isLoading: boolean;
  error: string | null;
  search: (query: string, thresholdOverride?: number) => ParcelPairing[];
  refreshCache: () => Promise<void>;
}

export function useParcelPairings(): UseParcelPairingsReturn {
  const [pairings, setPairings] = useState<ParcelPairing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pairingsForSearch = useMemo((): ParcelPairingForSearch[] => {
    return pairings.map((p) => ({
      ...p,
      normAddress: normalizeAddressForSearch(p.fullAddress),
    }));
  }, [pairings]);

  // Initialize Fuse.js for fuzzy searching (normAddress aligns abbreviated suffixes with full-word queries)
  const fuse = useMemo(() => {
    if (pairingsForSearch.length === 0) return null;

    return new Fuse(pairingsForSearch, {
      keys: [
        { name: 'fullAddress', weight: 0.35 },
        { name: 'normAddress', weight: 0.65 },
      ],
      includeScore: true,
      threshold: 0.3,
      minMatchCharLength: 2,
      shouldSort: false,
    });
  }, [pairingsForSearch]);

  // Build a prefix index for efficient family lookups
  const prefixIndex = useMemo(() => {
    const index = new Map<string, ParcelPairing[]>();
    for (const p of pairings) {
      const prefix = getMasterPrefix(p.parcelId);
      let group = index.get(prefix);
      if (!group) {
        group = [];
        index.set(prefix, group);
      }
      group.push(p);
    }
    return index;
  }, [pairings]);

  /**
   * Given an ordered list of search results, expand each result's family
   * so that the full set of siblings (same 7-digit prefix) is included.
   * Groups appear in the order of their best-matching member.
   * Newly added siblings are inserted right after the original match(es).
   * @param maxGroups Limit how many unique groups to expand (0 = unlimited)
   * @param maxChildrenPerGroup Limit siblings pulled in per group (0 = unlimited)
   */
  const expandToFullFamilies = (results: ParcelPairing[], maxGroups: number = 0, maxChildrenPerGroup: number = 0): ParcelPairing[] => {
    const seen = new Set<string>();
    const expandedPrefixes = new Set<string>();
    const expanded: ParcelPairing[] = [];

    for (const result of results) {
      if (seen.has(result.parcelId)) continue;
      seen.add(result.parcelId);

      const prefix = getMasterPrefix(result.parcelId);

      if (!expandedPrefixes.has(prefix)) {
        if (maxGroups > 0 && expandedPrefixes.size >= maxGroups) {
          expanded.push(result);
          continue;
        }
        expandedPrefixes.add(prefix);
        expanded.push(result);
        const family = prefixIndex.get(prefix) || [];
        let added = 0;
        for (const sibling of family) {
          if (!seen.has(sibling.parcelId)) {
            if (maxChildrenPerGroup > 0 && added >= maxChildrenPerGroup) break;
            seen.add(sibling.parcelId);
            expanded.push(sibling);
            added++;
          }
        }
      } else {
        expanded.push(result);
      }
    }

    return expanded;
  };

  // Download and parse gzipped JSON from compressed data
  const downloadAndParsePairings = async (compressedData: string): Promise<ParcelPairing[]> => {
    try {
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(compressedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decompress using pako
      const pako = await import('pako');
      const jsonString = pako.inflate(bytes, { to: 'string' });
      
      // Parse the JSON
      const parsedPairings = JSON.parse(jsonString) as ParcelPairing[];
      
      return parsedPairings;
      
    } catch (err) {
      console.error('[useParcelPairings] Error processing compressed data:', err);
      throw err;
    }
  };

  // Load pairings from cache or download if needed
  const loadPairings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize IndexedDB
      await indexedDBService.init();

      // Check if cache is valid
      const isCacheValid = await indexedDBService.isCacheValid();
      
      if (isCacheValid) {
        const cached = await indexedDBService.getPairings();
        if (cached) {
          setPairings(cached.pairings);
          setIsLoading(false);
          return;
        }
      }

      // Cache is invalid or doesn't exist, download fresh data
      
      // Get compressed data from backend
      const { compressedData } = await getCurrentParcelIdAddressPairings();
      
      // Download and parse the pairings
      const freshPairings = await downloadAndParsePairings(compressedData);
      
      // Store in IndexedDB
      await indexedDBService.storePairings(freshPairings);
      
      // Update state
      setPairings(freshPairings);
      
    } catch (err) {
      console.error('[useParcelPairings] Error loading pairings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pairings');
    } finally {
      setIsLoading(false);
    }
  };


  // Enhanced search function with improved ranking
  const search = (query: string, thresholdOverride?: number): ParcelPairing[] => {
    if (!fuse || !query.trim()) return [];

  // Helper to normalize street suffixes
  const normalizeStreetSuffix = (str: string): string => {
    const suffixMap: { [key: string]: string[] } = {
      'street': ['st', 'str'],
      'avenue': ['ave', 'av'],
      'road': ['rd'],
      'place': ['pl'],
      'square': ['sq'],
      'lane': ['ln'],
      'drive': ['dr'],
      'court': ['ct'],
      'circle': ['cir'],
      'boulevard': ['blvd'],
      'terrace': ['ter'],
      'parkway': ['pkwy'],
      'way': ['wy']
    };

    // Convert to lowercase for comparison
    str = str.toLowerCase();
    
    // Check if any suffix matches and replace with full form
    for (const [full, abbrevs] of Object.entries(suffixMap)) {
      if (str === full || abbrevs.includes(str)) {
        return full;
      }
    }
    return str;
  };

  // Check if query is a potential parcel ID (5+ digits, possibly with spaces/hyphens)
  // Strip spaces and hyphens first to check if it's all digits
  const queryWithoutSpacesHyphens = query.replace(/[\s-]/g, '');
  const parcelIdMatch = queryWithoutSpacesHyphens.match(/^\d{5,}$/);  // Must be 5+ digits after removing spaces/hyphens
  const isParcelIdSearch = !!parcelIdMatch;
  

  const queryUnit = !isParcelIdSearch ? extractTrailingUnitFromQuery(query) : null;

  // Strip apartment tokens before removing punctuation so "#48" is not lost.
  const cleanQuery = isParcelIdSearch
    ? queryWithoutSpacesHyphens
    : (() => {
        let t = query.trim().toLowerCase();
        t = stripApartmentSegments(t);
        t = t.replace(/\s+\d{5}(?:-\d{4})?/g, ' ');
        t = t.replace(/[^\w\s-]/g, ' ');
        t = t.replace(/\s+/g, ' ').trim();
        return t;
      })();

    // Split query into parts
    const parts = cleanQuery.split(' ');
    

    try {
      
      // For parcel ID search, use string-based proximity matching
      if (isParcelIdSearch && parcelIdMatch) {
        const queryParcelId = parcelIdMatch[0];
        
        // Find all parcel IDs that contain the query string
        const matchesWithScores = pairings
          .map(p => {
            const parcelIdWithoutHyphens = p.parcelId.replace(/-/g, '');
            
            // Check if the query appears in the parcel ID
            const matchIndex = parcelIdWithoutHyphens.indexOf(queryParcelId);
            
            if (matchIndex === -1) {
              return null; // No match
            }
            
            // Calculate score based on match position and type
            let score = 0;
            
            // Best: Exact match (entire parcel ID)
            if (parcelIdWithoutHyphens === queryParcelId) {
              score = 1000;
            }
            // Second best: Matches from the beginning (prefix)
            else if (matchIndex === 0) {
              score = 500 + queryParcelId.length; // Longer matches rank higher
            }
            // Third best: Matches at the end (suffix)
            else if (matchIndex + queryParcelId.length === parcelIdWithoutHyphens.length) {
              score = 300 + queryParcelId.length; // Longer matches rank higher
            }
            // Fourth: Substring match (somewhere in the middle)
            else {
              // Penalize matches further from the end
              const distanceFromEnd = parcelIdWithoutHyphens.length - (matchIndex + queryParcelId.length);
              score = 100 + queryParcelId.length - distanceFromEnd;
            }
            
            return {
              pairing: p,
              score: score
            };
          })
          .filter((match): match is { pairing: ParcelPairing; score: number } => match !== null);

        // Sort by score (highest first)
        const sortedMatches = matchesWithScores
          .sort((a, b) => b.score - a.score)
          .map(m => m.pairing);

        if (sortedMatches.length > 0) {
          return expandToFullFamilies(sortedMatches.slice(0, 200), 0, 5);
        }
      }

      // Fall back to fuzzy search
      const effectiveThreshold = thresholdOverride ?? 0.4;
      const searchOptions = {
        // @ts-ignore - Fuse.js types are incomplete
        limit: 1000,
        includeScore: true,
        shouldSort: false,
        threshold: effectiveThreshold,
        distance: Math.max(50, Math.round(effectiveThreshold * 250)),
        minMatchCharLength: 2,
        keys: [
          { name: "fullAddress", weight: 2 }
        ]
      };

      const normalizedQuery = normalizeAddressForSearch(cleanQuery);
      const fuseResults = fuse.search(normalizedQuery, searchOptions);

      // Fuse can drop correct matches for longer "number + street" queries (e.g. "505 tremont"
      // returns 50 Tremont first and may omit 505). Include any address that starts with the
      // query so exact matches stay in the candidate set; scoring will rank them.
      // Use normalized strings so "26 court street" matches "26 court st" and "25-55 court st pl".
      const queryHasNumberAndStreet = parts.length >= 2 && /^\d+$/.test(parts[0]);
      let results: FuseResult<ParcelPairingForSearch>[];
      if (queryHasNumberAndStreet && cleanQuery.length >= 4) {
        const prefixMatches: ParcelPairingForSearch[] = [];
        for (const p of pairingsForSearch) {
          if (p.normAddress.startsWith(normalizedQuery)) prefixMatches.push(p);
        }
        const prefixIds = new Set(prefixMatches.map((p) => p.parcelId));
        results = [
          ...prefixMatches.map((item) => ({ item, score: 0, refIndex: 0 })),
          ...fuseResults.filter((r) => !prefixIds.has(r.item.parcelId)),
        ];
      } else if (
        !isParcelIdSearch &&
        !queryHasNumberAndStreet &&
        parts.length >= 2 &&
        normalizedQuery.length >= 4
      ) {
        // Street-first queries (e.g. "Court Street"): ensure substring matches on normalized
        // addresses are not lost to Fuse's limit or fuzzy noise (e.g. "Fourth Street" ranking).
        const seenIds = new Set(fuseResults.map((r) => r.item.parcelId));
        const substringMatches: FuseResult<ParcelPairingForSearch>[] = [];
        for (const p of pairingsForSearch) {
          if (!seenIds.has(p.parcelId) && p.normAddress.includes(normalizedQuery)) {
            substringMatches.push({ item: p, score: 0, refIndex: 0 });
            seenIds.add(p.parcelId);
          }
        }
        results = [...substringMatches, ...fuseResults];
      } else {
        results = fuseResults;
      }



      // Determine query structure: does it start with a street number?
      const queryHasNumber = /^\d/.test(parts[0]);
      // Map query parts to semantic roles based on structure
      // With number:    [number, streetName, suffix, ...]
      // Without number: [streetName, suffix, ...]
      const qNumberPart = queryHasNumber ? parts[0] : null;
      const qStreetPart = queryHasNumber ? parts[1] : parts[0];
      const qSuffixPart = queryHasNumber ? parts[2] : parts[1];

      const scoredResults = results.map((result: FuseResult<ParcelPairingForSearch>) => {
        let score = result.score || 1;

        const address = stripApartmentSegments(
          result.item.fullAddress
            .toLowerCase()
            .replace(/\s+\d{5}(?:-\d{4})?/g, '')
            .replace(/\s*,\s*/g, ' ')
        );

        const addressParts = address.split(/\s+/)
          .map(part => part.trim())
          .filter(part => part.length > 0);

        // Address structure is always [number, streetName, suffix, city...]
        const addrNumber = addressParts[0] || '';
        const addrStreet = addressParts[1] || '';
        const addrSuffix = addressParts[2] || '';
        const streetNum = parseInt(addrNumber.split('-')[0]) || 0;

        if (result.item.normAddress === normalizedQuery) {
          score *= 0.1;
          return { item: result.item, score, streetName: addrStreet, streetNum };
        }

        // --- Street number scoring (dominant when user typed a number: exact match wins over Fuse preference) ---
        if (qNumberPart) {
          const queryNum = parseInt(qNumberPart, 10);
          const [start, end] = addrNumber.split('-').map((n) => parseInt(n, 10));

          if (!isNaN(queryNum) && !isNaN(start)) {
            if (!isNaN(end)) {
              const min = Math.min(start, end);
              const max = Math.max(start, end);
              score *= (queryNum >= min && queryNum <= max) ? 0.01 : 100;
            } else {
              score *= (queryNum === start) ? 0.01 : 100;
            }
          }
        }

        // --- Street name scoring (highest impact) ---
        if (qStreetPart) {
          const queryStreet = qStreetPart.toLowerCase();
          const addrStreetLower = addrStreet.toLowerCase();

          if (addrStreetLower === queryStreet) {
            score *= 0.1;
          } else if (addrStreetLower.startsWith(queryStreet) && queryStreet.length >= 3) {
            score *= 0.3;
          } else if (queryStreet.length >= 4 && addrStreetLower.includes(queryStreet)) {
            score *= 0.6;
          } else {
            score *= 15.0;
          }
        }

        // --- Suffix scoring ---
        if (qSuffixPart) {
          const querySuffix = normalizeStreetSuffix(qSuffixPart);
          const addressSuffix = normalizeStreetSuffix(addrSuffix);

          if (querySuffix && addressSuffix) {
            score *= (querySuffix === addressSuffix) ? 0.5 : 2.0;
          }
        }

        // --- Unit / apartment (when user typed a trailing apt, #, no., etc.) ---
        if (queryUnit) {
          const addrUnit = extractUnitFromAddress(result.item.fullAddress);
          if (addrUnit && !unitsMatch(addrUnit, queryUnit)) {
            score *= 400;
          } else if (addrUnit && unitsMatch(addrUnit, queryUnit)) {
            score *= 0.05;
          } else if (!addrUnit) {
            score *= 2.5;
          }
        }

        return { item: result.item, score, streetName: addrStreet, streetNum };
      });

      // Sort by score, then when scores are close prefer exact street-number match, then street number ascending
      const queryNumForSort = qNumberPart ? parseInt(qNumberPart, 10) : NaN;
      scoredResults.sort((a, b) => {
        const scoreDiff = a.score - b.score;
        if (scoreDiff !== 0) {
          // Use a relative tolerance: treat scores within 10% of each other as equivalent
          const avg = (a.score + b.score) / 2;
          if (Math.abs(scoreDiff) > avg * 0.1) return scoreDiff;
        }
        // When query includes a street number, prefer the result that matches it (e.g. "505 tre" → 505 before 50)
        if (!isNaN(queryNumForSort)) {
          const aMatches = a.streetNum === queryNumForSort ? 1 : 0;
          const bMatches = b.streetNum === queryNumForSort ? 1 : 0;
          if (bMatches - aMatches !== 0) return bMatches - aMatches;
        }
        if (a.streetName === b.streetName) return a.streetNum - b.streetNum;
        return scoreDiff;
      });

      // Filter out results that score much worse than the best match.
      // At higher thresholds we intentionally allow fuzzier matches through.
      const scoreMultiplier = 50 * Math.pow(effectiveThreshold / 0.2, 2);
      const bestScore = scoredResults[0]?.score ?? 1;
      const maxAllowedScore = bestScore * scoreMultiplier;
      const filteredResults = scoredResults
        .filter((r: { score: number }) => r.score <= maxAllowedScore)
        .map((result: { item: ParcelPairing, score: number }) => result.item);

      return expandToFullFamilies(filteredResults.slice(0, 200), 50, 5);
    } catch (error) {
      console.error('[useParcelPairings] Error in fuzzy search:', error);
      return [];
    }
  };

  // Refresh cache function
  const refreshCache = async () => {
    await indexedDBService.clearCache();
    await loadPairings();
  };

  // Load pairings on mount
  useEffect(() => {
    loadPairings();
  }, []);

  return {
    pairings,
    fuse,
    prefixIndex,
    isLoading,
    error,
    search,
    refreshCache
  };
} 