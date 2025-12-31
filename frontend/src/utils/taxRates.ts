/**
 * Tax Rates Utility - Provides tax rates by fiscal year
 * 
 * This module reads tax rates from taxRates.yaml and provides
 * functions to retrieve residential and commercial tax rates
 * for a given fiscal year.
 */

import taxRatesData from './taxRates.yaml';

interface TaxRatesConfig {
  taxRates: {
    [fiscalYear: number]: {
      residential: number;
      commercial: number;
    };
  };
  defaultRates: {
    residential: number;
    commercial: number;
  };
}

const config = taxRatesData as TaxRatesConfig;

/**
 * Get tax rates for a given fiscal year
 * Returns the rates for the specified year, or default rates if not found
 */
export function getTaxRates(fiscalYear: number): {
  residential: number;
  commercial: number;
} {
  const yearRates = config.taxRates[fiscalYear];
  
  if (yearRates) {
    return yearRates;
  }
  
  // Return default rates if the specific year is not found
  return config.defaultRates;
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
  return Object.keys(config.taxRates).map(Number).sort((a, b) => a - b);
}

/**
 * Check if tax rates are available for a given fiscal year
 */
export function hasTaxRatesForYear(fiscalYear: number): boolean {
  return config.taxRates.hasOwnProperty(fiscalYear);
}
