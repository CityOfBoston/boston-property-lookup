/**
 * Exemption Presenter - OWNS React element creation for exemption content
 * 
 * Responsibilities:
 * - Creates React elements for exemption messages and descriptions
 * - Handles phase-specific content rendering
 * - Manages link and phone number element creation
 * - Formats structured content from language service
 * 
 * Does NOT:
 * - Determine which phase we're in (that's useExemptionPhases)
 * - Resolve content from YAML (that's ContentService/LanguageService)
 * - Handle business logic or calculations
 * - Manage application state
 * 
 * @module presenters/ExemptionPresenter
 */

import React from 'react';
import { renderMarkdown, getMarkdownText } from '@utils/markdown/markdownRenderer';
import { languageService, getStringValue } from '@services/content/LanguageService';
import { formatDateForDisplay, EXEMPTION_APPLICATION_DEADLINE_DATE } from '@utils/periods';
import type { StructuredDescription } from '@utils/periodsLanguage';

export interface ExemptionPresenterContext {
  fiscalYear: number;
  calendarYear: number;
  isPrelimPeriod: boolean;
  displayFY: number;
  residentialExemptionMaxAmount: number;
  parcelId: string;
}

export class ExemptionPresenter {
  constructor(private context: ExemptionPresenterContext) {}

  /**
   * Create residential exemption message element based on phase
   */
  createResidentialExemptionMessage(
    phase: string,
    residentialExemptionApproved: boolean
  ): React.ReactNode {
    if (phase === 'preliminary') {
      const message = getMarkdownText(
        residentialExemptionApproved 
          ? languageService.getPropertyTaxMessage('residential_preliminary_submitted', { 
              current_fy: this.context.displayFY 
            })
          : languageService.getPropertyTaxMessage('residential_preliminary_not_submitted', { 
              current_fy: this.context.displayFY 
            })
      );
      return renderMarkdown(message);
    } else if (phase === 'open') {
      const message = getMarkdownText(
        languageService.getExemptionPhaseMessage('open', {
          exemption_type: 'Residential',
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear), 
            { withTime: true }
          ),
          current_year: this.context.calendarYear
        })
      );
      return renderMarkdown(message);
    } else if (phase === 'after_deadline') {
      const message = getMarkdownText(
        languageService.getExemptionPhaseMessage('after_deadline', {
          exemption_type: 'Residential',
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear)
          ),
          next_fy: this.context.fiscalYear + 1,
          next_jan1_date: formatDateForDisplay(new Date(this.context.calendarYear + 1, 0, 1)),
          current_year: this.context.calendarYear
        })
      );
      return renderMarkdown(message);
    } else {
      const message = getMarkdownText(
        languageService.getPropertyTaxMessage('residential_deadline_passed', {
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear)
          ),
          next_fy: this.context.fiscalYear + 1
        })
      );
      return renderMarkdown(message);
    }
  }

  /**
   * Create residential exemption description element based on phase
   */
  createResidentialExemptionDescription(phase: string): React.ReactNode {
    if (phase === 'preliminary') {
      const desc = languageService.getPropertyTaxMessage(
        'residential_exemption_preliminary_description'
      ) as StructuredDescription;
      
      return React.createElement(
        'div',
        null,
        React.createElement(
          'p',
          null,
          desc.text,
          ' ',
          React.createElement(
            'a',
            {
              href: desc.links.trac.url,
              className: 'usa-link usa-link--external',
              rel: 'noreferrer',
              target: '_blank'
            },
            desc.links.trac.text
          ),
          desc.phone && React.createElement(
            React.Fragment,
            null,
            ' at ',
            React.createElement(
              'a',
              {
                href: desc.phone.url,
                className: 'usa-link',
                'aria-label': desc.phone.label
              },
              desc.phone.text
            )
          ),
          desc.application_text && React.createElement(
            React.Fragment,
            null,
            ' ',
            desc.application_text.prefix,
            ' ',
            React.createElement('strong', null, desc.application_text.date),
            ' ',
            desc.application_text.suffix
          )
        ),
        React.createElement(
          'p',
          null,
          React.createElement(
            'a',
            {
              href: desc.links.more_info.url,
              className: 'usa-link usa-link--external',
              rel: 'noreferrer',
              target: '_blank'
            },
            desc.links.more_info.text
          )
        )
      );
    } else if (phase === 'open') {
      const desc = languageService.getPropertyTaxMessage(
        'residential_exemption_open_description'
      ) as StructuredDescription;
      
      const deadlineDate = formatDateForDisplay(
        EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear), 
        { withTime: true }
      );
      const interpolatedText = desc.text
        .replace('{fiscal_year}', String(this.context.fiscalYear))
        .replace('{deadline_date}', deadlineDate);
      
      return React.createElement(
        'div',
        null,
        React.createElement(
          'p',
          null,
          interpolatedText,
          ' ',
          React.createElement(
            'a',
            {
              href: desc.links.how_to_apply.url,
              className: 'usa-link usa-link--external',
              rel: 'noreferrer',
              target: '_blank'
            },
            desc.links.how_to_apply.text
          )
        ),
        React.createElement(
          'p',
          null,
          desc.status_text,
          ' ',
          React.createElement(
            'a',
            {
              href: desc.links.trac.url,
              className: 'usa-link usa-link--external',
              rel: 'noreferrer',
              target: '_blank'
            },
            desc.links.trac.text
          ),
          desc.phone && React.createElement(
            React.Fragment,
            null,
            ' at ',
            React.createElement(
              'a',
              {
                href: desc.phone.url,
                className: 'usa-link',
                'aria-label': desc.phone.label
              },
              desc.phone.text
            )
          )
        ),
        React.createElement(
          'p',
          { style: { marginTop: '1rem' } },
          React.createElement(
            'a',
            {
              href: `#/form?parcelId=${this.context.parcelId}&formType=residential`,
              className: 'usa-link'
            },
            `Generate and download the residential exemption application for FY${this.context.fiscalYear + 1}`
          )
        )
      );
    } else {
      const description = getMarkdownText(
        languageService.getPropertyTaxMessage('residential_exemption_description', { 
          max_amount: this.context.residentialExemptionMaxAmount.toLocaleString() 
        })
      );
      return renderMarkdown(description);
    }
  }

  /**
   * Create personal exemption message element based on phase
   */
  createPersonalExemptionMessage(
    phase: string,
    personalExemptionApproved: boolean
  ): React.ReactNode {
    if (phase === 'preliminary') {
      const message = getMarkdownText(
        personalExemptionApproved 
          ? languageService.getPropertyTaxMessage('personal_preliminary_submitted', { 
              current_fy: this.context.displayFY 
            })
          : languageService.getPropertyTaxMessage('personal_preliminary_not_submitted', { 
              current_fy: this.context.displayFY - 1 
            })
      );
      return renderMarkdown(message);
    } else if (phase === 'open') {
      const message = getMarkdownText(
        languageService.getExemptionPhaseMessage('open', {
          exemption_type: 'Personal',
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear), 
            { withTime: true }
          ),
          current_year: this.context.calendarYear
        })
      );
      return renderMarkdown(message);
    } else if (phase === 'after_deadline') {
      const message = getMarkdownText(
        languageService.getExemptionPhaseMessage('after_deadline', {
          exemption_type: 'Personal',
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear)
          ),
          next_fy: this.context.fiscalYear + 1,
          next_jan1_date: formatDateForDisplay(new Date(this.context.calendarYear + 1, 0, 1)),
          current_year: this.context.calendarYear
        })
      );
      return renderMarkdown(message);
    } else {
      const message = getMarkdownText(
        languageService.getPropertyTaxMessage('personal_deadline_passed', {
          next_year: this.context.fiscalYear,
          deadline_date: formatDateForDisplay(
            EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(this.context.calendarYear)
          ),
          next_fy: this.context.fiscalYear + 1
        })
      );
      return renderMarkdown(message);
    }
  }

  /**
   * Create personal exemption description element based on phase
   */
  createPersonalExemptionDescription(phase: string): React.ReactNode {
    if (phase === 'preliminary') {
      const desc = languageService.getPropertyTaxMessage(
        'personal_exemption_preliminary_description'
      ) as StructuredDescription;
      
      return React.createElement(
        'div',
        null,
        React.createElement(
          'p',
          null,
          desc.text,
          ' ',
          React.createElement(
            'a',
            {
              href: desc.links.trac.url,
              className: 'usa-link usa-link--external',
              rel: 'noreferrer',
              target: '_blank'
            },
            desc.links.trac.text
          ),
          ' ',
          desc.suffix,
          desc.phone && React.createElement(
            React.Fragment,
            null,
            ' at ',
            React.createElement(
              'a',
              {
                href: desc.phone.url,
                className: 'usa-link',
                'aria-label': desc.phone.label
              },
              desc.phone.text
            )
          )
        ),
        this.createPersonalExemptionLinks()
      );
    } else if (phase === 'open') {
      return React.createElement(
        'div',
        null,
        React.createElement(
          'p',
          null,
          renderMarkdown(
            getMarkdownText(
              languageService.getPropertyTaxMessage('personal_exemption_description')
            )
          )
        ),
        this.createPersonalExemptionLinks(),
        React.createElement(
          'p',
          { style: { marginTop: '1rem' } },
          React.createElement(
            'a',
            {
              href: `#/form?parcelId=${this.context.parcelId}&formType=personal`,
              className: 'usa-link'
            },
            `Generate and download the personal exemption application for FY${this.context.fiscalYear + 1}`
          )
        )
      );
    } else {
      return React.createElement(
        'div',
        null,
        React.createElement(
          'p',
          null,
          renderMarkdown(
            getMarkdownText(
              languageService.getPropertyTaxMessage('personal_exemption_description')
            )
          )
        ),
        this.createPersonalExemptionLinks()
      );
    }
  }

  /**
   * Create personal exemption links list
   */
  private createPersonalExemptionLinks(): React.ReactNode {
    const exemptionKeys = [
      'blind_exemption',
      'elderly_exemption', 
      'veterans_exemption',
      'surviving_spouse_exemption',
      'national_guard_exemption',
      'coop_housing_exemption'
    ];

    return React.createElement(
      'ul',
      { style: { marginTop: '1rem' } },
      exemptionKeys.map(key => 
        React.createElement(
          'li',
          { key },
          React.createElement(
            'a',
            {
              className: 'usa-link usa-link--external',
              rel: 'noreferrer',
              target: '_blank',
              href: languageService.getPersonalExemptionLink(key)
            },
            languageService.getPersonalExemptionLabel(key)
          )
        )
      )
    );
  }
}

