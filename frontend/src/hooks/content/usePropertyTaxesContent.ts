/**
 * Property Taxes Content Hook - OWNS coordination of property tax content
 * 
 * Responsibilities:
 * - Coordinates tax calculations, exemption phases, and presentation
 * - Assembles drawer options and tax rate cards
 * - Manages content lifecycle for PropertyTaxesSection
 * 
 * Does NOT:
 * - Perform calculations directly (delegated to usePropertyTaxCalculations)
 * - Create React elements directly (delegated to presenters)
 * - Resolve content directly (delegated to services)
 * 
 * @module hooks/content/usePropertyTaxesContent
 */

import React from 'react';
import type { PropertyTaxesSectionData } from '@src/types';
import { usePropertyTaxCalculations } from '@hooks/usePropertyTaxCalculations';
import { useExemptionPhases } from '@hooks/logic/useExemptionPhases';
import { ExemptionPresenter } from '@presenters/ExemptionPresenter';
import { PropertyTaxPresenter } from '@presenters/PropertyTaxPresenter';
import { getResidentialExemptionValue, getPersonalExemptionValue } from './useExemptionValues';
import { getTaxRates, formatTaxRate } from '@utils/taxRates';

export interface PropertyTaxContent {
  taxRateCards: Array<{
    header: string;
    value: string;
    isGrey: boolean;
  }>;
  drawerOptions: Array<{
    title: string | React.ReactNode;
    value: string | React.ReactNode;
    message?: React.ReactNode;
    description?: React.ReactNode;
  }>;
  isPrelimPeriod: boolean;
  displayFY: number;
  fiscalYear: number;
  sectionData: PropertyTaxesSectionData;
  taxRateHeader: string;
  taxRateDescription: React.ReactNode;
  taxRateHistoryLink: React.ReactNode;
  messageBoxContent: React.ReactNode;
  netTaxHeader: string;
  netTaxDescription: React.ReactNode;
  payTaxesButton: React.ReactNode;
  printPayTaxesText: string;
}

/**
 * Hook for property taxes section content
 */
export function usePropertyTaxesContent(props: PropertyTaxesSectionData): PropertyTaxContent {
  const calculations = usePropertyTaxCalculations(props);
  const {
    fiscalYear,
    displayFY,
    isPrelimPeriod,
    formatTaxValue,
  } = calculations;

  const exemptionPhases = useExemptionPhases({
    residentialExemptionAmount: props.residentialExemptionAmount,
    residentialExemptionFlag: props.residentialExemptionFlag,
    personalExemptionAmount: props.personalExemptionAmount,
    personalExemptionFlag: props.personalExemptionFlag,
  });

  const {
    residentialExemptionPhase,
    personalExemptionPhase,
    residentialExemptionApproved,
    personalExemptionApproved,
    residentialGranted,
    personalGranted,
    calendarYear,
  } = exemptionPhases;

  // Create presenters with context
  const exemptionPresenter = new ExemptionPresenter({
    fiscalYear,
    calendarYear,
    isPrelimPeriod,
    displayFY,
    residentialExemptionMaxAmount: props.residentialExemptionAmount,
  });

  const taxPresenter = new PropertyTaxPresenter({
    fiscalYear,
    calendarYear,
    displayFY,
    parcelId: props.parcelId,
    residentialGranted,
    residentialExemptionPhase,
  });

  // Get tax rates for the display fiscal year
  const taxRates = getTaxRates(displayFY);
  
  // Tax rate cards - dynamic based on fiscal year
  const taxRateCards = [
    {
      header: 'Residential Tax Rate',
      value: formatTaxRate(taxRates.residential),
      isGrey: true,
    },
    {
      header: 'Commercial Tax Rate',
      value: formatTaxRate(taxRates.commercial),
      isGrey: true,
    },
  ];

  // Get exemption values
  const residentialExemptionValue = getResidentialExemptionValue({
    amount: props.residentialExemptionAmount,
    granted: residentialGranted,
    approved: residentialExemptionApproved,
    isPrelimPeriod,
    formatTaxValue,
  });

  const personalExemptionValue = getPersonalExemptionValue({
    amount: props.personalExemptionAmount,
    granted: personalGranted,
    approved: personalExemptionApproved,
    isPrelimPeriod,
    formatTaxValue,
  });

  // Build drawer options
  const drawerOptions = [
    {
      title: isPrelimPeriod ? `FY${displayFY} Estimated Tax (Q1 + Q2)` : `FY${displayFY} Gross Tax`,
      value: formatTaxValue(isPrelimPeriod ? props.estimatedTotalFirstHalf : props.propertyGrossTax),
    },
    {
      title: 'Residential Exemptions',
      value: residentialExemptionValue,
      message: exemptionPresenter.createResidentialExemptionMessage(
        residentialExemptionPhase.phase,
        residentialExemptionApproved
      ),
      description: exemptionPresenter.createResidentialExemptionDescription(
        residentialExemptionPhase.phase
      ),
    },
    {
      title: 'Personal Exemptions',
      value: personalExemptionValue,
      message: exemptionPresenter.createPersonalExemptionMessage(
        personalExemptionPhase.phase,
        personalExemptionApproved
      ),
      description: exemptionPresenter.createPersonalExemptionDescription(
        personalExemptionPhase.phase
      ),
    },
    {
      title: 'Community Preservation',
      value: formatTaxValue(props.communityPreservationAmount) !== 'N/A' 
        ? `+ ${formatTaxValue(props.communityPreservationAmount)}` 
        : 'N/A',
      description: taxPresenter.createCommunityPreservationDescription(),
    },
    {
      title: React.createElement(
        'div', 
        { className: 'netTax' }, 
        isPrelimPeriod ? `FY${displayFY} Estimated Total, First Half (Q1 + Q2)` : `FY${displayFY} Net Tax`
      ),
      value: React.createElement(
        'div', 
        { className: 'netTax' }, 
        formatTaxValue(isPrelimPeriod ? props.totalBilledAmount : props.propertyNetTax)
      ),
      // No message or description for the total tax - this removes the drawer
    },
  ];

  return {
    taxRateCards,
    drawerOptions,
    isPrelimPeriod,
    displayFY,
    fiscalYear,
    sectionData: props,
    taxRateHeader: taxPresenter.createTaxRateHeader(),
    taxRateDescription: taxPresenter.createTaxRateDescription(),
    taxRateHistoryLink: taxPresenter.createTaxRateHistoryLink(),
    messageBoxContent: taxPresenter.createMessageBoxContent(),
    netTaxHeader: taxPresenter.createNetTaxHeader(isPrelimPeriod),
    netTaxDescription: taxPresenter.createNetTaxDescription(isPrelimPeriod),
    payTaxesButton: taxPresenter.createPayTaxesButton(),
    printPayTaxesText: taxPresenter.createPrintPayTaxesText(),
  };
}

