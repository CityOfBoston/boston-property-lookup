import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams} from 'react-router-dom';
import SearchResultsLayout from '@layouts/SearchResultsLayout';
import WelcomeContent from '@components/WelcomeContent';
import { getComponentText } from '@utils/contentMapper';
import { SearchBarContainer } from '@containers/SearchBarContainer';
import { ComplexFeedbackSenderContainer } from '@containers/ComplexFeedbackSenderContainer';
import PropertySearchHelp from '@components/PropertySearchHelp';
import ResponsiveTable from '@components/ResponsiveTable';
import { LoadingIndicator } from '@components/LoadingIndicator';
import type { RowMeta } from '@components/ResponsiveTable/ResponsiveTable';
import { useSearchResults } from '@hooks/useSearchResults';
import { usePerformanceTracking } from '@services/analytics';
import styles from './SearchResultsPage.module.scss';
import { toWords } from 'number-to-words';

/** Maximum number of children shown per group before collapsing */
const CHILDREN_VISIBLE_LIMIT = 4;

export default function SearchResultsPage() {
  const welcomeContent = getComponentText('WelcomeContent');
  const searchBarContent = getComponentText('AnnotatedSearchBar');
  const searchHelpContent = getComponentText('PropertySearchHelp');
  const searchResultsContent = getComponentText('PropertySearchResults');
  const loadingContent = getComponentText('LoadingIndicator');
  const commonContent = getComponentText('common');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const shouldBlurRef = useRef(false);
  const performance = usePerformanceTracking('SearchResults');
  const renderStartTimeRef = useRef(0);

  const { searchResults, groupedResults, isLoading, isLoadingMore, error, hasMore, performSearch, loadMore } = useSearchResults();

  const handlePropertySelect = (pid: string, fullAddress?: string) => {
    console.log('[SearchResultsPage] handlePropertySelect called with pid:', pid, 'address:', fullAddress);
    navigate(`/details?parcelId=${pid}`);
  };

  const handleSearch = (searchTerm: string) => {
    console.log('[SearchResultsPage] handleSearch called with term:', searchTerm);
    
    // Check if it's the same query as currently displayed
    if (searchTerm === query) {
      console.log('[SearchResultsPage] Same query, forcing reload by performing search directly');
      // Set flag to blur after results are received
      shouldBlurRef.current = true;
      // Force reload by calling performSearch directly instead of navigating
      performSearch(searchTerm);
    } else {
      // Navigate to new search results with the new query
      console.log('[SearchResultsPage] Different query, navigating to new search');
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query, performSearch]);

  // Blur the search button when search completes (only for same-query reloads)
  useEffect(() => {
    if (!isLoading && shouldBlurRef.current) {
      console.log('[SearchResultsPage] Search completed, blurring active element');
      shouldBlurRef.current = false;
      
      // Blur the currently focused element (search button)
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
    }
  }, [isLoading]);

  // Get results array or empty array if no results
  const results = searchResults?.results || [];
  
  // Determine error message based on different scenarios
  const getErrorMessage = () => {
    if (error) {
      return commonContent.errors.general;
    }
    
    if (!isLoading && query && results.length === 0) {
      return searchHelpContent.noResultsMessage.replace('{query}', query);
    }
    
    return undefined;
  };

  const errorMessage = getErrorMessage();

  // Build flattened table data and row metadata from grouped results
  const { tableData, rowMeta } = useMemo(() => {
    const tableRows: Record<string, string | number | React.ReactNode>[] = [];
    const meta: RowMeta[] = [];

    for (let gi = 0; gi < groupedResults.length; gi++) {
      const group = groupedResults[gi];
      const hasMoreChildren = group.totalChildCount > CHILDREN_VISIBLE_LIMIT;
      const visibleChildren = hasMoreChildren
        ? group.children.slice(0, CHILDREN_VISIBLE_LIMIT)
        : group.children;
      const isOrphanGroup = !group.masterParcel;
      const masterParcelId = group.masterPrefix + '000';

      if (group.masterParcel) {
        const result = group.masterParcel;
        tableRows.push({
          _parcelId: result.parcelId.toString(),
          'Parcel ID': result.parcelId.toString(),
          [searchResultsContent.columnHeaders.address]: result.address,
          [searchResultsContent.columnHeaders.owner]: result.owners.join(', '),
          [searchResultsContent.columnHeaders.value]: result.value === 0 ? '-' : `$${result.value.toLocaleString()}`,
        });
        meta.push({
          isMaster: true,
          isChild: false,
          isLastInGroup: group.children.length === 0,
        });
      }

      const hasChildren = group.children.length > 0;

      for (let ci = 0; ci < visibleChildren.length; ci++) {
        const result = visibleChildren[ci];
        const isLastVisible = ci === visibleChildren.length - 1;
        const isLastInGroup = isLastVisible && !hasMoreChildren;
        tableRows.push({
          _parcelId: result.parcelId.toString(),
          'Parcel ID': result.parcelId.toString(),
          [searchResultsContent.columnHeaders.address]: result.address,
          [searchResultsContent.columnHeaders.owner]: result.owners.join(', '),
          [searchResultsContent.columnHeaders.value]: `$${result.value.toLocaleString()}`,
        });
        meta.push({
          isMaster: isOrphanGroup,
          isChild: !isOrphanGroup,
          isLastInGroup,
        });
      }

      // "View all X units" link row pointing to master parcel page
      if (hasChildren) {
        const totalCount = group.totalChildCount ?? group.children.length;
        const viewAllText = searchResultsContent.showAllUnits
          ?.replace('{count}', totalCount.toString()) || `View all ${totalCount} units`;
        tableRows.push({
          _parcelId: '',
          _viewAllLink: `#/master-parcel?parcelId=${masterParcelId}`,
          _viewAllText: viewAllText,
          _mobileOnly: !hasMoreChildren,
          'Parcel ID': '',
          [searchResultsContent.columnHeaders.address]: '',
          [searchResultsContent.columnHeaders.owner]: '',
          [searchResultsContent.columnHeaders.value]: '',
        });
        meta.push({
          isMaster: false,
          isChild: true,
          isLastInGroup: true,
        });
      }

    }

    return { tableData: tableRows, rowMeta: meta };
  }, [groupedResults, searchResultsContent]);

  return (
    <SearchResultsLayout
      searchContent={
        <WelcomeContent
          {...welcomeContent}
          additionalContent={
            <SearchBarContainer
              onSelect={handlePropertySelect}
              onSearch={handleSearch}
              {...searchBarContent}
              preloadValue={query}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          }
          hideTitleAndDescriptionOnMobile={isSearchFocused}
        />
      }
    >
      <div className={styles.resultsArea}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <LoadingIndicator 
              message={loadingContent.message}
              size="medium" 
            />
          </div>
        ) : results && results.length > 0 ? (
          <div className={styles.resultsContainer}>
            <h1 className={styles.resultsHeader}>{searchResultsContent.heading}</h1>
            <div className={styles.resultsDescriptionRow}>
              <p className={styles.resultsDescription}>
                {searchResultsContent.resultsCount
                  .replace('{count}', toWords(results.length))
                  .replace('{number}', results.length.toString())
                  .replace('{groupCount}', groupedResults.length.toString())}
              </p>
              <ComplexFeedbackSenderContainer searchQuery={query} variant="default" />
            </div>
            <div className={styles.resultsTable}>
              {(() => {
                renderStartTimeRef.current = window.performance.now();
                return (
                  <ResponsiveTable
                    data={tableData}
                    rowMeta={rowMeta}
                    showDetails={true}
                    showMapLink={true}
                    onLoad={() => {
                      const renderTime = window.performance.now() - renderStartTimeRef.current;
                      performance.trackRender(renderTime);
                    }}
                  />
                );
              })()}
            </div>
            <div className={styles.loadMoreContainer}>
              <button
                className="usa-button"
                onClick={loadMore}
                disabled={isLoadingMore || !hasMore}
              >
                {isLoadingMore ? 'LOADING...' : hasMore ? 'LOAD MORE' : 'NO MORE RESULTS'}
              </button>
            </div>
          </div>
        ) : (
          <PropertySearchHelp 
            searchQuery={query} 
            searchTips={searchHelpContent.tips}
            feedbackLink={<ComplexFeedbackSenderContainer searchQuery={query} variant="default" />}
          />
        )}
      </div>
    </SearchResultsLayout>
  );
}
