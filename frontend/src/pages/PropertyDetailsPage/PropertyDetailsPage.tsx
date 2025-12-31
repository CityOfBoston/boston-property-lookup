import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropertyDetailsLayout from '@layouts/PropertyDetailsLayout';
import {
  OverviewSection,
  PropertyValueSection,
  AttributesSection,
  PropertyTaxesSection,
  AbatementsSection,
  ApprovedPermitsSection,
  ContactUsSection,
} from '@components/PropertyDetailsSection';
import { LoadingIndicator } from '@components/LoadingIndicator';
import { usePropertyDetails } from '@hooks/usePropertyDetails';
import { useDateContext } from '@hooks/useDateContext';
import TimeChanger from '@components/TimeChanger/TimeChanger';
import { getComponentText } from '@utils/contentMapper';
import { getAbatementPhase } from '@utils/periods';
import { useGoogleAnalytics } from '@hooks/useGoogleAnalytics';
import { usePerformanceTracking } from '@services/analytics';
import styles from './PropertyDetailsPage.module.scss';

/**
 * Helper function to get fiscal year from a date
 * Fiscal year starts July 1st of previous year, ends June 30th of current year
 * e.g., July 1, 2025 - June 30, 2026 is FY2026
 */
function getFiscalYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0=Jan, 6=July
  return month >= 6 ? year + 1 : year;
}

/**
 * PropertyDetailPage displays comprehensive property information using the PropertyDetailsLayout
 * and various detail sections. It gets the parcelId from URL search parameters and fetches
 * property details using the usePropertyDetails hook.
 */
export default function PropertyDetailsPage() {
  const pageContent = getComponentText('propertyDetails', 'pages.propertyDetails');
  const analytics = useGoogleAnalytics();
  const performance = usePerformanceTracking('PropertyDetailsPage');
  const [searchParams] = useSearchParams();
  const parcelId = searchParams.get('parcelId') || '';
  const { date } = useDateContext();
  const lastFiscalYearRef = useRef<number | null>(null);
  const lastParcelIdRef = useRef<string | null>(null);
  
  // Check if TimeChanger should be shown (for testing/development only)
  const showTimeChanger = import.meta.env.VITE_ENABLE_TIME_CHANGER === 'true';

  const { propertyDetails, isLoading, error, fetchPropertyDetails } = usePropertyDetails();

  useEffect(() => {
    if (parcelId) {
      const currentFiscalYear = getFiscalYear(date);
      
      // Fetch property details when parcelId changes or on first load
      // For fiscal year changes, let useDateContext handle the page reload
      const isFirstLoad = lastFiscalYearRef.current === null;
      const isParcelIdChanged = lastParcelIdRef.current !== parcelId;
      const isSameFiscalYear = lastFiscalYearRef.current === currentFiscalYear;
      
      if (isFirstLoad || (isParcelIdChanged && isSameFiscalYear)) {
        lastFiscalYearRef.current = currentFiscalYear;
        lastParcelIdRef.current = parcelId;
        

        // Track API call performance
        const startTime = window.performance.now();
        fetchPropertyDetails(parcelId, date.toISOString().slice(0, 10))
          .then(() => {
            performance.trackOperation('fetch_property_details', 'success', window.performance.now() - startTime);
          })
          .catch((error) => {
            performance.trackOperation('fetch_property_details', 'error', window.performance.now() - startTime, error.message);
            analytics.trackError({
              error_type: 'api',
              error_message: error.message,
              component: 'PropertyDetailsPage'
            });
          });
      }
    }
  }, [parcelId, date, fetchPropertyDetails, analytics, performance, propertyDetails]);

  // If no parcelId is provided, show error
  if (!parcelId) {
    return (
      <div className={styles.error}>
        <h1>{pageContent.error.title}</h1>
        <p>{pageContent.error.description}</p>
      </div>
    );
  }

  // Get section names from content configuration
  if (!pageContent?.sections) {
    console.error('Missing section names in content configuration');
    return null;
  }
  const sectionNames = pageContent.sections;

  // Verify that all required section names are present
  const requiredSections = ['overview', 'value', 'attributes', 'taxes', 'permits', 'contact'];
  const missingSections = requiredSections.filter(section => !sectionNames[section]?.name);
  if (missingSections.length > 0) {
    console.error('Missing required section names:', missingSections);
    return null;
  }
  
  // Handle loading state
  if (isLoading || error || !propertyDetails) {
    const loadingName = sectionNames?.loading?.name || "Loading";
    return (
      <div className={styles.propertyDetailsPage}>
        {showTimeChanger && <TimeChanger />}
        <PropertyDetailsLayout 
          sections={[{
            name: loadingName,
            component: (
              <div className={styles.fullWidthLoadingContainer}>
                <LoadingIndicator 
                  message={error ? `Error: ${error.message}` : (pageContent?.loading?.message || "Loading property details...")} 
                  size="large" 
                />
              </div>
            ),
          }]}
          parcelId={parcelId}
        />
      </div>
    );
  }

  // Check if abatements section should be shown
  const now = date;
  const calendarYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const abatementYear = nowMonth >= 6 ? calendarYear : calendarYear - 1;
  const abatementPhase = getAbatementPhase(now, abatementYear);

  // Track section view as button click
  const trackSectionView = (sectionName: string) => {
    analytics.trackButtonClick({
      button_id: `${sectionName.toLowerCase().replace(/\s+/g, '_')}_section_button`,
      button_text: sectionName,
      context: `property_details_${parcelId}`,
    });
  };

  // Build sections array
  const sections = [
    {
      name: sectionNames.overview.name,
      component: (
        <div onFocus={() => trackSectionView('overview')}>
          <OverviewSection data={propertyDetails.overview} title={sectionNames.overview.name} />
        </div>
      ),
    },
    {
      name: sectionNames.value.name,
      component: (
        <div onFocus={() => trackSectionView('value')}>
          <PropertyValueSection {...propertyDetails.propertyValue} title={sectionNames.value.name} />
        </div>
      ),
    },
    {
      name: sectionNames.attributes.name,
      component: (
        <div onFocus={() => trackSectionView('attributes')}>
          <AttributesSection data={propertyDetails.propertyAttributes} title={sectionNames.attributes.name} />
        </div>
      ),
    },
    {
      name: sectionNames.taxes.name,
      component: (
        <div onFocus={() => trackSectionView('taxes')}>
          <PropertyTaxesSection {...propertyDetails.propertyTaxes} title={sectionNames.taxes.name} />
        </div>
      ),
    },
    ...(abatementPhase.message ? [{
      name: sectionNames.abatements.name,
      component: (
        <div onFocus={() => trackSectionView('abatements')}>
          <AbatementsSection parcelId={parcelId} title={sectionNames.abatements.name} />
        </div>
      ),
    }] : []),
    {
      name: sectionNames.permits.name,
      component: (
        <div onFocus={() => trackSectionView('permits')}>
          <ApprovedPermitsSection parcelId={parcelId} title={sectionNames.permits.name} />
        </div>
      ),
    },
    {
      name: sectionNames.contact.name,
      component: (
        <div onFocus={() => trackSectionView('contact')}>
          <ContactUsSection title={sectionNames.contact.name} />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.propertyDetailsPage}>
      {showTimeChanger && <TimeChanger />}
      <PropertyDetailsLayout 
        sections={sections}
        parcelId={parcelId}
      />
    </div>
  );
} 