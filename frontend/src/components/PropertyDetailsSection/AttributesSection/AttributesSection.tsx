/**
 * AttributesSection component displays property attributes and characteristics
 */
import PropertyDetailsSection from '../PropertyDetailsSection';
import styles from './AttributesSection.module.scss';
import { PropertyAttributesData, PropertyAttributeCategory, PropertyAttributeField } from '@src/types';
import { useAttributesContent } from '@src/hooks/usePropertyDetailsContent';

interface AttributesSectionProps {
  data: PropertyAttributesData;
  title: string;
  childParcelCount?: number;
  parcelId?: string;
}

// Helper function to check if an item is a category
const isCategory = (item: PropertyAttributeCategory | PropertyAttributeField): item is PropertyAttributeCategory => {
  return 'title' in item && 'content' in item;
};

// Helper function to render attribute fields
const renderAttributeFields = (fields: PropertyAttributeField[], masterParcelIdLabel: string) => {
  const filteredFields = fields.filter(field => field.value !== null && field.value !== undefined);
  if (filteredFields.length === 0) return null;

  return (
    <ul>
      {filteredFields.map(field => (
        <li key={field.label}>
          <strong>{field.label}:</strong>{' '}
          {field.label === masterParcelIdLabel ? (
            <a
              href={`#/master-parcel?parcelId=${field.value}`}
              className="usa-link usa-link--external"
              rel="noreferrer"
              target="_blank"
            >
              {field.value}
            </a>
          ) : (
            field.value
          )}
        </li>
      ))}
    </ul>
  );
};

export default function AttributesSection({ data, title, childParcelCount, parcelId }: AttributesSectionProps) {
  const {
    sharedButtons,
    sharedLabels,
    showAllAttributes,
    sectionRef,
    handleToggle,
  } = useAttributesContent(data);
  
  const attributeGroups = data?.attributeGroups || [];
  const masterParcelIdLabel = sharedLabels?.masterParcelId || 'Master Parcel ID';


  return (
    <PropertyDetailsSection title={title} ref={sectionRef}>
      <div className={`${styles.grid} ${showAllAttributes ? styles.expanded : ''}`}>
        {attributeGroups
          .filter(group => {
            if (Array.isArray(group.content)) {
              return group.content.some(item => {
                if (isCategory(item)) {
                  return item.content.some(field => field.value !== null && field.value !== undefined);
                }
                return item.value !== null && item.value !== undefined;
              });
            }
            return false;
          })
          .map((group, groupIndex) => {
            const showTotalUnits = groupIndex === 0 && (childParcelCount ?? 0) > 0;
            return (
              <div key={group.title} className={styles.group}>
                <h3>{group.title}</h3>
                <div className={
                  Array.isArray(group.content) && group.content.some(isCategory) ? styles.subgroupGrid : styles.directContent
                }>
                  {Array.isArray(group.content) && group.content.map((item, index) => {
                    if (isCategory(item)) {
                      return (
                        <div key={item.title || index} className={styles.subgroup}>
                          <h4>{item.title}</h4>
                          {renderAttributeFields(item.content, masterParcelIdLabel)}
                        </div>
                      );
                    } else {
                      return renderAttributeFields([item], masterParcelIdLabel);
                    }
                  })}
                </div>
                {showTotalUnits && (
                  <ul>
                    <li>
                      <strong>Total units:</strong> {childParcelCount}{' '}
                      <a
                        className="usa-link usa-link--external"
                        href={`#/master-parcel?parcelId=${parcelId}`}
                        rel="noreferrer"
                        target="_blank"
                        style={{ fontWeight: 700 }}
                      >
                        View associated parcels
                      </a>
                    </li>
                  </ul>
                )}
              </div>
            );
          })}
      </div>
      <button
        id="attributes_toggle_button"
        className={styles.seeMoreButton}
        onClick={handleToggle}
      >
        {showAllAttributes ? (sharedButtons?.seeLess || 'See Less') : (sharedButtons?.seeMore || 'See More')}
        <span className={`${styles.arrow} ${showAllAttributes ? styles.up : ''}`} />
      </button>
    </PropertyDetailsSection>
  );
} 