/**
 * OverviewSection component displays property overview information
 */
import styles from './OverviewSection.module.scss';
import sharedStyles from '../PropertyDetailsSection.module.scss';
import PropertyDetailsCardGroup from '@components/PropertyDetailsCardGroup';
import { IconButton } from '@components/IconButton';
import PropertyDetailsSection from '../PropertyDetailsSection';
import { OverviewSectionData } from '@src/types';
import { useOverviewContent } from '@src/hooks/usePropertyDetailsContent';

/**
 * Custom target icon component for property location
 */
const TargetIcon = () => (
  <svg 
    width="80" 
    height="80" 
    viewBox="0 0 80 80" 
    className={styles.targetIcon}
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 2,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
    }}
  >
    {/* Large transparent blue hue circle */}
    <circle cx="40" cy="40" r="35" fill="#005ea2" opacity="0.4"/>
    
    {/* Outer white circle with black outline */}
    <circle cx="40" cy="40" r="12" fill="white" stroke="black" strokeWidth="1" opacity="0.9"/>
    
    {/* Blue core circle */}
    <circle cx="40" cy="40" r="8" fill="#005ea2" opacity="0.8"/>
    
    {/* Inner white center */}
    <circle cx="40" cy="40" r="3" fill="white" opacity="0.9"/>
  </svg>
);

interface OverviewSectionProps {
  data: OverviewSectionData;
  title: string;
}

export default function OverviewSection({ data, title }: OverviewSectionProps) {
  const {
    content,
    sharedLabels,
    cards,
    ownerDisclaimer,
    formatPropertyType,
    formatValue,
    getMapUrl,
    getPayTaxesUrl,
  } = useOverviewContent(data);

  // Check if image is unavailable
  const isImageUnavailable = data.imageSrc === 'UNAVAILABLE';
  const hasImage = data.imageSrc && !isImageUnavailable;

  return (
    <PropertyDetailsSection title={title}>
      <section className={styles.section}>
        <div className={styles.leftContent}>
          <div className={styles.locationContainer}>
            <img src={content.sections?.location?.icon || '/cob-uswds/img/usa-icons/location_on.svg'} alt={content.sections?.location?.alt || 'Location'} className={styles.locationIcon} />
            <span>{data.fullAddress}</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.sectionHeader}>
            <img src={content.sections?.owners?.icon || '/cob-uswds/img/usa-icons/people.svg'} alt={content.sections?.owners?.alt || 'Owners'} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>{content.sections?.owners?.title || 'Current Owner(s)'}</h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.ownerNames}>
              {data.owners.map((owner, index) => (
                <div key={index} className={`${sharedStyles.paragraph} ${styles.ownerName}`}>{owner}</div>
              ))}
            </div>
            <div className={styles.ownerDisclaimers}>
              <div className={`${sharedStyles.paragraph} ${styles.ownerDisclaimer}`}>
                {content.sections?.owners?.nameFormat || 'Owner names appear as Last Name followed by First Name'}
              </div>
              <div className={`${sharedStyles.paragraph} ${styles.ownerDisclaimer}`}>
                {ownerDisclaimer}
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.sectionHeader}>
            <img src={content.sections?.assessedValue?.icon || '/cob-uswds/img/usa-icons/trending_up.svg'} alt={content.sections?.assessedValue?.alt || 'Value'} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>{content.sections?.assessedValue?.title || 'Assessed Value'}</h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={sharedStyles.paragraph}>{formatValue(data.assessedValue)}</div>
          </div>

          <div className={styles.divider} />

          <div className={styles.sectionHeader}>
            <img src={content.sections?.propertyType?.icon || '/cob-uswds/img/usa-icons/location_city.svg'} alt={content.sections?.propertyType?.alt || 'Property Type'} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>{content.sections?.propertyType?.title || 'Property Type'}</h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={sharedStyles.paragraph}>
              {formatPropertyType(data.propertyTypeCode, data.propertyTypeDescription)}
            </div>
          </div>
        </div>

        <div className={styles.rightContent}>
          {hasImage && (
            <a
              href={getMapUrl(data.parcelId)}
              target="_blank"
              rel="noreferrer"
              aria-label={content.map?.ariaLabel || 'Open property location in map'}
              className={styles.imageContainer}
              style={{ position: 'relative', display: 'block' }}
            >
              <img 
                src={data.imageSrc} 
                alt={sharedLabels?.property || 'Property'} 
                className={styles.propertyImage}
              />
              <TargetIcon />
            </a>
          )}
          {isImageUnavailable && (
            <a
              href={getMapUrl(data.parcelId)}
              target="_blank"
              rel="noreferrer"
              aria-label={content.map?.ariaLabel || 'Open property location in map'}
              className={styles.imageContainer}
              style={{ position: 'relative', display: 'block' }}
            >
              <div className={styles.placeholderImage}>
                <span className={styles.placeholderText}>Preview Unavailable</span>
              </div>
            </a>
          )}
          <div className={styles.mapLink}><a
            className={`usa-link usa-link--external`}
            rel="noreferrer"
            target="_blank"
            href={getMapUrl(data.parcelId)}
          >{content.map?.linkText || 'Open in map'}</a>
          </div>
        </div>
      </section>

      <div className={`${styles.cardGroupSection} ${styles.desktop}`}>
        <PropertyDetailsCardGroup cards={cards} maxCardsPerRow={4} />
      </div>

      <div className={`${styles.cardGroupSection} ${styles.mobile}`}>
        <PropertyDetailsCardGroup cards={cards} maxCardsPerRow={2} />
      </div>

      <div className={styles.buttonGroup}>
        <a
          href={getPayTaxesUrl(data.parcelId)}
          target="_blank"
          rel="noreferrer"
        >
          <IconButton 
            id="overview_pay_taxes_button"
            text={content.buttons?.payTaxes?.text || 'Pay Your Taxes'}
            variant="primary"
          />
        </a>
        <IconButton 
          id="overview_print_button"
          src={content.buttons?.print?.icon || '/cob-uswds/img/usa-icons/print.svg'} 
          text={content.buttons?.print?.text || 'Print'} 
          onClick={() => window.print()} 
        />
      </div>
    </PropertyDetailsSection>
  );
}