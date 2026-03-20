/**
 * PropertyValueSection component displays property value information and history
 */
import { useMemo } from 'react';
import PropertyDetailsSection from '../PropertyDetailsSection';
import PropertyValuesBarChart from '@components/PropertyValuesBarChart';
import ResponsiveTable from '@components/ResponsiveTable';
import styles from './PropertyValueSection.module.scss';
import sharedStyles from '../PropertyDetailsSection.module.scss';
import type { PropertyValueSectionData } from '../../../types';
import { usePropertyValueContent } from '@src/hooks/usePropertyDetailsContent';

interface PropertyValueSectionProps extends PropertyValueSectionData {
  title: string;
  parcelId?: string;
  childParcelCount?: number;
  /** When set, this parcel is a child (Layer 15); show "View master parcel" link. */
  masterParcelId?: string;
}

export default function PropertyValueSection(props: PropertyValueSectionProps) {
  const {
    content,
    sortedData,
    tableData,
    formattedValue,
    showAllValues,
    valueHistoryRef,
    valueHistoryHeaderRef,
    handleSeeMoreLess,
    sharedLabels,
  } = usePropertyValueContent(props);

  const showMasterParcelNotice = useMemo(() => {
    if (!(props.childParcelCount && props.childParcelCount > 0)) return false;
    const lastFiveYears = sortedData.slice(-5);
    return lastFiveYears.length > 0 && lastFiveYears.every(d => d.value === 0);
  }, [props.childParcelCount, sortedData]);

  return (
    <PropertyDetailsSection title={props.title}>
      <div className={sharedStyles.paragraph}>
        {content.description}{' '}
        <a
          className="usa-link usa-link--external"
          rel="noreferrer"
          target="_blank"
          href={content.howWeEstimateLink.url}
        >
          {content.howWeEstimateLink.text}
        </a>.
      </div>

      {props.masterParcelId && (
        <div className={sharedStyles.paragraph}>
          <p>
            This parcel is part of a master parcel.{' '}
            <a
              className="usa-link usa-link--external"
              href={`#/master-parcel?parcelId=${props.masterParcelId}`}
              rel="noreferrer"
              target="_blank"
              style={{ fontWeight: 700 }}
            >
              View master parcel
            </a>
          </p>
        </div>
      )}

      {showMasterParcelNotice ? (
        <div className={sharedStyles.paragraph}>
          <p>
            This parcel is a Master Parcel (a building with individual units).
            To understand its value, you have to view the individual units inside of the building.
          </p>
          <br />
          <br />
          <p>
            <a
              className="usa-link usa-link--external"
              href={`#/master-parcel?parcelId=${props.parcelId}`}
              rel="noreferrer"
              target="_blank"
              style={{ fontWeight: 700 }}
            >
              View individual units
            </a>
          </p>
        </div>
      ) : (
        <PropertyValuesBarChart
          title={content.chart.title}
          value={formattedValue}
          data={sortedData.slice(-5)}
        />
      )}

      <div className={`${styles.valueHistory} ${showMasterParcelNotice ? styles.noChart : ''}`} ref={valueHistoryRef}>
        <h3 tabIndex={-1} ref={valueHistoryHeaderRef}>{content.valueHistory.title}</h3>
        <div className={sharedStyles.paragraph}><strong>{sharedLabels?.note || 'Note'}:</strong> {content.valueHistory.note}</div>
        <div className={styles.screenTable}>
          <ResponsiveTable data={tableData} />
        </div>
        <div className={styles.printTable}>
          <ResponsiveTable data={sortedData.slice().reverse().map(({ year, value }) => ({ [sharedLabels?.fiscalYear || 'Fiscal Year']: year.toString(), [sharedLabels?.assessedValue || 'Assessed Value']: value != null ? `$${value.toLocaleString()}` : (sharedLabels?.notAvailable || 'N/A') }))} />
        </div>
        {sortedData.length > 5 && (
          <button
            id="value_history_toggle_button"
            className={styles.seeMoreButton}
            onClick={handleSeeMoreLess}
          >
            {showAllValues ? content.valueHistory.buttons.seeLess : content.valueHistory.buttons.seeMore}
            <span className={`${styles.arrow} ${showAllValues ? styles.up : ''}`} style={{ color: '#1871BD' }} />
          </button>
        )}
      </div>
    </PropertyDetailsSection>
  );
} 