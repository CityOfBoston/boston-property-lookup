import { useState, useCallback } from 'react';
import { generatePdf as generatePdfApi } from './firebaseConfig';
import type { PdfFormType, PdfGenerationResponse } from '../types';

export interface UsePdfGenerationResult {
  generatePdf: () => Promise<void>;
  isLoading: boolean;
  pdfUrl: string | null;
  pdfDownloadUrl: string | null;
  error: Error | null;
  metadata: PdfGenerationResponse['metadata'] | null;
  formSubtype: string | undefined;
}

export interface UsePdfGenerationProps {
  parcelId: string;
  formType: PdfFormType;
  date?: string;
}

/**
 * Hook to manage PDF generation for property tax forms.
 * 
 * @param props - Configuration for PDF generation
 * @returns PDF generation state and controls
 */
export function usePdfGeneration({
  parcelId,
  formType,
  date,
}: UsePdfGenerationProps): UsePdfGenerationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<PdfGenerationResponse['metadata'] | null>(null);
  const [formSubtype, setFormSubtype] = useState<string | undefined>(undefined);

  const generatePdf = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPdfUrl(null);
    setPdfDownloadUrl(null);
    setMetadata(null);
    setFormSubtype(undefined);

    try {
      const response = await generatePdfApi({
        parcelId,
        formType,
        date,
      });

      setPdfUrl(response.pdfUrl);
      setPdfDownloadUrl(response.pdfDownloadUrl);
      setMetadata(response.metadata);
      setFormSubtype(response.formSubtype);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate PDF');
      setError(error);
      console.error('[usePdfGeneration] Error generating PDF:', error);
    } finally {
      setIsLoading(false);
    }
  }, [parcelId, formType, date]);

  return {
    generatePdf,
    isLoading,
    pdfUrl,
    pdfDownloadUrl,
    error,
    metadata,
    formSubtype,
  };
}

