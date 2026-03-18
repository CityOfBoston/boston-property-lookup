import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Banner from '@layouts/Banner';
import Header from '@layouts/Header';
import Footer from '@layouts/Footer';
import { IconButton } from '@components/IconButton';
import { PropertySearchPopup } from '@components/PropertySearchPopup';
import { ComplexFeedbackSenderContainer } from '@containers/ComplexFeedbackSenderContainer';
import ResponsiveTable from '@components/ResponsiveTable';
import { LoadingIndicator } from '@components/LoadingIndicator';
import { useParcelPairingsContext } from '@hooks/useParcelPairingsContext';
import { fetchMasterParcelOverviewByParcelId } from '@hooks/firebaseConfig';
import { getComponentText } from '@utils/contentMapper';
import type { MasterParcelOverviewResult } from '@types/index';
import styles from './MasterParcelPage.module.scss';
import backToTop from '../../assets/back_to_top.png';

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default function MasterParcelPage() {
  const [searchParams] = useSearchParams();
  const parcelId = searchParams.get('parcelId') || '';
  const layoutContent = getComponentText('PropertyDetailsLayout', 'layouts.PropertyDetailsLayout');
  const searchResultsContent = getComponentText('PropertySearchResults');
  const loadingContent = getComponentText('LoadingIndicator');
  const commonContent = getComponentText('common');

  const MOBILE_COLLAPSE_THRESHOLD = 2;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showAllParcels, setShowAllParcels] = useState(false);
  const [results, setResults] = useState<MasterParcelOverviewResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery('(min-width: 769px)');

  const { pairings, isLoading: isPairingsLoading } = useParcelPairingsContext();

  const masterAddress = useMemo(() => {
    if (!parcelId || pairings.length === 0) return '';
    const match = pairings.find(p => p.parcelId === parcelId);
    return match?.fullAddress || '';
  }, [parcelId, pairings]);

  const [copied, setCopied] = useState(false);

  const handleCopyParcelId = useCallback(() => {
    navigator.clipboard.writeText(parcelId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [parcelId]);

  useEffect(() => {
    if (!parcelId) return;

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const overview = await fetchMasterParcelOverviewByParcelId(parcelId);
        setResults(overview.results || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch master parcel data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [parcelId]);

  useEffect(() => {
    const handleScroll = () => {
      const banner = document.querySelector('.cob-site-banner');
      if (!banner || !headerRef.current || !mainRef.current) return;

      setShowBackToTop(window.scrollY > 500);

      const bannerHeight = banner.getBoundingClientRect().height;

      if (window.scrollY > bannerHeight) {
        headerRef.current.classList.add('stickyActive');
        mainRef.current.classList.add('headerIsSticky');
      } else {
        headerRef.current.classList.remove('stickyActive');
        mainRef.current.classList.remove('headerIsSticky');
      }
    };

    if (headerRef.current) {
      const headerHeight = headerRef.current.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }

    const banner = document.querySelector('.cob-site-banner');
    if (banner) {
      const bannerHeight = banner.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--banner-height', `${bannerHeight}px`);
    }

    const footer = document.querySelector('.cob-slim-footer');
    if (footer) {
      const footerHeight = footer.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
    }

    window.addEventListener('scroll', handleScroll);
    const handleResize = () => {
      handleScroll();
      if (headerRef.current) {
        const headerHeight = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      }
    };
    window.addEventListener('resize', handleResize);

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isSearchOpen]);

  const tableData = useMemo(() => {
    return results.map(result => ({
      _parcelId: result.parcelId.toString(),
      'Parcel ID': result.parcelId.toString(),
      [searchResultsContent.columnHeaders.address]: result.address,
      [searchResultsContent.columnHeaders.owner]: result.owner,
      [searchResultsContent.columnHeaders.value]: result.assessedValue === 0 ? '-' : `$${result.assessedValue.toLocaleString()}`,
    }));
  }, [results, searchResultsContent]);

  const displayData = useMemo(() => {
    if (isDesktop || showAllParcels) return tableData;
    return tableData.slice(0, MOBILE_COLLAPSE_THRESHOLD);
  }, [tableData, isDesktop, showAllParcels]);

  const hasCollapsibleParcels = !isDesktop && tableData.length > MOBILE_COLLAPSE_THRESHOLD;

  const handleToggleParcels = useCallback(() => {
    if (showAllParcels && tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setShowAllParcels(prev => !prev);
  }, [showAllParcels]);

  return (
    <div className={styles.masterParcelLayout}>
      <Banner />

      <div ref={headerRef} className={styles.headerWrapper}>
        <Header
          additionalContent={
            <>
              <img
                src="/cob-uswds/img/usa-icons/search.svg"
                alt={layoutContent.searchButton.mobileAlt}
                className={styles.mobileSearchIcon}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              />
              {isDesktop && (
                <IconButton
                  src="/cob-uswds/img/usa-icons/search.svg"
                  text={layoutContent.searchButton.text}
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  useLoraFont={true}
                />
              )}
            </>
          }
        />
        {isSearchOpen && (
          <PropertySearchPopup
            onClose={() => setIsSearchOpen(false)}
            texts={{
              closeButtonAriaLabel: layoutContent.searchPopup.closeButtonAriaLabel,
              labelText: layoutContent.searchButton.text
            }}
          />
        )}
      </div>

      <main ref={mainRef} className={styles.main}>
        <div className={styles.contentArea}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <LoadingIndicator message={loadingContent.message} size="medium" />
            </div>
          ) : error ? (
            <div className={styles.loadingContainer}>
              <p>{commonContent.errors.general}</p>
            </div>
          ) : (
            <div className={styles.resultsContainer}>
              <h1 className={styles.resultsHeader}>Master Parcel Overview</h1>
              <div className={styles.parcelInfoRow}>
                <span className={styles.parcelInfoItem}>
                  Parcel ID:&nbsp;
                  <a
                    href={`#/details?parcelId=${parcelId}`}
                    className={styles.parcelIdLink}
                  >
                    {parcelId}
                  </a>
                  <button
                    type="button"
                    className={styles.copyButton}
                    onClick={handleCopyParcelId}
                    aria-label="Copy parcel ID"
                  >
                    <img
                      src={copied ? "/cob-uswds/img/usa-icons/check_circle.svg" : "/cob-uswds/img/usa-icons/content_copy.svg"}
                      alt={copied ? "Copied" : "Copy"}
                      className={copied ? styles.checkIcon : styles.copyIcon}
                    />
                  </button>
                </span>
                {masterAddress && (
                  <span className={styles.parcelInfoItem}>
                    Address: {masterAddress}
                  </span>
                )}
              </div>
              <div className={styles.descriptionRow}>
                <p className={styles.description}>
                  These are all properties associated with this Master Parcel
                </p>
                <ComplexFeedbackSenderContainer searchQuery={parcelId} variant="default" />
              </div>
              <div className={styles.resultsTable} ref={tableRef}>
                <ResponsiveTable
                  data={displayData}
                  showDetails={true}
                  showMapLink={true}
                />
                {hasCollapsibleParcels && (
                  <button
                    className={styles.showMoreButton}
                    onClick={handleToggleParcels}
                  >
                    {showAllParcels ? 'See Less' : 'See More'}
                    <span className={`${styles.arrow} ${showAllParcels ? styles.up : ''}`} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <button
        className={`${styles.backToTop} ${showBackToTop ? styles.visible : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <img src={backToTop} alt="Back to top" />
      </button>
    </div>
  );
}
