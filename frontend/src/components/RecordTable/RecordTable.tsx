import React from 'react';
import styles from './RecordTable.module.scss';
import type { RowMeta } from '@components/ResponsiveTable/ResponsiveTable';

export interface RecordTableData {
  [key: string]: string | number | React.ReactNode;
}

interface RecordTableProps {
  data: RecordTableData;
  className?: string;
  rowIndex?: number;
  rowMeta?: RowMeta;
  activeRowIndex?: number | null;
  setActiveRowIndex?: (idx: number | null) => void;
  openedRowIndex?: number | null;
  setOpenedRowIndex?: (idx: number | null) => void;
  labelMappings?: { [key: string]: string };
}

/**
 * RecordTable displays a single record with field names in the first column
 * and values in the second column. Each row represents a different field.
 */
export const RecordTable: React.FC<RecordTableProps> = ({
  data,
  className = '',
  rowIndex = 0,
  rowMeta,
  activeRowIndex = null,
  setActiveRowIndex,
  openedRowIndex = null,
  setOpenedRowIndex,
  labelMappings = {},
}) => {
  if (!data) {
    return null;
  }

  const keys = Object.keys(data).filter(k => !k.startsWith('_'));
  const isActive = activeRowIndex === rowIndex;
  const isOpened = openedRowIndex === rowIndex;

  const tableClasses = [
    styles.recordTable,
    className,
    isActive ? styles.activeRow : '',
    rowMeta?.isMaster ? styles.masterCard : '',
    rowMeta?.isChild ? styles.childCard : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={tableClasses}
      tabIndex={0}
      role="button"
      aria-expanded={isOpened}
      onFocus={() => setActiveRowIndex && setActiveRowIndex(rowIndex)}
      onBlur={() => setActiveRowIndex && setActiveRowIndex(null)}
      onMouseEnter={() => setActiveRowIndex && setActiveRowIndex(rowIndex)}
      onMouseLeave={() => setActiveRowIndex && setActiveRowIndex(null)}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && setOpenedRowIndex) {
          setOpenedRowIndex(rowIndex);
          e.preventDefault();
        } else if (e.key === 'Escape' && setOpenedRowIndex) {
          setOpenedRowIndex(null);
          e.preventDefault();
        }
      }}
    >
      <div className={styles.grid}>
        {keys.map((key, index) => {
          const value = data[key];
          if (
            React.isValidElement(value) &&
            value.type === 'a'
          ) {
            return (
              <div key={index} className={styles.row}>
                <div className={styles.labelCell}>
                  <span className={styles.labelText}>{labelMappings[key] || key}</span>
                </div>
                <div className={styles.valueCell}>
                  {React.cloneElement(
                    value as React.ReactElement<HTMLAnchorElement>,
                    {
                      tabIndex: isOpened ? 0 : -1,
                      'aria-hidden': (!isOpened).toString(),
                    } as any
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={index} className={styles.row}>
              <div className={styles.labelCell}>
                <span className={styles.labelText}>{key}</span>
              </div>
              <div className={styles.valueCell}>
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecordTable;
