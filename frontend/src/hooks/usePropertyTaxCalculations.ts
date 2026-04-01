import { useEffectiveNow } from '@hooks/useDateContext';
import type { PropertyTaxesSectionData } from '@src/types';
import { getExemptionPhase, getFiscalYear } from '@utils/periods';

export function usePropertyTaxCalculations(sectionData: PropertyTaxesSectionData) {
  const now = useEffectiveNow();
  const fiscalYear = getFiscalYear(now);
  
  // Determine if we're in the preliminary period (July-December)
  const nowMonth = now.getMonth();
  const isPrelimPeriod = nowMonth >= 6 && nowMonth < 12;
  const displayFY = fiscalYear;
  
  // Exemption status calculations
  const residentialExemptionApproved = sectionData.residentialExemptionFlag;
  const personalExemptionApproved = sectionData.personalExemptionFlag;
  
  const residentialGranted = sectionData.residentialExemptionAmount && sectionData.residentialExemptionAmount > 0;
  const personalGranted = sectionData.personalExemptionAmount && sectionData.personalExemptionAmount > 0;
  const residentialGrantedCount = residentialGranted ? 1 : 0;
  const personalGrantedCount = personalGranted ? 1 : 0;

  const calendarYear = now.getFullYear();
  
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


  // Format helper
  const formatTaxValue = (val: any) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed === 0) return 'N/A';
    if (typeof val === 'number') return `$${val.toLocaleString()}`;
    if (typeof val === 'string' && /^\$?\d/.test(val)) return val;
    return 'N/A';
  };

  return {
    fiscalYear,
    displayFY,
    isPrelimPeriod,
    calendarYear,
    residentialExemptionApproved,
    personalExemptionApproved,
    residentialGranted,
    personalGranted,
    residentialExemptionPhase,
    personalExemptionPhase,
    formatTaxValue,
    residentialExemptionMaxAmount: sectionData.residentialExemptionAmount,
  };
}
