import React from 'react';
import IconButton from '@components/IconButton';
import styles from './PdfReviewer.module.scss';

export interface PdfReviewerProps {
  pdfUrl: string;
  pdfDownloadUrl?: string;
  fileName?: string;
  onPrint?: () => void;
  onDownload?: () => void;
  onBack?: () => void;
  backLabel?: string;
}

/**
 * PdfReviewer Component
 * 
 * Displays a PDF in an embedded viewer with print and download controls.
 */
export default function PdfReviewer({
  pdfUrl,
  pdfDownloadUrl,
  fileName = 'form.pdf',
  onPrint,
  onDownload,
  onBack,
  backLabel = 'Back to Property Details',
}: PdfReviewerProps) {
  const handlePrint = () => {
    // For Firebase Storage URLs with signed URLs, we need to open in new window
    // because cross-origin iframe doesn't allow .print() access
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    onPrint?.();
  };

  const handleDownload = () => {
    // Use the dedicated download URL if available (has attachment disposition)
    // Otherwise fall back to fetching and creating a blob URL
    if (pdfDownloadUrl) {
      // Direct download using signed URL with attachment disposition
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = pdfDownloadUrl;
      // The filename is already set in the Content-Disposition header by the backend
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      onDownload?.();
    } else {
      // Fallback: open in new tab
      console.warn('No download URL available, opening in new tab');
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className={styles.pdfReviewerContainer}>
      <div className={styles.pdfViewerWrapper}>
        <iframe
          src={pdfUrl}
          className={styles.pdfViewer}
          title="PDF Form Preview"
          aria-label="Generated PDF form for review"
        />
      </div>

      <div className={styles.actionButtons}>
        {onBack && (
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
          >
            ← {backLabel}
          </button>
        )}
        <IconButton
          text="Print Form"
          onClick={handlePrint}
          variant="primary"
        />
        <IconButton
          text="Download Form"
          onClick={handleDownload}
          variant="outline"
        />
      </div>
    </div>
  );
}

