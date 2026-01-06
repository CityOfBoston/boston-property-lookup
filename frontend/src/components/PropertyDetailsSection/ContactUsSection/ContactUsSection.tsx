/**
 * ContactUsSection component displays contact information and support resources
 */
import ReactMarkdown from 'react-markdown';
import PropertyDetailsSection from '@components/PropertyDetailsSection/PropertyDetailsSection';
import styles from './ContactUsSection.module.scss';
import { useContactUsContent } from '@src/hooks/usePropertyDetailsContent';

interface ContactUsSectionProps {
  title: string;
}

export default function ContactUsSection({ title }: ContactUsSectionProps) {
  const { content } = useContactUsContent();
  const { paragraphs } = content;


  return (
    <PropertyDetailsSection title={title}>
      <div className={styles.container}>
        <div className={styles.paragraph}>
          <ReactMarkdown>
            {paragraphs.exemptions.text}
          </ReactMarkdown>
          {' '}
          <a
            className="usa-link usa-link--external"
            rel="noreferrer"
            target="_blank"
            href={paragraphs.exemptions.link.url}
          >
            {paragraphs.exemptions.link.text}
          </a>
          {' '}
          {paragraphs.exemptions.suffix}
          {' '}
          <a
            href={paragraphs.exemptions.phone.url}
            className="usa-link"
            aria-label={paragraphs.exemptions.phone.label}
          >
            {paragraphs.exemptions.phone.text}
          </a>
          {' '}
          {paragraphs.exemptions?.emailPrefix || 'or emailing'}
          {' '}
          <a
            href={paragraphs.exemptions?.email?.url || 'mailto:TRACFAXSG@boston.gov'}
            className="usa-link"
          >
            {paragraphs.exemptions?.email?.text || 'TRACFAXSG@boston.gov'}
          </a>
          .
        </div>

        <div className={styles.paragraph}>
          <ReactMarkdown>
            {paragraphs.billing.text}
          </ReactMarkdown>
          {' '}
          <a
            href={paragraphs.billing.phone.url}
            className="usa-link"
            aria-label={paragraphs.billing.phone.label}
          >
            {paragraphs.billing.phone.text}
          </a>
          {' '}
          {paragraphs.billing?.emailPrefix || 'or'}
          {' '}
          <a
            href={paragraphs.billing?.email?.url || 'mailto:collecting@boston.gov'}
            className="usa-link"
          >
            {paragraphs.billing?.email?.text || 'collecting@boston.gov'}
          </a>
          .
        </div>

        <div className={styles.paragraph}>
          <ReactMarkdown>
            {paragraphs.values.text}
          </ReactMarkdown>
          {' '}
          <a
            href={paragraphs.values.phone.url}
            className="usa-link"
            aria-label={paragraphs.values.phone.label}
          >
            {paragraphs.values.phone.text}
          </a>
          {' '}
          {paragraphs.values?.emailPrefix || 'or'}
          {' '}
          <a
            href={paragraphs.values?.email?.url || 'mailto:assessing@boston.gov'}
            className="usa-link"
          >
            {paragraphs.values?.email?.text || 'assessing@boston.gov'}
          </a>
          .
        </div>

        <div className={styles.paragraph}>
          <ReactMarkdown>
            {paragraphs.ownership.text}
          </ReactMarkdown>
          {' '}
          <a
            href={paragraphs.ownership.phone.url}
            className="usa-link"
            aria-label={paragraphs.ownership.phone.label}
          >
            {paragraphs.ownership.phone.text}
          </a>
          {' '}
          {paragraphs.ownership?.emailPrefix || 'or'}
          {' '}
          <a
            href={paragraphs.ownership?.email?.url || 'mailto:TDA@boston.gov'}
            className="usa-link"
          >
            {paragraphs.ownership?.email?.text || 'TDA@boston.gov'}
          </a>
          .
        </div>
      </div>
    </PropertyDetailsSection>
  );
} 