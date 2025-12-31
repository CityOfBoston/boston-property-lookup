/**
 * Overview Content Hook - OWNS overview section content coordination
 * 
 * Responsibilities:
 * - Coordinates overview section display content
 * - Formats property type labels
 * - Determines exemption status display
 * - Builds overview cards data
 * - Manages URL construction for maps and tax payments
 * 
 * Does NOT:
 * - Perform complex business calculations
 * - Create React elements (returns data only)
 * - Fetch external data
 * 
 * @module hooks/content/useOverviewContent
 */

import React from 'react';
import { contentService } from '@services/content/ContentService';
import { languageService } from '@services/content/LanguageService';
import { useDateContext } from '@hooks/useDateContext';
import { getOwnerDisclaimer } from '@utils/fiscalData';
import type { OverviewSectionData } from '@src/types';

export interface OverviewCard {
  icon: React.ReactNode;
  header: string;
  value: string;
}

export interface OverviewContent {
  content: any;
  sharedLabels: any;
  isPrelimPeriod: boolean;
  cards: OverviewCard[];
  ownerDisclaimer: string;
  getExemptionStatus: (amount: number, flag: boolean) => string;
  formatPropertyType: (code: string, description?: string) => string;
  formatValue: (value: number | null | undefined) => string;
  getMapUrl: (parcelId: string) => string;
  getPayTaxesUrl: (parcelId: string) => string;
}

/**
 * Helper function to determine property type based on property code
 * Property code is 4 digits (e.g., "0101"), first digit is always 0
 * We use the last 3 digits for classification
 */
const getPropertyTypeLabel = (propertyCode: string, sharedLabels: any): string => {
  // Extract the last 3 digits
  const last3Digits = propertyCode.slice(-3);
  const code = parseInt(last3Digits, 10);
  
  // Handle invalid codes
  if (isNaN(code)) {
    return sharedLabels.unknown || 'Unknown';
  }

  // Commercial property codes: 010-031, 111-129, 140, 200-999
  if ((code >= 10 && code <= 31) || 
      (code >= 111 && code <= 129) || 
      code === 140 || 
      (code >= 200 && code <= 999)) {
    return sharedLabels.commercial;
  }
  
  // Residential property codes: everything else (101-110, 130-132, etc.)
  return sharedLabels.residential;
};

/**
 * Hook for overview section content
 */
export function useOverviewContent(data: OverviewSectionData): OverviewContent {
  const content = contentService.getComponentContent('OverviewSection');
  const sharedLabels = contentService.getCommonContent().labels;
  const { date } = useDateContext();
  
  // Determine if we're in the preliminary period (July-December)
  const nowMonth = date.getMonth();
  const isPrelimPeriod = nowMonth >= 6 && nowMonth < 12;
  
  // Get dynamic owner disclaimer based on current date
  const ownerDisclaimer = getOwnerDisclaimer(date);
  
  // Format values
  const formatValue = (value: number | null | undefined): string => {
    return value != null ? `$${value.toLocaleString()}` : 'N/A';
  };

  // In preliminary period, exemption flags show application status for current FY
  // Outside preliminary period, exemption flags don't indicate anything meaningful
  const getExemptionStatus = (amount: number, flag: boolean): string => {
    if (amount > 0) {
      return languageService.getOverviewMessage('granted');
    }
    if (isPrelimPeriod && flag) {
      return languageService.getOverviewMessage('amount_to_be_decided');
    }
    if (isPrelimPeriod && !flag) {
      return languageService.getOverviewMessage('preliminary_flag_false');
    }
    return languageService.getOverviewMessage('not_granted');
  };

  const formatPropertyType = (code: string, description?: string): string => {
    return `${description || getPropertyTypeLabel(code, sharedLabels)} (${code})`;
  };
  
  // Helper to safely get URL with parcel_id replacement
  const getMapUrl = (parcelId: string): string => {
    const url = content.map?.url || `https://app01.cityofboston.gov/AssessingMap/?find={parcel_id}`;
    return url.replace('{parcel_id}', parcelId);
  };
  
  const getPayTaxesUrl = (parcelId: string): string => {
    const url = content.buttons?.payTaxes?.url || `https://www.boston.gov/real-estate-taxes?input1={parcel_id}`;
    return url.replace('{parcel_id}', parcelId);
  };

  // Build cards array
  const cards: OverviewCard[] = [
    {
      icon: React.createElement('img', { src: content.cards.parcelId.icon }),
      header: content.cards.parcelId.header,
      value: data.parcelId.toString()
    },
    {
      icon: React.createElement('img', { src: content.cards.netTax.icon }),
      header: isPrelimPeriod 
        ? content.cards.netTax.header.preliminary.replace('{year}', '26')
        : content.cards.netTax.header.regular.replace('{year}', '25'),
      value: isPrelimPeriod 
        ? formatValue(data.totalBilledAmount)
        : formatValue(data.netTax)
    },
    { 
      icon: React.createElement('img', { src: content.cards.personalExemption.icon }),
      header: content.cards.personalExemption.header,
      value: getExemptionStatus(data.personalExemptionAmount, data.personalExemptionFlag)
    },
    {
      icon: React.createElement('img', { src: content.cards.residentialExemption.icon }),
      header: content.cards.residentialExemption.header,
      value: getExemptionStatus(data.residentialExemptionAmount, data.residentialExemptionFlag)
    }
  ];

  return {
    content,
    sharedLabels,
    isPrelimPeriod,
    cards,
    ownerDisclaimer,
    getExemptionStatus,
    formatPropertyType,
    formatValue,
    getMapUrl,
    getPayTaxesUrl,
  };
}

