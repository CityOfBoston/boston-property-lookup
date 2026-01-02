/**
 * Property Tax Presenter - OWNS React element creation for property tax content
 * 
 * Responsibilities:
 * - Creates React elements for tax-related content
 * - Formats tax rate descriptions with links
 * - Builds message box content
 * - Handles URL construction with parcel IDs
 * - Creates tax payment buttons
 * 
 * Does NOT:
 * - Determine tax phases or periods (that's usePropertyTaxCalculations)
 * - Resolve content from YAML (that's ContentService/LanguageService)
 * - Handle business logic or calculations
 * - Manage application state
 * 
 * @module presenters/PropertyTaxPresenter
 */

import React from 'react';
import { getMarkdownText } from '@utils/markdown/markdownRenderer';
import { languageService, getStringValue, getUrlValue } from '@services/content/LanguageService';
import { formatDateForDisplay, EXEMPTION_APPLICATION_DEADLINE_DATE } from '@utils/periods';

export interface PropertyTaxPresenterContext {
  fiscalYear: number;
  calendarYear: number;
  displayFY: number;
  parcelId: string;
  residentialGranted: boolean;
  residentialExemptionPhase: { phase: string };
  personalGranted: boolean;
  personalExemptionPhase: { phase: string };
}

export class PropertyTaxPresenter {
  constructor(private context: PropertyTaxPresenterContext) {}

  /**
   * Create tax rate header text
   */
  createTaxRateHeader(): string {
    return getStringValue(
      languageService.getPropertyTaxMessage('tax_rate_header', { 
        current_fy: this.context.displayFY 
      })
    );
  }

  /**
   * Create tax rate description with link
   */
  createTaxRateDescription(): React.ReactNode {
    return React.createElement(
      React.Fragment,
      null,
      getStringValue(languageService.getPropertyTaxMessage('tax_rate_description')),
      ' ',
      React.createElement(
        'a',
        {
          className: 'usa-link usa-link--external',
          rel: 'noreferrer',
          target: '_blank',
          href: getUrlValue(languageService.getPropertyTaxMessage('how_we_tax_url'))
        },
        'How we tax your property'
      ),
      '.'
    );
  }

  /**
   * Create tax rate history link
   */
  createTaxRateHistoryLink(): React.ReactNode {
    return React.createElement(
      'a',
      {
        className: 'usa-link usa-link--external',
        rel: 'noreferrer',
        target: '_blank',
        href: getUrlValue(languageService.getPropertyTaxMessage('tax_rate_history_url'))
      },
      getStringValue(languageService.getPropertyTaxMessage('view_tax_rate_history'))
    );
  }

  /**
   * Create message box content based on exemption phase
   */
  createMessageBoxContent(): string {
    const phase = this.context.residentialExemptionPhase.phase;
    
    if (phase === 'open') {
      return getMarkdownText(
        this.context.residentialGranted 
          ? languageService.getPropertyTaxMessage('residential_exemption_granted')
          : languageService.getPropertyTaxMessage('residential_exemption_not_granted', {
              residential_exemption_url: getUrlValue(
                languageService.getPropertyTaxMessage('residential_exemption_url', { 
                  current_fy: this.context.fiscalYear, 
                  parcel_id: this.context.parcelId 
                })
              )
            })
      );
    }
    
    if (phase === 'after_deadline' || phase === 'after_grace') {
      return getMarkdownText(
        languageService.getPropertyTaxMessage('residential_deadline_passed', {
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear)
          ),
          next_fy: this.context.fiscalYear + 1
        })
      );
    }
    
    if (phase === 'preliminary') {
      return getMarkdownText(
        languageService.getString('periods.MessageBox_messages.regular_message', {
          current_fy: this.context.fiscalYear,
          next_fy: this.context.fiscalYear + 1
        })
      );
    }
    
    return getMarkdownText(
      languageService.getString('periods.MessageBox_messages.regular_message', {
        current_fy: this.context.fiscalYear,
        next_fy: this.context.fiscalYear + 1
      })
    );
  }

  /**
   * Create personal exemption message box content based on exemption phase
   */
  createPersonalExemptionMessageBoxContent(): string {
    const phase = this.context.personalExemptionPhase.phase;
    
    if (phase === 'open') {
      return getMarkdownText(
        this.context.personalGranted 
          ? languageService.getPropertyTaxMessage('personal_exemption_open_granted')
          : languageService.getPropertyTaxMessage('personal_exemption_open_not_granted', {
              personal_exemption_url: getUrlValue(
                languageService.getPropertyTaxMessage('personal_exemption_url', { 
                  current_fy: this.context.fiscalYear, 
                  parcel_id: this.context.parcelId 
                })
              )
            })
      );
    }
    
    if (phase === 'after_deadline' || phase === 'after_grace') {
      return getMarkdownText(
        languageService.getPropertyTaxMessage('personal_deadline_passed', {
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear)
          ),
          next_fy: this.context.fiscalYear + 1
        })
      );
    }
    
    if (phase === 'preliminary') {
      return getMarkdownText(
        languageService.getString('periods.MessageBox_messages.regular_message', {
          current_fy: this.context.fiscalYear,
          next_fy: this.context.fiscalYear + 1
        })
      );
    }
    
    return getMarkdownText(
      languageService.getString('periods.MessageBox_messages.regular_message', {
        current_fy: this.context.fiscalYear,
        next_fy: this.context.fiscalYear + 1
      })
    );
  }

  /**
   * Create net tax header text
   */
  createNetTaxHeader(isPrelimPeriod: boolean): string {
    return isPrelimPeriod 
      ? getStringValue(
          languageService.getPropertyTaxMessage('net_tax_preliminary_header', { 
            current_fy: this.context.displayFY, 
            prev_year: this.context.displayFY - 1 
          })
        )
      : getStringValue(languageService.getPropertyTaxMessage('net_tax_header'));
  }

  /**
   * Create net tax description
   */
  createNetTaxDescription(isPrelimPeriod: boolean): string {
    return isPrelimPeriod 
      ? getMarkdownText(
          languageService.getPropertyTaxMessage('net_tax_preliminary_description', { 
            current_fy: this.context.displayFY,
            prev_year: this.context.displayFY - 1,
            current_year: this.context.displayFY
          })
        )
      : getMarkdownText(languageService.getPropertyTaxMessage('net_tax_description'));
  }

  /**
   * Create pay taxes button element
   */
  createPayTaxesButton(): React.ReactNode {
    return React.createElement(
      'a',
      {
        href: getUrlValue(
          languageService.getString('periods.buttons.pay_taxes_url', { 
            parcel_id: this.context.parcelId 
          })
        ),
        target: '_blank',
        rel: 'noreferrer',
        className: 'usa-button usa-button--primary'
      },
      getStringValue(languageService.getString('periods.buttons.pay_your_taxes'))
    );
  }

  /**
   * Create print pay taxes text
   */
  createPrintPayTaxesText(): string {
    return `Pay your taxes via ${getUrlValue(
      languageService.getString('periods.buttons.pay_taxes_url', { 
        parcel_id: this.context.parcelId 
      })
    )}`;
  }

  /**
   * Create community preservation description
   */
  createCommunityPreservationDescription(): React.ReactNode {
    return React.createElement(
      'div',
      null,
      'The Community Preservation surcharge supports a variety of programs. To learn more, visit the ',
      React.createElement(
        'a',
        {
          className: 'usa-link usa-link--external',
          rel: 'noreferrer',
          target: '_blank',
          href: 'https://www.boston.gov/departments/assessing/community-preservation-act'
        },
        'Community Preservation Act'
      ),
      ' page.'
    );
  }
}

