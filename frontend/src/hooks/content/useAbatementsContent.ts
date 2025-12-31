/**
 * Abatements Content Hook - OWNS abatements section content coordination
 * 
 * Responsibilities:
 * - Coordinates abatements section display content
 * - Determines abatement phase based on current date
 * - Provides content from YAML
 * 
 * Does NOT:
 * - Create React elements
 * - Perform complex calculations
 * - Handle state management
 * 
 * @module hooks/content/useAbatementsContent
 */

import { contentService } from '@services/content/ContentService';
import { useDateContext } from '@hooks/useDateContext';
import { getAbatementPhase } from '@utils/periods';

export interface AbatementsContent {
  content: any;
  pageContent: any;
  abatementPhase: { message: string | null };
}

/**
 * Hook for abatements section content
 */
export function useAbatementsContent(parcelId: string): AbatementsContent {
  const { date } = useDateContext();
  const content = contentService.getComponentContent('AbatementsSection');
  const pageContent = contentService.getComponentContent('propertyDetails', 'pages.propertyDetails');
  
  const now = date;
  const calendarYear = now.getFullYear();
  const nowMonth = now.getMonth();
  // For abatements, we need to use the calendar year when applications are due
  // For July 2026 (FY2027), abatements for FY2027 were due in February 2026 (calendar year 2026)
  const abatementYear = nowMonth >= 6 ? calendarYear : calendarYear - 1;
  const abatementPhase = getAbatementPhase(now, abatementYear, parcelId);
  
  return {
    content,
    pageContent,
    abatementPhase,
  };
}

