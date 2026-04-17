import { useSearchSuggestions } from '@hooks/useSearchSuggestions';
import { AnnotatedSearchBar } from '@components/AnnotatedSearchBar';
import { LoadingIndicator } from '@components/LoadingIndicator';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComponentText } from '@utils/contentMapper';

interface SearchBarContainerProps {
  onSelect?: (pid: string, fullAddress: string) => void;
  onSearch?: (searchTerm: string) => void;
  labelText?: string;
  helperText?: string;
  placeholderText?: string;
  debounceMs?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  errorMessage?: string;
  value?: string;
  preloadValue?: string;
}

interface SearchSuggestion {
  parcelId: string;
  fullAddress: string;
}

export const SearchBarContainer = ({
  onSelect,
  onSearch,
  labelText,
  helperText,
  placeholderText,
  debounceMs = 500,
  onFocus,
  onBlur,
  onClear,
  errorMessage,
  value,
  preloadValue,
}: SearchBarContainerProps) => {
  const navigate = useNavigate();
  const searchBarContent = getComponentText('AnnotatedSearchBar');
  
  // Use props if provided, otherwise fall back to YAML content
  const finalLabelText = labelText || searchBarContent.labelText;
  const finalHelperText = helperText || searchBarContent.helperText;
  const finalPlaceholderText = placeholderText || searchBarContent.placeholderText;
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasBeenFocused, setHasBeenFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    suggestions,
    isLoading,
    isPairingsLoading,
    error,
    searchValue,
    setSearchValue,
  } = useSearchSuggestions({ 
    debounceMs,
    isMobile 
  });

  const isClearing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with preload value if provided and not yet focused
  useEffect(() => {
    if (preloadValue && !hasBeenFocused && !searchValue) {
      setSearchValue(preloadValue);
    }
  }, [preloadValue, hasBeenFocused, searchValue, setSearchValue]);

  // Hide suggestions and blur input after search
  const hideSuggestionsAndBlur = useCallback(() => {
    setShowSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur();
  }, []);

  const handleSearch = useCallback((searchTerm: string) => {
    console.log('[SearchBarContainer] Search triggered with term:', searchTerm);
    
    if (!searchTerm.trim()) {
      console.log('[SearchBarContainer] Empty search term, ignoring');
      hideSuggestionsAndBlur();
      return;
    }


    // If custom onSearch handler is provided, use it
    if (onSearch) {
      console.log('[SearchBarContainer] Using custom search handler');
      hideSuggestionsAndBlur();
      onSearch(searchTerm);
      return;
    }

    // Default behavior: If there's exactly one suggestion and it matches the search term closely
    if (suggestions.length === 1) {
      const suggestion = suggestions[0];
      console.log('[SearchBarContainer] Single suggestion found, selecting:', suggestion);
      onSelect?.(suggestion.parcelId, suggestion.fullAddress);
    } else {
      // Navigate to search results page for all other cases
      console.log('[SearchBarContainer] Navigating to search results for term:', searchTerm);
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
    hideSuggestionsAndBlur();
  }, [suggestions, onSelect, onSearch, navigate, hideSuggestionsAndBlur]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    console.log('[SearchBarContainer] Suggestion clicked:', suggestion);
    

    if (onSelect) {
      onSelect(suggestion.parcelId, suggestion.fullAddress);
    } else {
      console.warn('[SearchBarContainer] No onSelect function provided');
    }
  }, [onSelect]);

  const handleInputChange = useCallback((value: string) => {
    console.log('[SearchBarContainer] Input changed:', value);
    setSearchValue(value);
    setShowSuggestions(true);
  }, [setSearchValue]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
    isClearing.current = false;
    
    // Clear preload value on first focus for convenience
    if (!hasBeenFocused && preloadValue && searchValue === preloadValue) {
      setSearchValue('');
      setHasBeenFocused(true);
    } else if (!hasBeenFocused) {
      setHasBeenFocused(true);
    }
    
    onFocus?.();
  }, [hasBeenFocused, preloadValue, searchValue, setSearchValue, onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Check if the related target is the clear button
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.classList.contains('clearButton')) {
      return;
    }

    if (!isClearing.current) {
      setIsFocused(false);
      setShowSuggestions(false);
      onBlur?.();
    }
  }, [onBlur]);

  const handleClear = useCallback(() => {
    isClearing.current = true;
    setSearchValue('');
    setShowSuggestions(false);
    setHasBeenFocused(true); // Mark as focused so preload won't come back
    onClear?.();
    // Refocus the input after clearing
    inputRef.current?.focus();
    // Reset the clearing flag after a short delay
    setTimeout(() => {
      isClearing.current = false;
    }, 100);
  }, [setSearchValue, onClear]);

  // Transform suggestions to match AnnotatedSearchBar interface
  const transformedSuggestions = suggestions.map((suggestion: SearchSuggestion) => ({
    fullAddress: suggestion.fullAddress,
    parcelId: suggestion.parcelId,
  }));

  // Hide error message when input is focused
  const displayErrorMessage = isFocused ? undefined : (errorMessage || error || undefined);

  console.log('[SearchBarContainer] Rendering with:', {
    suggestionsCount: transformedSuggestions.length,
    isLoading,
    hasError: !!error,
    isFocused,
    preloadValue,
    hasBeenFocused
  });

  // Full-page loader only while parcel pairings are downloading (not while debouncing search).
  if (isPairingsLoading && !isFocused) {
    return (
      <div style={{ padding: '2rem' }}>
        <LoadingIndicator 
          message="Loading property data..." 
          size="medium" 
        />
      </div>
    );
  }

  return (
    <AnnotatedSearchBar
      labelText={finalLabelText}
      helperText={finalHelperText}
      placeholderText={finalPlaceholderText}
      value={value || searchValue}
      onChange={handleInputChange}
      onSuggestionClick={handleSuggestionClick}
      suggestions={transformedSuggestions}
      loading={isLoading && isFocused}
      errorMessage={displayErrorMessage}
      onSearch={handleSearch}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClear={handleClear}
      inputRef={inputRef}
      showSuggestions={showSuggestions && isFocused}
      searchButtonText={searchBarContent.searchButtonText}
      clearButtonText={searchBarContent.clearButtonText}
      cancelButtonText={searchBarContent.cancelButtonText}
      loadingText={searchBarContent.loadingText}
      noResultsText={searchBarContent.noResultsText}
      suggestionsFooterText={searchBarContent.suggestionsFooterText}
      parcelIdPrefix={searchBarContent.parcelIdPrefix}
      searchInputAriaLabel={searchBarContent.searchInputAriaLabel}
      clearButtonAriaLabel={searchBarContent.clearButtonAriaLabel}
      searchButtonAriaLabel={searchBarContent.searchButtonAriaLabel}
      suggestionsAriaLabel={searchBarContent.suggestionsAriaLabel}
      modalAriaLabel={searchBarContent.modalAriaLabel}
      closeModalAriaLabel={searchBarContent.closeModalAriaLabel}
    />
  );
};