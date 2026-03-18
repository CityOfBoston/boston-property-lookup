import React, { createContext, useContext, useState, useCallback } from 'react';
import styles from './PropertyDetailsSection.module.scss';

type GetShareUrl = (title: string) => string;
export const SectionShareContext = createContext<GetShareUrl | null>(null);

function toAnchorId(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  return (
    <button
      className={styles.copyLinkButton}
      onClick={handleCopy}
      aria-label={copied ? 'Link copied' : 'Copy link to this section'}
      title={copied ? 'Copied!' : 'Copy link to this section'}
    >
      {copied ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
    </button>
  );
}

interface PropertyDetailsSectionProps {
  title: string;
  children: React.ReactNode;
}

function PropertyDetailsSection({ title, children }: PropertyDetailsSectionProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const getShareUrl = useContext(SectionShareContext);
  const anchorId = toAnchorId(title);
  const shareUrl = getShareUrl?.(anchorId);

  return (
    <div ref={ref} className={styles.container}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{title}</h2>
        {shareUrl && <CopyLinkButton url={shareUrl} />}
      </div>
      {children}
    </div>
  );
}

const ForwardedPropertyDetailsSection = React.memo(
  React.forwardRef<HTMLDivElement, PropertyDetailsSectionProps>(PropertyDetailsSection)
);

ForwardedPropertyDetailsSection.displayName = 'PropertyDetailsSection';

export default ForwardedPropertyDetailsSection;
