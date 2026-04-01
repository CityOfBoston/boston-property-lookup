/**
 * Exemption Phases Hook - OWNS exemption phase determination logic
 * 
 * Responsibilities:
 * - Determines current exemption phases for residential and personal exemptions
 * - Calculates whether exemptions are granted based on amounts
 * - Provides exemption approval flags
 * 
 * Does NOT:
 * - Create React elements or UI components
 * - Handle content resolution or language strings
 * - Format values for display
 * 
 * @module hooks/logic/useExemptionPhases
 */

import { useEffectiveNow } from '@hooks/useDateContext';
import { getExemptionPhase } from '@utils/periods';

export interface ExemptionPhaseData {
  residentialExemptionPhase: { phase: string; message: string | null };
  personalExemptionPhase: { phase: string; message: string | null };
  residentialExemptionApproved: boolean;
  personalExemptionApproved: boolean;
  residentialGranted: boolean;
  personalGranted: boolean;
  calendarYear: number;
}

export interface ExemptionAmounts {
  residentialExemptionAmount: number;
  residentialExemptionFlag: boolean;
  personalExemptionAmount: number;
  personalExemptionFlag: boolean;
}

/**
 * Hook to determine exemption phases and status
 */
export function useExemptionPhases(amounts: ExemptionAmounts): ExemptionPhaseData {
  const now = useEffectiveNow();
  const calendarYear = now.getFullYear();
  
  // Exemption status calculations
  const residentialExemptionApproved = amounts.residentialExemptionFlag;
  const personalExemptionApproved = amounts.personalExemptionFlag;
  
  const residentialGranted = amounts.residentialExemptionAmount && amounts.residentialExemptionAmount > 0;
  const personalGranted = amounts.personalExemptionAmount && amounts.personalExemptionAmount > 0;
  const residentialGrantedCount = residentialGranted ? 1 : 0;
  const personalGrantedCount = personalGranted ? 1 : 0;
  
  // Get exemption phases
  const residentialExemptionPhase = getExemptionPhase(
    now,
    calendarYear,
    { grantedCount: residentialGrantedCount, type: 'Residential' }
  );

  const personalExemptionPhase = getExemptionPhase(
    now,
    calendarYear,
    { grantedCount: personalGrantedCount, type: 'Personal' }
  );

  return {
    residentialExemptionPhase,
    personalExemptionPhase,
    residentialExemptionApproved,
    personalExemptionApproved,
    residentialGranted,
    personalGranted,
    calendarYear,
  };
}

