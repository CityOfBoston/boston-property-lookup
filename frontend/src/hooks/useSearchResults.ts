import { useState, useCallback, useRef } from 'react';
import { fetchPropertySummariesByParcelIds } from './firebaseConfig';
import { useParcelPairingsContext } from './useParcelPairingsContext';
import type { PropertySearchResults, ParcelGroup } from '../types';
import { groupByMasterParcel, getMasterPrefix } from '@utils/parcelGrouping';

const GROUPS_PER_PAGE = 10;
// Start permissive (0.4) so queries like "505 tremont" include the right address; scoring ranks/filters.
const THRESHOLDS = [0.4, 0.5, 0.6];

interface UseSearchResultsReturn {
  searchResults: PropertySearchResults | null;
  groupedResults: ParcelGroup[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  performSearch: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Groups pairings by 7-digit prefix, preserving search relevance order.
 * Returns arrays of parcel IDs per group.
 */
function buildPrefixGroups(pairings: { parcelId: string }[]): string[][] {
  const map = new Map<string, string[]>();
  const order: string[] = [];
  for (const p of pairings) {
    const prefix = getMasterPrefix(p.parcelId);
    if (!map.has(prefix)) {
      map.set(prefix, []);
      order.push(prefix);
    }
    map.get(prefix)!.push(p.parcelId);
  }
  return order.map(prefix => map.get(prefix)!);
}

export const useSearchResults = (): UseSearchResultsReturn => {
  const [searchResults, setSearchResults] = useState<PropertySearchResults | null>(null);
  const [groupedResults, setGroupedResults] = useState<ParcelGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { search } = useParcelPairingsContext();

  // Stable refs for values used inside callbacks
  const searchRef = useRef(search);
  searchRef.current = search;

  // Pagination tracking
  const prefixGroupsRef = useRef<string[][]>([]);
  const nextGroupIdxRef = useRef(0);
  const thresholdIdxRef = useRef(0);
  const seenIdsRef = useRef(new Set<string>());
  const queryRef = useRef('');

  // Rate limiting and cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearchTimeRef = useRef<number>(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch summaries for a slice of prefix groups and update state.
   * Returns true if there are more groups remaining after this slice.
   */
  const fetchGroupSlice = useCallback(async (
    startIdx: number,
    count: number,
    isInitial: boolean,
  ): Promise<boolean> => {
    const groups = prefixGroupsRef.current;
    const endIdx = Math.min(startIdx + count, groups.length);

    if (startIdx >= groups.length) return false;

    const parcelIds: string[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      for (const id of groups[i]) {
        if (!seenIdsRef.current.has(id)) {
          seenIdsRef.current.add(id);
          parcelIds.push(id);
        }
      }
    }

    nextGroupIdxRef.current = endIdx;

    if (parcelIds.length === 0) return endIdx < groups.length;

    const orderMap = new Map(parcelIds.map((id, i) => [id, i]));
    const summaries = await fetchPropertySummariesByParcelIds(parcelIds);

    if (summaries.results) {
      summaries.results.sort((a, b) =>
        (orderMap.get(a.parcelId) ?? Infinity) - (orderMap.get(b.parcelId) ?? Infinity)
      );
    }

    const newGroups = groupByMasterParcel(summaries.results || []);

    if (isInitial) {
      setSearchResults(summaries);
      setGroupedResults(newGroups);
    } else {
      setSearchResults(prev => ({
        results: [...(prev?.results || []), ...(summaries.results || [])],
      }));
      setGroupedResults(prev => [...prev, ...newGroups]);
    }

    return endIdx < groups.length;
  }, []);

  /**
   * Escalate through remaining threshold levels until new results are found
   * or all levels are exhausted.
   * Returns true if more results/thresholds are available after loading.
   */
  const advanceThreshold = useCallback(async (): Promise<boolean> => {
    while (thresholdIdxRef.current < THRESHOLDS.length - 1) {
      thresholdIdxRef.current++;
      const threshold = THRESHOLDS[thresholdIdxRef.current];

      const fuzzyResults = searchRef.current(queryRef.current, threshold);
      const newResults = fuzzyResults.filter(r => !seenIdsRef.current.has(r.parcelId));

      if (newResults.length === 0) continue;

      const groups = buildPrefixGroups(newResults);
      prefixGroupsRef.current = groups;
      nextGroupIdxRef.current = 0;

      const moreInSlice = await fetchGroupSlice(0, GROUPS_PER_PAGE, false);
      return moreInSlice || thresholdIdxRef.current < THRESHOLDS.length - 1;
    }
    return false;
  }, [fetchGroupSlice]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setGroupedResults([]);
      setError(null);
      setHasMore(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTimeRef.current;
    const minSearchInterval = 200;

    if (timeSinceLastSearch < minSearchInterval) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(
        () => performSearch(query),
        minSearchInterval - timeSinceLastSearch,
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      lastSearchTimeRef.current = Date.now();
      abortControllerRef.current = new AbortController();

      // Reset pagination
      seenIdsRef.current = new Set();
      thresholdIdxRef.current = 0;
      queryRef.current = query;

      const fuzzyResults = searchRef.current(query, THRESHOLDS[0]);

      if (abortControllerRef.current.signal.aborted) return;

      if (fuzzyResults.length === 0) {
        setSearchResults({ results: [] });
        setGroupedResults([]);
        setHasMore(false);
        return;
      }

      const groups = buildPrefixGroups(fuzzyResults);
      prefixGroupsRef.current = groups;
      nextGroupIdxRef.current = 0;

      if (abortControllerRef.current.signal.aborted) return;

      const moreInSlice = await fetchGroupSlice(0, GROUPS_PER_PAGE, true);

      if (abortControllerRef.current.signal.aborted) return;

      setHasMore(moreInSlice || thresholdIdxRef.current < THRESHOLDS.length - 1);
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('[useSearchResults] Error performing search:', err);
        setError(err instanceof Error ? err : new Error('Failed to perform search'));
        setSearchResults(null);
        setGroupedResults([]);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fetchGroupSlice]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    setError(null);

    try {
      const nextIdx = nextGroupIdxRef.current;
      const groups = prefixGroupsRef.current;
      let moreAvailable: boolean;

      if (nextIdx < groups.length) {
        moreAvailable = await fetchGroupSlice(nextIdx, GROUPS_PER_PAGE, false);
        if (!moreAvailable) {
          moreAvailable = thresholdIdxRef.current < THRESHOLDS.length - 1;
        }
      } else {
        moreAvailable = await advanceThreshold();
      }

      setHasMore(moreAvailable);
    } catch (err) {
      console.error('[useSearchResults] Error loading more:', err);
      setError(err instanceof Error ? err : new Error('Failed to load more results'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchGroupSlice, advanceThreshold]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  }, []);

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    searchResults,
    groupedResults,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    performSearch,
    loadMore,
  };
};
