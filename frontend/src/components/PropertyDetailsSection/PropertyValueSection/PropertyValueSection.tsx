/**
 * PropertyValueSection component displays property value information and history
 */
import PropertyDetailsSection from '../PropertyDetailsSection';
import PropertyValuesBarChart from '@components/PropertyValuesBarChart';
import ResponsiveTable from '@components/ResponsiveTable';
import styles from './PropertyValueSection.module.scss';
import sharedStyles from '../PropertyDetailsSection.module.scss';
import type { PropertyValueSectionData } from '../../../types';
import { usePropertyValueContent } from '@src/hooks/usePropertyDetailsContent';

interface PropertyValueSectionProps extends PropertyValueSectionData {
  title: string;
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
    
      <PropertyValuesBarChart
        title={content.chart.title}
        value={formattedValue}
        data={sortedData.slice(-5)}
      />

      <div className={styles.valueHistory} ref={valueHistoryRef}>
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