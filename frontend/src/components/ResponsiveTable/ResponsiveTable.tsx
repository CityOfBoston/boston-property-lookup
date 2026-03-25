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
    columnHeaders?: { [key: string]: string };
  };
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  rowMeta,
  showDetails = false,
  showMapLink = false,
  onLoad,
  texts = {
    viewDetails: "View Details",
    columnHeaders: {}
  }
}) => {
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [openedRowIndex, setOpenedRowIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return null;
  }

  const buildRowLinks = (row: TableData) => {
    const parcelId = (row['_parcelId'] || row['Parcel ID']) as string;
    const viewAllLink = row['_viewAllLink'] as string | undefined;
    const viewAllText = row['_viewAllText'] as string | undefined;

    let detailsContent: React.ReactNode = '';

    if (parcelId) {
      detailsContent = (
        <a
          className="usa-link"
          rel="noreferrer"
          href={`#/details?parcelId=${parcelId}`}
        >
          {texts.viewDetails}
        </a>
      );
    }

    if (viewAllLink && viewAllText) {
      detailsContent = (
        <a
          className={`usa-link usa-link--external ${styles.viewAllLink}`}
          rel="noreferrer"
          target="_blank"
          href={viewAllLink}
        >
          {viewAllText}
        </a>
      );
    }

    return { detailsContent };
  };

  const buildAddressLink = (row: TableData, addressKey: string): React.ReactNode => {
    const parcelId = (row['_parcelId'] || row['Parcel ID']) as string;
    const address = row[addressKey];
    if (!parcelId || !address || !showMapLink) return address;
    return (
      <a
        className="usa-link usa-link--external"
        rel="noreferrer"
        target="_blank"
        href={`https://experience.arcgis.com/experience/8a1bb1e9a05b4a548df99443dfe5f2ff/#widget_11=text:${parcelId}&zoom_to_selection=true`}
      >
        {address}
      </a>
    );
  };

  const stripInternalFields = (row: TableData): TableData => {
    const cleaned = { ...row };
    delete cleaned['_parcelId'];
    delete cleaned['_viewAllLink'];
    delete cleaned['_viewAllText'];
    delete cleaned['_mobileOnly'];
    return cleaned;
  };

  // Find the address column key from the first row's keys
  const addressKey = data.length > 0
    ? Object.keys(data[0]).find(k => !k.startsWith('_') && k !== 'Parcel ID' && k !== 'Details')
    : undefined;

  // Desktop: filter out mobile-only rows and build matching meta
  const desktopIndices = data
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => !row['_mobileOnly']);

  const processedData = desktopIndices.map(({ row }) => {
    const newRow = { ...row };
    if (addressKey && showMapLink) {
      newRow[addressKey] = buildAddressLink(row, addressKey);
    }
    if (showDetails) {
      const { detailsContent } = buildRowLinks(row);
      newRow['Details'] = detailsContent;
    }
    return stripInternalFields(newRow);
  });

  const desktopRowMeta = rowMeta
    ? desktopIndices.map(({ i }) => rowMeta[i])
    : undefined;

  // Mobile: skip child rows, keep master and "View all" rows
  const mobileIndices = data
    .map((row, i) => ({ row, i }))
    .filter(({ row, i }) => {
      const meta = rowMeta?.[i];
      const isViewAllRow = !!(row['_viewAllLink'] && row['_viewAllText']);
      if (isViewAllRow) return true;
      if (meta?.isChild) return false;
      return true;
    });

  const mobileRows = mobileIndices.map(({ row }) => {
    const isViewAllRow = !!(row['_viewAllLink'] && row['_viewAllText']);
    const newRow = { ...row };
    if (addressKey && showMapLink) {
      newRow[addressKey] = buildAddressLink(row, addressKey);
    }
    if (showDetails && !isViewAllRow) {
      const { detailsContent } = buildRowLinks(row);
      newRow['Details'] = detailsContent;
    }
    return { data: stripInternalFields(newRow), isViewAllRow, originalRow: row };
  });

  React.useEffect(() => {
    onLoad?.();
  }, [onLoad]);

  return (
    <div className={styles.responsiveTable}>
      <div className={styles.fieldTable}>
        <FieldTable
          data={processedData}
          rowMeta={desktopRowMeta}
          activeRowIndex={activeRowIndex}
          setActiveRowIndex={setActiveRowIndex}
          openedRowIndex={openedRowIndex}
          setOpenedRowIndex={setOpenedRowIndex}
        />
      </div>
      <div className={styles.recordTable}>
        {mobileRows.map(({ data: rowData, isViewAllRow, originalRow }, idx) => {
          if (isViewAllRow) {
            const viewAllLink = originalRow['_viewAllLink'] as string;
            const viewAllText = originalRow['_viewAllText'] as string;
            return (
              <div
                key={idx}
                className={`${styles.mobileToggle} ${styles.groupGap}`}
              >
                <a
                  className={`usa-link usa-link--external ${styles.viewAllLink}`}
                  rel="noreferrer"
                  target="_blank"
                  href={viewAllLink}
                >
                  {viewAllText}
                </a>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={styles.groupGap}
            >
              <RecordTable
                data={rowData}
                rowIndex={idx}
                rowMeta={undefined}
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
