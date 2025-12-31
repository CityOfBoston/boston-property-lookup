/**
 * Fiscal Data Utility - Provides fiscal year configuration data
 * 
 * This module reads fiscal year data from fiscalData.yaml and provides
 * functions to retrieve:
 * - Tax rates (residential and commercial) by fiscal year
 * - Owner disclaimer dates that change quarterly (Q1 & Q3)
 */

import fiscalDataConfig from './fiscalData.yaml';

interface FiscalYearData {
  taxRates: {
    residential: number;
    commercial: number;
  };
  ownerDisclaimerDates: {
    q1: string;  // Date string for Q1 (July - December)
    q3: string;  // Date string for Q3 (January - June)
  };
}

interface FiscalDataConfig {
  fiscalYears: {
    [fiscalYear: number]: FiscalYearData;
  };
  defaults: {
    taxRates: {
      residential: number;
      commercial: number;
    };
    ownerDisclaimerDate: string;
  };
}

const config = fiscalDataConfig as FiscalDataConfig;

/**
 * Get the latest configured fiscal year
 * @returns The highest fiscal year number in the configuration
 */
function getLatestFiscalYear(): number {
  const years = Object.keys(config.fiscalYears).map(Number);
  return Math.max(...years);
}

/**
 * Get tax rates for a given fiscal year
 * Returns the rates for the specified year, or:
 * - If year is in the future (beyond configured years), returns latest configured year's rates
 * - Otherwise, returns default rates
 */
export function getTaxRates(fiscalYear: number): {
  residential: number;
  commercial: number;
} {
  const yearData = config.fiscalYears[fiscalYear];
  
  if (yearData && yearData.taxRates) {
    return yearData.taxRates;
  }
  
  // If the requested year is in the future (beyond our configured data),
  // use the latest available year's rates
  const latestYear = getLatestFiscalYear();
  if (fiscalYear > latestYear) {
    const latestYearData = config.fiscalYears[latestYear];
    if (latestYearData && latestYearData.taxRates) {
      return latestYearData.taxRates;
    }
  }
  
  // Return default rates if the specific year is not found or is in the past
  return config.defaults.taxRates;
}

/**
 * Get residential tax rate for a given fiscal year
 */
export function getResidentialTaxRate(fiscalYear: number): number {
  return getTaxRates(fiscalYear).residential;
}

/**
 * Get commercial tax rate for a given fiscal year
 */
export function getCommercialTaxRate(fiscalYear: number): number {
  return getTaxRates(fiscalYear).commercial;
}

/**
 * Format tax rate for display
 * @param rate - Tax rate per $1,000
 * @returns Formatted string like "$11.58 per $1,000"
 */
export function formatTaxRate(rate: number): string {
  return `$${rate.toFixed(2)} per $1,000`;
}

/**
 * Get all available fiscal years with tax rates
 */
export function getAvailableFiscalYears(): number[] {
  return Object.keys(config.fiscalYears).map(Number).sort((a, b) => a - b);
}

/**
 * Check if tax rates are available for a given fiscal year
 */
export function hasTaxRatesForYear(fiscalYear: number): boolean {
  return config.fiscalYears.hasOwnProperty(fiscalYear);
}

/**
 * Get the owner disclaimer date for a given date
 * Owner disclaimer dates change quarterly:
 * - Q1 (July - December): Uses q1 date
 * - Q3 (January - June): Uses q3 date
 * 
 * For future dates beyond configured fiscal years, uses the latest Q3 date.
 * 
 * @param date - The date to get the disclaimer date for
 * @returns Formatted disclaimer text with the appropriate date
 */
export function getOwnerDisclaimerDate(date: Date): string {
  // Determine fiscal year (July 1 - June 30)
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0=Jan, 6=July
  const fiscalYear = month >= 6 ? year + 1 : year;
  
  // Determine quarter (Q1 = July-Dec, Q3 = Jan-June)
  const isQ1 = month >= 6 && month <= 11; // July (6) through December (11)
  const quarter = isQ1 ? 'q1' : 'q3';
  
  // Get the disclaimer date for this fiscal year and quarter
  const yearData = config.fiscalYears[fiscalYear];
  
  if (yearData && yearData.ownerDisclaimerDates && yearData.ownerDisclaimerDates[quarter]) {
    return yearData.ownerDisclaimerDates[quarter];
  }
  
  // If the requested year is in the future (beyond our configured data),
  // use the latest available year's Q3 date (most recent disclaimer update)
  const latestYear = getLatestFiscalYear();
  if (fiscalYear > latestYear) {
    const latestYearData = config.fiscalYears[latestYear];
    if (latestYearData && latestYearData.ownerDisclaimerDates) {
      // Prefer Q3 as it's the most recent update in the fiscal year
      if (latestYearData.ownerDisclaimerDates.q3) {
        return latestYearData.ownerDisclaimerDates.q3;
      }
      // Fall back to Q1 if Q3 is not available
      if (latestYearData.ownerDisclaimerDates.q1) {
        return latestYearData.ownerDisclaimerDates.q1;
      }
    }
  }
  
  // Fall back to default disclaimer date for past years or if no data found
  return config.defaults.ownerDisclaimerDate;
}

/**
 * Get the full owner disclaimer text with the appropriate date
 * 
 * @param date - The date to get the disclaimer for
 * @returns Full disclaimer text
 */
export function getOwnerDisclaimer(date: Date): string {
  const disclaimerDate = getOwnerDisclaimerDate(date);
  return `Owner information may not reflect any changes submitted to the City of Boston's Assessing Department after ${disclaimerDate}.`;
}
