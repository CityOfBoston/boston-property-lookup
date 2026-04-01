import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageLayout from '@layouts/PageLayout';
import FormDetailsReview from '@components/FormDetailsReview';
import PdfReviewer from '@components/PdfReviewer';
import { LoadingIndicator } from '@components/LoadingIndicator';
import { usePdfGeneration } from '@hooks/usePdfGeneration';
import { usePropertyDetails } from '@hooks/usePropertyDetails';
import { useEffectiveNow } from '@hooks/useDateContext';
import { isAbatementPdfFormAvailable, isExemptionPdfFormAvailable } from '@utils/periods';
import type { PdfFormType } from '@src/types';
import styles from './PdfGenerationPage.module.scss';

export default function PdfGenerationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const effectiveNow = useEffectiveNow();

  const parcelId = searchParams.get('parcelId');
  const formType = searchParams.get('formType') as PdfFormType | null;

  const calendarYear = effectiveNow.getFullYear();
  const nowMonth = effectiveNow.getMonth();
  const abatementYear = nowMonth >= 6 ? calendarYear : calendarYear - 1;

  const isFormPeriodOpen = useMemo(() => {
    if (!formType) return false;
    if (formType === 'residential' || formType === 'personal') {
      return isExemptionPdfFormAvailable(effectiveNow, calendarYear);
    }
    if (formType === 'abatement') {
      return isAbatementPdfFormAvailable(effectiveNow, abatementYear);
    }
    return false;
  }, [formType, effectiveNow, calendarYear, abatementYear]);

  console.log('[PdfGenerationPage] Loaded with parcelId:', parcelId, 'formType:', formType);

  // Validate required parameters
  useEffect(() => {
    if (!parcelId || !formType) {
      console.error('[PdfGenerationPage] Missing required parameters');
      navigate('/');
    } else {
      console.log('[PdfGenerationPage] Parameters validated successfully');
    }
  }, [parcelId, formType, navigate]);

  // Fetch property details
  const {
    propertyDetails,
    isLoading: isLoadingProperty,
    error: propertyError,
    fetchPropertyDetails,
  } = usePropertyDetails();

  // Fetch property details when parcelId is available
  useEffect(() => {
    if (parcelId) {
      console.log('[PdfGenerationPage] Fetching property details for parcelId:', parcelId);
      fetchPropertyDetails(parcelId);
    }
  }, [parcelId, fetchPropertyDetails]);

  console.log('[PdfGenerationPage] Property details:', propertyDetails ? 'loaded' : 'loading', 'error:', propertyError?.message);

  // PDF generation hook
  const {
    generatePdf,
    isLoading: isGenerating,
    pdfUrl,
    pdfDownloadUrl,
    error: pdfError,
  } = usePdfGeneration({
    parcelId: parcelId || '',
    formType: formType || 'residential',
  });

  console.log('[PdfGenerationPage] PDF state - isGenerating:', isGenerating, 'pdfUrl:', pdfUrl, 'error:', pdfError?.message);

  const isLoading = isLoadingProperty || isGenerating;
  const error = propertyError || pdfError;

  if (!parcelId || !formType) {
    return null;
  }

  if (!isFormPeriodOpen) {
    return (
      <PageLayout>
        <div className={styles.pdfGenerationPage}>
          <div className={styles.errorBox}>
            <h3 className={styles.errorTitle}>Application not available</h3>
            <p className={styles.errorMessage}>
              The deadline to download this application has passed, or this form is not available for the current date.
            </p>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate(`/details?parcelId=${parcelId}`)}
            >
              Back to property details
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className={styles.pdfGenerationPage}>
        {error && (
          <div className={styles.errorBox}>
            <h3 className={styles.errorTitle}>Error</h3>
            <p className={styles.errorMessage}>
              {error.message || 'An error occurred. Please try again.'}
            </p>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate(-1)}
            >
              Go Back
            </button>
          </div>
        )}

        {isLoading && !pdfUrl && (
          <div className={styles.loadingWrapper}>
            <LoadingIndicator 
              message={isLoadingProperty ? 'Loading property details...' : 'Generating your form...'}
              size="large"
            />
          </div>
        )}

        {!error && !isLoading && !pdfUrl && propertyDetails && (
          <FormDetailsReview
            formType={formType}
            propertyData={{
              parcelId: propertyDetails.overview.parcelId,
              owner: propertyDetails.overview.owners,
              address: propertyDetails.overview.fullAddress,
              assessedValue: propertyDetails.overview.assessedValue,
            }}
            isLoading={false}
            onGenerate={generatePdf}
          />
        )}

        {!error && pdfUrl && pdfDownloadUrl && (
          <div className={styles.pdfViewerSection}>
            <div className={styles.pdfHeader}>
              <h2 className={styles.pdfTitle}>YOUR FORM IS READY</h2>
              <p className={styles.pdfSubtitle}>
                Review the pre-filled form below. You can print it or download it for your records.
              </p>
            </div>
            <PdfReviewer
              pdfUrl={pdfUrl}
              pdfDownloadUrl={pdfDownloadUrl}
              fileName={`${formType}-form-${parcelId}.pdf`}
              onBack={() => navigate(`/details?parcelId=${parcelId}`)}
              backLabel="Back to Property Details"
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
}

