/**
 * Hook for managing parcel ID address pairings with caching and fuzzy search
 */

import { useState, useEffect, useMemo } from 'react';
import Fuse, { FuseResult } from 'fuse.js';
import { getCurrentParcelIdAddressPairings } from './firebaseConfig';
import { indexedDBService } from './useIndexedDB';
import { getMasterPrefix } from '@utils/parcelGrouping';

interface ParcelPairing {
  parcelId: string;
  fullAddress: string;
}

interface UseParcelPairingsReturn {
  pairings: ParcelPairing[];
  fuse: Fuse<ParcelPairing> | null;
  isLoading: boolean;
  error: string | null;
  search: (query: string, thresholdOverride?: number) => ParcelPairing[];
  refreshCache: () => Promise<void>;
}

export function useParcelPairings(): UseParcelPairingsReturn {
  const [pairings, setPairings] = useState<ParcelPairing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Fuse.js for fuzzy searching
  const fuse = useMemo(() => {
    if (pairings.length === 0) return null;
    
    // Simple default Fuse.js options
    return new Fuse(pairings, {
      keys: ['fullAddress'],
      includeScore: true,
      threshold: 0.3,
      minMatchCharLength: 2,
      shouldSort: false
    });
  }, [pairings]);

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
   */
  const expandToFullFamilies = (results: ParcelPairing[], maxGroups: number = 0): ParcelPairing[] => {
    const seen = new Set<string>();
    const expandedPrefixes = new Set<string>();
    const expanded: ParcelPairing[] = [];

    for (const result of results) {
      if (seen.has(result.parcelId)) continue;
      seen.add(result.parcelId);

      const prefix = getMasterPrefix(result.parcelId);

      // If we haven't expanded this family yet, pull in all siblings
      if (!expandedPrefixes.has(prefix)) {
        if (maxGroups > 0 && expandedPrefixes.size >= maxGroups) {
          // Past the group limit: just add the matched result without expansion
          expanded.push(result);
          continue;
        }
        expandedPrefixes.add(prefix);
        // Add the current match first
        expanded.push(result);
        // Pull in all siblings from the prefix index
        const family = prefixIndex.get(prefix) || [];
        for (const sibling of family) {
          if (!seen.has(sibling.parcelId)) {
            seen.add(sibling.parcelId);
            expanded.push(sibling);
          }
        }
      } else {
        // Family was already expanded from an earlier match; this is a duplicate – skip
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
  const search = (query: string, _thresholdOverride?: number): ParcelPairing[] => {
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
  

  // For parcel ID search, just use the query without spaces/hyphens
  const cleanQuery = isParcelIdSearch ? queryWithoutSpacesHyphens : query.trim().toLowerCase()
    .replace(/[^\w\s-]/g, ' ')  // Replace special chars with space
    .replace(/\s+#\s*[\w-]+/g, '')  // Remove apartment numbers (e.g., #20-1)
    .replace(/\s+\d{5}(?:-\d{4})?/g, '')  // Remove zip codes (e.g., 02119 or 02119-1234)
    .replace(/\s+/g, ' ')       // Normalize spaces
    .trim();

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
          // Expand to full families so every group is complete
          return expandToFullFamilies(sortedMatches);
        }
      }

      // Fall back to fuzzy search
      const searchOptions = {
        // @ts-ignore - Fuse.js types are incomplete
        limit: 1000,  // Get all potential matches
        includeScore: true,    // We need the Fuse.js scores
        shouldSort: false,     // We'll do our own sorting based on custom scoring
        threshold: 0.2,        // Strict matching
        distance: 50,          // Keep matches close
        minMatchCharLength: 2,
        keys: [
          { name: "fullAddress", weight: 2 }
        ]
      };
      
      const results = fuse.search(cleanQuery, searchOptions);



      // Score and sort results
      const scoredResults = results.map((result: FuseResult<ParcelPairing>) => {
        let score = result.score || 1;


        // Remove apartment numbers and zip codes from address for comparison
        const address = result.item.fullAddress.toLowerCase()
          .replace(/\s+#\s*[\w-]+/g, '')  // Remove apartment numbers
          .replace(/\s+\d{5}(?:-\d{4})?/g, '')  // Remove zip codes
          .replace(/\s*,\s*/g, ' ');  // Replace commas with spaces
        
        // Split by spaces or hyphens, but keep hyphenated numbers together
        const addressParts = address.split(/\s+/)
          .map(part => part.trim())
          .filter(part => part.length > 0);
        
        // Identify if this part is a city name (usually last or second to last part)
        const isCityPart = (part: string, index: number) => {
          const fromEnd = addressParts.length - index;
          return fromEnd <= 2 && !normalizeStreetSuffix(part); // Not a street suffix
        };

        // Exact matches get highest priority
        if (address === cleanQuery) {
          score *= 0.1;
          return { item: result.item, score };
        }
        
        // Check each query part against address parts
        parts.forEach((part: string, i: number) => {
          // Number matching
          if (/^\d+$/.test(part)) {
            // Only check numbers at the start of address
            if (i === 0 && addressParts[0]) {
              // Strict number matching with range support
              const queryNum = parseInt(part);
              const [start, end] = addressParts[0].split('-').map(n => parseInt(n));
              
              if (isNaN(queryNum) || isNaN(start)) return;
              
              
              // Handle ranges and exact matches
              if (!isNaN(end)) {
                // It's a range - check if number is within it (inclusive)
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                
                if (queryNum >= min && queryNum <= max) {
                  score *= 0.01; // Best score for number in range
                } else {
                  // Heavy penalty for numbers outside range
                  score *= 50.0;
                }
              } else {
                // Single number - must match exactly or heavy penalty
                if (queryNum === start) {
                  score *= 0.01; // Best score for exact match
                } else {
                  // Very heavy penalty for non-matching numbers
                  score *= 50.0;
                }
              }
            }
          } 
          // Word matching
          else {
            // Check if this is a city part
            if (isCityPart(addressParts[i], i)) {
              const cityPart = addressParts[i].toLowerCase();
              const queryPart = part.toLowerCase();
              
              
              if (cityPart === queryPart) {
                score *= 0.8; // Minimal impact for matching city
              } else {
                score *= 1.2; // Very small penalty for non-matching city
              }
            }
            // Street name matching with extreme priority
            else if (i === 1 && addressParts[1]) {
              const streetPart = addressParts[1].toLowerCase();
              const queryPart = part.toLowerCase();
              
              
              if (streetPart === queryPart) {
                score *= 0.0001; // Ultra high priority for exact street match
              } else if (streetPart.startsWith(queryPart) && queryPart.length >= 4) {
                score *= 0.01; // High priority for substantial prefix match
              } else {
                score *= 200.0; // Extreme penalty for non-matching street
              }
            }
            // Suffix matching with normalization
            else if (i === 2 && addressParts[2]) {
              const querySuffix = normalizeStreetSuffix(part);
              const addressSuffix = normalizeStreetSuffix(addressParts[2]);
              
              
              if (querySuffix === addressSuffix) {
                score *= 0.1; // Good score for matching suffix
              } else {
                score *= 3.0; // Moderate penalty for non-matching suffix
              }
            }
          }
        });

        return { item: result.item, score };
      });

      // Sort by score and return results
      const sortedResults = scoredResults
        .sort((a: { score: number }, b: { score: number }) => a.score - b.score)
        .map((result: { item: ParcelPairing, score: number }) => {
          return result.item;
        });

      // Expand to full families (limit to top 50 groups for address searches)
      return expandToFullFamilies(sortedResults, 50);
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
    isLoading,
    error,
    search,
    refreshCache
  };
} 