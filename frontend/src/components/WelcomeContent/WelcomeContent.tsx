import React from 'react';
import styles from './WelcomeContent.module.scss';
import { WelcomeContentProps as WelcomeContentTextProps } from '@src/types/content';

const parseStyledText = (text: string | undefined): React.ReactNode[] => {
  if (!text) return [];
  // Split the text into segments based on markdown-like syntax
  const segments = text.split(/(\*\*.*?\*\*|__.*?__)/g);
  
  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      // Bold text
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    } else if (segment.startsWith('__') && segment.endsWith('__')) {
      // Underlined text
      return <u key={index}>{segment.slice(2, -2)}</u>;
    }
    // Regular text
    return segment;
  });
};

interface WelcomeContentProps extends WelcomeContentTextProps {
  additionalContent?: React.ReactNode;
  hideTitleAndDescriptionOnMobile?: boolean;
}

export const WelcomeContent: React.FC<WelcomeContentProps & { additionalContent?: React.ReactNode; hideTitleAndDescriptionOnMobile?: boolean }> = ({ 
  additionalContent,
  hideTitleAndDescriptionOnMobile = false,
  title,
  description
}) => {
  const titleClassName = `${styles.title} ${hideTitleAndDescriptionOnMobile ? styles.hideOnMobile : ''}`;
  const descriptionClassName = `${styles.description} ${hideTitleAndDescriptionOnMobile ? styles.hideOnMobile : ''}`;

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <h1 className={titleClassName}>
          {title}
        </h1>
        {additionalContent && (
          <div className={styles.mobileAdditionalContent}>
            {additionalContent}
          </div>
        )}
        <p className={descriptionClassName}>
          {parseStyledText(description)}
        </p>
      </div>
      {additionalContent && (
        <div className={styles.desktopAdditionalContent}>
          {additionalContent}
        </div>
      )}
    </div>
  );
};

export default WelcomeContent; 