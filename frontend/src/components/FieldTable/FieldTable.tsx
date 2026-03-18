import React from 'react';
import styles from './FieldTable.module.scss';
import type { RowMeta } from '@components/ResponsiveTable/ResponsiveTable';

export interface FieldTableData {
  [key: string]: string | number | React.ReactNode;
}

interface FieldTableProps {
  data: FieldTableData[];
  rowMeta?: RowMeta[];
  className?: string;
  activeRowIndex?: number | null;
  setActiveRowIndex?: (idx: number | null) => void;
  openedRowIndex?: number | null;
  setOpenedRowIndex?: (idx: number | null) => void;
  headerLabels?: { [key: string]: string };
}

/**
 * FieldTable displays data in a traditional table format with column headers.
 * Each row represents a record, and each column represents a field.
 */
export const FieldTable: React.FC<FieldTableProps> = ({
  data,
  rowMeta,
  className = '',
  activeRowIndex = null,
  setActiveRowIndex,
  openedRowIndex = null,
  setOpenedRowIndex,
  headerLabels = {},
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const keys = Object.keys(data[0]).filter(k => !k.startsWith('_'));

  return (
    <div className={`${styles.fieldTable} ${className}`}>
      <div className={styles.grid}>
        {/* Header Row */}
        <div className={styles.headerRow}>
          {keys.map((key) => (
            <div key={key} className={styles.headerCell}>
              <h3 className={styles.headerText}>{headerLabels[key] || key}</h3>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {data.map((row, rowIndex) => {
          const isActive = activeRowIndex === rowIndex;
          const isOpened = openedRowIndex === rowIndex;
          const meta = rowMeta?.[rowIndex];
          const rowClasses = [
            styles.row,
            isActive ? styles.activeRow : '',
            meta?.isMaster ? styles.masterRow : '',
            meta?.isChild ? styles.childRow : '',
            meta?.isLastInGroup ? styles.groupDivider : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={rowIndex}
              className={rowClasses}
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
              {keys.map((key) => {
                // If value is a React element, only add tabIndex/aria-hidden to anchor
                const value = row[key];
                if (
                  React.isValidElement(value) &&
                  value.type === 'a'
                ) {
                  return (
                    <div key={`${rowIndex}-${key}`} className={styles.cell}>
                      {React.cloneElement(
                        value as React.ReactElement<HTMLAnchorElement>,
                        {
                          tabIndex: isOpened ? 0 : -1,
                          'aria-hidden': (!isOpened).toString(),
                        } as any
                      )}
                    </div>
                  );
                }
                return (
                  <div key={`${rowIndex}-${key}`} className={styles.cell}>
                    {value}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FieldTable;
