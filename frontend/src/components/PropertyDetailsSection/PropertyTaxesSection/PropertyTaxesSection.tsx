/**
 * PropertyTaxesSection component displays property tax information and history
 */
import PropertyDetailsSection from '../PropertyDetailsSection';
import PropertyDetailsCardGroup from '../../PropertyDetailsCardGroup';
import FormulaAccordion from '../../FormulaAccordion';
import ResponsiveTable from '../../ResponsiveTable';
import styles from './PropertyTaxesSection.module.scss';
import sharedStyles from '../PropertyDetailsSection.module.scss';
import { PropertyTaxesSectionData } from '@src/types';
import { usePropertyTaxesContent } from '@src/hooks/usePropertyDetailsContent';
import { useDateContext } from '@hooks/useDateContext';
import { BID_Q3_PAYMENT_DUE_DATE, BID_Q4_PAYMENT_DUE_DATE, formatDateForDisplay } from '@utils/periods';
import MessageBox from '../../MessageBox';
import ReactMarkdown from 'react-markdown';
import { getComponentText } from '@utils/contentMapper';

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

  // Get content from configuration
  const content = getComponentText('propertyTaxesSection', 'components.PropertyTaxesSection');
  const streetBettermentContent = content.additionalCharges?.streetBetterment;
  const fine38dContent = content.additionalCharges?.fine38d;
  const bidContent = content.additionalCharges?.bid;

  // Helper function to format currency values
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return null;
    const num = Number(value);
    if (isNaN(num) || num === 0) return null;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to check if a value is present and non-zero (handles strings from API)
  const hasValue = (value: number | null | undefined): boolean => {
    if (value == null) return false;
    const num = Number(value);
    return !isNaN(num) && num !== 0;
  };

  // Check if Street Betterment has value
  const hasStreetBetterment = hasValue(props.streetBetterment);

  // Check if 38D Fine has value
  const has38dFine = hasValue(props.fine38d);

  // Check if any BID values exist
  const hasBidDowntown = hasValue(props.bidDowntown);
  const hasBidGreenway = hasValue(props.bidGreenway);
  const hasBidNewMarket = hasValue(props.bidNewMarket);
  const hasAnyBid = hasBidDowntown || hasBidGreenway || hasBidNewMarket;

  // Get current date context for BID payment due dates
  const { date: currentDate } = useDateContext();
  const currentYear = currentDate.getFullYear();

  // Create BID table data
  const districtLabel = bidContent?.tableLabel?.district || 'BID District';
  const amountLabel = bidContent?.tableLabel?.amount || 'Amount';
  const bidTableData = [];
  let bidTotal = 0;
  if (hasBidDowntown) {
    bidTotal += Number(props.bidDowntown);
    bidTableData.push({ 
      [districtLabel]: bidContent?.districts?.downtown || 'Downtown', 
      [amountLabel]: formatCurrency(props.bidDowntown) 
    });
  }
  if (hasBidGreenway) {
    bidTotal += Number(props.bidGreenway);
    bidTableData.push({ 
      [districtLabel]: bidContent?.districts?.greenway || 'Greenway', 
      [amountLabel]: formatCurrency(props.bidGreenway) 
    });
  }
  if (hasBidNewMarket) {
    bidTotal += Number(props.bidNewMarket);
    bidTableData.push({ 
      [districtLabel]: bidContent?.districts?.newMarket || 'New Market', 
      [amountLabel]: formatCurrency(props.bidNewMarket) 
    });
  }
  // Add total row
  if (bidTableData.length > 0) {
    const formattedTotal = `$${bidTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    bidTableData.push({ 
      [districtLabel]: <strong>Total</strong>, 
      [amountLabel]: <strong>{formattedTotal}</strong> 
    });
  }

  // BID payment schedule data
  const bidHalfPayment = bidTotal / 2;
  const formattedHalfPayment = `$${bidHalfPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const q3DueDate = BID_Q3_PAYMENT_DUE_DATE.getDate(currentYear);
  const q4DueDate = BID_Q4_PAYMENT_DUE_DATE.getDate(currentYear);
  const paymentDueLabel = bidContent?.paymentTableLabel?.paymentDue || 'Payment Due';
  const paymentAmountLabel = bidContent?.paymentTableLabel?.amount || 'Amount';
  const bidPaymentTableData = [
    {
      [paymentDueLabel]: `3rd Quarter Payment (due ${formatDateForDisplay(q3DueDate)})`,
      [paymentAmountLabel]: formattedHalfPayment,
    },
    {
      [paymentDueLabel]: `4th Quarter Payment (due ${formatDateForDisplay(q4DueDate)})`,
      [paymentAmountLabel]: formattedHalfPayment,
    },
  ];

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

      <div className={styles.netTaxSection}>
        <h3 className={styles.header}>
          {netTaxHeader}
        </h3>
        <div className={sharedStyles.paragraph}>
           <ReactMarkdown>
             {String(netTaxDescription)}
           </ReactMarkdown>
        </div>
      </div>

      <div className={styles.accordion}>
        <FormulaAccordion drawerOptions={drawerOptions} />
      </div>

      {/* Street Betterment Section */}
      {hasStreetBetterment && (
        <div className={styles.additionalChargesSection}>
          <h3 className={styles.header}>{streetBettermentContent?.title || 'Street Betterment'}</h3>
          <div className={sharedStyles.paragraph}>
            {streetBettermentContent?.description || 'Street betterment assessments are charges for street improvements that benefit your property. These assessments are added to your tax bill.'}
          </div>
          <div className={styles.chargeTable}>
            <ResponsiveTable 
              data={[{ 
                [streetBettermentContent?.tableLabel?.description || 'Description']: streetBettermentContent?.tableRow || 'Street Betterment', 
                [streetBettermentContent?.tableLabel?.amount || 'Amount']: formatCurrency(props.streetBetterment) 
              }]} 
            />
          </div>
        </div>
      )}

      {/* 38D Fine Section */}
      {has38dFine && (
        <div className={styles.additionalChargesSection}>
          <h3 className={styles.header}>{fine38dContent?.title || '38D Fine'}</h3>
          <div className={sharedStyles.paragraph}>
            {fine38dContent?.description || 'This is a fine imposed under Massachusetts General Law Chapter 59, Section 38D for failure to file required property tax documents.'}
          </div>
          <div className={styles.chargeTable}>
            <ResponsiveTable 
              data={[{ 
                [fine38dContent?.tableLabel?.description || 'Description']: fine38dContent?.tableRow || '38D Fine', 
                [fine38dContent?.tableLabel?.amount || 'Amount']: formatCurrency(props.fine38d) 
              }]} 
            />
          </div>
        </div>
      )}

      {/* BID Section */}
      {hasAnyBid && (
        <div className={styles.additionalChargesSection}>
          <h3 className={styles.header}>{bidContent?.title || 'Business Improvement District (BID) Assessment'}</h3>
          <div className={sharedStyles.paragraph}>
            {bidContent?.description || 'BID assessments are special charges for properties located within designated Business Improvement Districts. These funds support district-specific improvements and services.'}
          </div>
          <div className={styles.chargeTable}>
            <ResponsiveTable data={bidTableData} />
          </div>
          <div className={styles.chargeTable}>
            <ResponsiveTable data={bidPaymentTableData} />
          </div>
        </div>
      )}

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