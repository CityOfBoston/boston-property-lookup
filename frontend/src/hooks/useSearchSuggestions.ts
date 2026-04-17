import { useState, useCallback, useEffect, useRef, startTransition, useMemo } from 'react';
import { useParcelPairingsContext } from './useParcelPairingsContext';

interface UseSearchSuggestionsOptions {
  debounceMs?: number;
  maxSuggestions?: number;
  minQueryLength?: number;
  isMobile?: boolean;
  threshold?: number;
}

interface SearchSuggestion {
  parcelId: string;
  fullAddress: string;
}

/**
 * Suggestion list updates are debounced: work runs only after the query has been
 * stable for `debounceMs`. Each keystroke bumps `searchSeqRef` so in-flight
 * results are dropped. Result state updates use startTransition so the input
 * stays responsive. Loading is true while the input does not yet match the
 * suggestions snapshot (debounce pending or search running).
 */
export const useSearchSuggestions = ({
  debounceMs = 500,
  maxSuggestions = 20,
  minQueryLength = 1,
  isMobile = false,
  threshold,
}: UseSearchSuggestionsOptions = {}) => {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { search, isLoading: isPairingsLoading, error } = useParcelPairingsContext();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Bumps on every `searchValue` change so stale suggestion work is ignored. */
  const searchSeqRef = useRef(0);
  const latestSearchRef = useRef(searchValue);
  latestSearchRef.current = searchValue;

  const effectiveDebounceMs = isMobile ? Math.round(debounceMs * 1.15) : debounceMs;

  // Debounce: only commit `debouncedValue` after the query stops changing.
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = searchValue.trim();
    if (!trimmed || trimmed.length < minQueryLength) {
      setDebouncedValue('');
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      setDebouncedValue(latestSearchRef.current.trim());
    }, effectiveDebounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [searchValue, effectiveDebounceMs, minQueryLength]);

  // Invalidate in-flight work as soon as the query changes (stale search results discarded).
  useEffect(() => {
    searchSeqRef.current += 1;
  }, [searchValue]);

  // Run search only when `debouncedValue` updates (after idle debounce).
  useEffect(() => {
    const trimmed = debouncedValue.trim();
    if (!trimmed || trimmed.length < minQueryLength) {
      return;
    }

    const seqAtStart = searchSeqRef.current;
    setIsSearching(true);

    try {
      const searchResults = search(trimmed, threshold);

      if (seqAtStart !== searchSeqRef.current) {
        setIsSearching(false);
        return;
      }

      const transformedResults = searchResults.slice(0, maxSuggestions).map((result) => ({
        parcelId: result.parcelId,
        fullAddress: result.fullAddress,
      }));

      startTransition(() => {
        setSuggestions(transformedResults);
        setIsSearching(false);
      });
    } catch (err) {
      console.error('[useSearchSuggestions] Search error:', err);
      if (seqAtStart === searchSeqRef.current) {
        startTransition(() => {
          setSuggestions([]);
          setIsSearching(false);
        });
      }
    }
  }, [debouncedValue, minQueryLength, search, maxSuggestions, threshold]);

  const handleSetSearchValue = useCallback(
    (value: string) => {
      setSearchValue(value);

      if (!value.trim() || value.trim().length < minQueryLength) {
        setSuggestions([]);
        setIsSearching(false);
      }
    },
    [minQueryLength],
  );

  const trimmedQuery = searchValue.trim();
  const trimmedDebounced = debouncedValue.trim();

  const suggestionsMatchCurrentQuery = useMemo(() => {
    if (trimmedQuery.length < minQueryLength) {
      return true;
    }
    return trimmedQuery === trimmedDebounced && !isSearching;
  }, [trimmedQuery, trimmedDebounced, minQueryLength, isSearching]);

  /** True while debounce hasn't caught the typed query or a search for the committed query is running. */
  const isSuggestionsLoading =
    trimmedQuery.length >= minQueryLength && !suggestionsMatchCurrentQuery;

  /** Pairings download, or suggestions list not yet aligned with the input (for the search bar UI). */
  const isLoading = isPairingsLoading || isSuggestionsLoading;

  return {
    suggestions,
    isLoading,
    isPairingsLoading,
    isSuggestionsLoading,
    error,
    searchValue,
    setSearchValue: handleSetSearchValue,
  };
};
