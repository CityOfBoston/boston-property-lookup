import React from 'react';
import styles from './PropertyDetailsCard.module.scss';

interface PropertyDetailsCardProps {
  icon?: React.ReactNode;
  header: string;
  value: string;
  isGrey?: boolean;
  footer?: React.ReactNode;
}

const PropertyDetailsCard: React.FC<PropertyDetailsCardProps> = ({
  icon,
  header,
  value,
  isGrey = false,
  footer,
}) => {
  return (
    <div className={`${styles.card} ${isGrey ? styles.grey : ''}`}>
      <div className={styles.header}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <span className={styles.headerText}>{header}</span>
      </div>
      <div className={styles.value}>{value}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};

export default PropertyDetailsCard; 