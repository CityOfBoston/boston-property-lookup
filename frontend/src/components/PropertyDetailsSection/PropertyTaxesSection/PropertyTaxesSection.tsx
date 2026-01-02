/**
 * PropertyTaxesSection component displays property tax information and history
 */
import PropertyDetailsSection from '../PropertyDetailsSection';
import PropertyDetailsCardGroup from '../../PropertyDetailsCardGroup';
import FormulaAccordion from '../../FormulaAccordion';
import styles from './PropertyTaxesSection.module.scss';
import sharedStyles from '../PropertyDetailsSection.module.scss';
import { PropertyTaxesSectionData } from '@src/types';
import { usePropertyTaxesContent } from '@src/hooks/usePropertyDetailsContent';
import MessageBox from '../../MessageBox';
import ReactMarkdown from 'react-markdown';

interface PropertyTaxesSectionProps extends PropertyTaxesSectionData {
  title: string;
}

export default function PropertyTaxesSection(props: PropertyTaxesSectionProps) {
  const {
    taxRateCards,
    drawerOptions,
    isPrelimPeriod,
    taxRateHeader,
    taxRateDescription,
    taxRateHistoryLink,
    messageBoxContent,
    personalExemptionMessageBoxContent,
    netTaxHeader,
    netTaxDescription,
    payTaxesButton,
    printPayTaxesText,
  } = usePropertyTaxesContent(props);


  return (
    <PropertyDetailsSection title={props.title}>
      {!isPrelimPeriod && (
        <>
          <div className={styles.taxRateContainer}>
            <h3 className={styles.header}>{taxRateHeader}</h3>
            <div className={sharedStyles.paragraph}>
              {taxRateDescription}
            </div>

            <div className={styles.cardGroup}>
              <PropertyDetailsCardGroup cards={taxRateCards}/>
            </div>
            <div className={styles.link}>
              {taxRateHistoryLink}
            </div>
          </div>

          <MessageBox>
            <ReactMarkdown components={{
              strong: ({ node, ...props }) => (
                <span style={{ fontWeight: 'bold' }} {...props} />
              )
            }}>
              {String(messageBoxContent)}
            </ReactMarkdown>
          </MessageBox>

          <MessageBox>
            <ReactMarkdown components={{
              strong: ({ node, ...props }) => (
                <span style={{ fontWeight: 'bold' }} {...props} />
              )
            }}>
              {String(personalExemptionMessageBoxContent)}
            </ReactMarkdown>
          </MessageBox>
        </>
      )}

      <h3 className={styles.header}>
        {netTaxHeader}
      </h3>
      <div className={sharedStyles.paragraph}>
         <ReactMarkdown>
           {String(netTaxDescription)}
         </ReactMarkdown>
      </div>

      <div className={styles.accordion}>
        <FormulaAccordion drawerOptions={drawerOptions} />
      </div>

      <div className={styles.buttonContainer}>
        <div className={styles.payTaxesLink}>
          {payTaxesButton}
        </div>
        <span className={styles.printPayTaxesLink}>
          {printPayTaxesText}
        </span>
      </div>
    </PropertyDetailsSection>
  );
} 