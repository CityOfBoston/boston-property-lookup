import { useState, useCallback, useRef } from 'react';
import { fetchPropertySummariesByParcelIds } from './firebaseConfig';
import { useParcelPairingsContext } from './useParcelPairingsContext';
import type { PropertySearchResults } from '../types';

interface UseSearchResultsReturn {
  searchResults: PropertySearchResults | null;
  isLoading: boolean;
  error: Error | null;
  performSearch: (query: string) => Promise<void>;
}

export const useSearchResults = (): UseSearchResultsReturn => {
  const [searchResults, setSearchResults] = useState<PropertySearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { search } = useParcelPairingsContext();
  
  // Refs for request cancellation and rate limiting
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearchTimeRef = useRef<number>(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setError(null);
      return;
    }

    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Rate limiting - prevent too frequent searches
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTimeRef.current;
    const minSearchInterval = 200; // Reduced from 500ms for more responsiveness
    
    if (timeSinceLastSearch < minSearchInterval) {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Schedule search for later
      const delay = minSearchInterval - timeSinceLastSearch;
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, delay);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      lastSearchTimeRef.current = Date.now();
      
      // Create new abort controller for this search
      abortControllerRef.current = new AbortController();
      
      
      // Use fuzzy search to find matching parcel IDs
      const fuzzyResults = search(query);
      
      // Check if search was cancelled
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      if (fuzzyResults.length === 0) {
        setSearchResults({ results: [] });
        return;
      }

      // Keep track of original order using a Map
      const orderMap = new Map(fuzzyResults.map((result, index) => [result.parcelId, index]));
      
      // Extract parcel IDs from fuzzy search results and limit to 1000
      const parcelIds = fuzzyResults.map(result => result.parcelId).slice(0, 500);
      
      // Check if search was cancelled
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      
      // Fetch property summaries for the found parcel IDs
      const summaries = await fetchPropertySummariesByParcelIds(parcelIds);
      
      // Check if search was cancelled
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      // Sort results to maintain original fuzzy search order
      if (summaries.results) {
        summaries.results.sort((a, b) => {
          const orderA = orderMap.get(a.parcelId) ?? Number.MAX_VALUE;
          const orderB = orderMap.get(b.parcelId) ?? Number.MAX_VALUE;
          return orderA - orderB;
        });
      }
      
      
      setSearchResults(summaries);
    } catch (err) {
      // Only handle error if search wasn't cancelled
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('[useSearchResults] Error performing search:', err);
        setError(err instanceof Error ? err : new Error('Failed to perform search'));
        setSearchResults(null);
      }
    } finally {
      // Only update loading state if search wasn't cancelled
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [search]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Add cleanup to window unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    searchResults,
    isLoading,
    error,
    performSearch,
  };
}; 