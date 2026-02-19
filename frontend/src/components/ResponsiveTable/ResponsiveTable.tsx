import React, { useState } from 'react';
import FieldTable from '@components/FieldTable';
import RecordTable from '@components/RecordTable';
import styles from './ResponsiveTable.module.scss';

export interface TableData {
  [key: string]: string | number | React.ReactNode;
}

export interface RowMeta {
  isMaster: boolean;
  isChild: boolean;
  isLastInGroup: boolean;
}

interface ResponsiveTableProps {
  data: TableData[];
  rowMeta?: RowMeta[];
  showDetails?: boolean;
  showMapLink?: boolean;
  onLoad?: () => void;
  texts?: {
    viewDetails?: string;
    openInMap?: string;
    columnHeaders?: { [key: string]: string };
  };
}

/**
 * ResponsiveTable displays data in either a FieldTable (desktop) or RecordTable (mobile) format
 * based on screen size. It automatically handles the responsive switching between views.
 */
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  rowMeta,
  showDetails = false,
  showMapLink = false,
  onLoad,
  texts = {
    viewDetails: "View Details",
    openInMap: "Open in Map",
    columnHeaders: {}
  }
}) => {
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [openedRowIndex, setOpenedRowIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return null;
  }

  const processedData = data.map(row => {
    const newRow = { ...row };
    if (showDetails) {
      // Get parcelId from the 'Parcel ID' field
      const parcelId = row['Parcel ID'] as string;

      // Only add details/map links for rows with an actual parcel ID
      // (toggle rows like "Show all N units" have an empty Parcel ID)
      if (parcelId) {
        const detailsLink = (
          <a
            className="usa-link"
            rel="noreferrer"
            href={`#/details?parcelId=${parcelId}`}
          >
            {texts.viewDetails}
          </a>
        );

        if (showMapLink) {
          newRow['Details'] = detailsLink;
          newRow[''] = (
            <a
              className="usa-link usa-link--external"
              rel="noreferrer"
              target="_blank"
              href={`https://app01.cityofboston.gov/AssessingMap/?find=${parcelId}`}
            >
              {texts.openInMap}
            </a>
          );
        } else {
          newRow['Details'] = detailsLink;
        }
      } else {
        // Empty placeholders so columns still align
        newRow['Details'] = '';
        if (showMapLink) {
          newRow[''] = '';
        }
      }
    }
    return newRow;
  });

  // For mobile view (RecordTable), combine the links
  const mobileData = processedData.map(row => {
    const newRow = { ...row };
    if (showDetails && showMapLink) {
      // Get parcelId from the 'Parcel ID' field
      const parcelId = row['Parcel ID'] as string;
      newRow['Details'] = (
        <div className={styles.detailsLinks}>
          <a
            className="usa-link"
            rel="noreferrer"
            href={`#/details?parcelId=${parcelId}`}
          >
            {texts.viewDetails}
          </a>
          <a
            className="usa-link usa-link--external"
            rel="noreferrer"
            target="_blank"
            href={`https://app01.cityofboston.gov/AssessingMap/?find=${parcelId}`}
          >
            {texts.openInMap}
          </a>
        </div>
      );
      delete newRow['']; // Remove the empty column for mobile view
    }
    return newRow;
  });

  // Call onLoad after initial render
  React.useEffect(() => {
    onLoad?.();
  }, [onLoad]);

  return (
    <div className={styles.responsiveTable}>
      <div className={styles.fieldTable}>
        <FieldTable
          data={processedData}
          rowMeta={rowMeta}
          activeRowIndex={activeRowIndex}
          setActiveRowIndex={setActiveRowIndex}
          openedRowIndex={openedRowIndex}
          setOpenedRowIndex={setOpenedRowIndex}
        />
      </div>
      <div className={styles.recordTable}>
        {mobileData.map((row, idx) => {
          const meta = rowMeta?.[idx];
          const isLastInGroup = meta?.isLastInGroup ?? false;
          return (
            <div
              key={idx}
              className={isLastInGroup ? styles.groupGap : undefined}
            >
              <RecordTable
                data={row}
                rowIndex={idx}
                rowMeta={meta}
                activeRowIndex={activeRowIndex}
                setActiveRowIndex={setActiveRowIndex}
                openedRowIndex={openedRowIndex}
                setOpenedRowIndex={setOpenedRowIndex}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResponsiveTable;
