// Utility functions for property period calculations
import { getTimepointLabel, getAbatementPhaseMessage, getExemptionPhaseMessage } from './periodsLanguage';

export function getNextMonday(date: Date): Date {
  const d = new Date(date); // avoid mutating input
  const day = d.getDay();
  if (day === 6) {
    d.setDate(d.getDate() + 2);
  } else if (day === 0) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export const NEW_APPLICATION_PERIOD_BEGINS = {
  label: getTimepointLabel('new_application_period_begins'),
  getDate: (year: number) => new Date(year, 0, 1),
};

export const ABATEMENT_APPLICATION_DEADLINE = {
  label: getTimepointLabel('abatement_application_deadline'),
  getDate: (year: number) => getNextMonday(new Date(year, 1, 1)),
};

export const EXEMPTIONS_IN_PROGRESS = {
  label: getTimepointLabel('exemptions_in_progress'),
  getDate: (year: number) => new Date(year, 2, 1),
};

export const EXEMPTION_APPLICATION_DEADLINE = {
  label: getTimepointLabel('exemption_application_deadline'),
  getDate: (year: number) => getNextMonday(new Date(year, 3, 1)),
};

export const NEW_FY_PRELIMINARY_TAX_PERIOD_BEGINS = {
  label: getTimepointLabel('new_fy_preliminary_tax_period_begins'),
  getDate: (year: number) => new Date(year, 6, 1),
};

export const ABATEMENT_GRACE_PERIOD_DEADLINE = {
  label: getTimepointLabel('abatement_grace_period_deadline'),
  getDate: (year: number) => {
    const abatementDeadline = ABATEMENT_APPLICATION_DEADLINE.getDate(year);
    const graceDate = new Date(abatementDeadline);
    graceDate.setDate(graceDate.getDate() + 28);
    return graceDate;
  },
};

export function getAllTimepoints(year: number) {
  return [
    {
      label: NEW_APPLICATION_PERIOD_BEGINS.label,
      date: NEW_APPLICATION_PERIOD_BEGINS.getDate(year),
    },
    {
      label: ABATEMENT_APPLICATION_DEADLINE.label,
      date: ABATEMENT_APPLICATION_DEADLINE.getDate(year),
    },
    {
      label: ABATEMENT_GRACE_PERIOD_DEADLINE.label,
      date: ABATEMENT_GRACE_PERIOD_DEADLINE.getDate(year),
    },
    {
      label: EXEMPTIONS_IN_PROGRESS.label,
      date: EXEMPTIONS_IN_PROGRESS.getDate(year),
    },
    {
      label: EXEMPTION_APPLICATION_DEADLINE.label,
      date: EXEMPTION_APPLICATION_DEADLINE.getDate(year),
    },
    {
      label: NEW_FY_PRELIMINARY_TAX_PERIOD_BEGINS.label,
      date: NEW_FY_PRELIMINARY_TAX_PERIOD_BEGINS.getDate(year),
    },
  ];
}

export function getCurrentPeriod(date: Date, timepoints: { label: string; date: Date }[]) {
  let prev = timepoints[0];
  for (let i = 1; i < timepoints.length; i++) {
    if (date < timepoints[i].date) {
      return { from: prev, to: timepoints[i] };
    }
    prev = timepoints[i];
  }
  return { from: timepoints[timepoints.length - 1], to: null };
}

export function formatDateForDisplay(date: Date, opts?: { withTime?: boolean }) {
  // Example: Monday, February 3, 2025 or Monday, February 3, 2025 at 5:00:00 PM
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(opts?.withTime ? { hour: 'numeric', minute: '2-digit', second: '2-digit' } : {})
  };
  return date.toLocaleString('en-US', options);
}

// Utility to get the fiscal year for a given date
export function getFiscalYear(date: Date): number {
  // Fiscal year starts July 1st of previous year, ends June 30th of current year
  // e.g., July 1, 2025 - June 30, 2026 is FY2026
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0=Jan, 6=July
  return month >= 6 ? year + 1 : year;
}

export function getAbatementPhase(date: Date, year: number, parcelId?: string) {
  // Get current year from date for proper phase calculation
  const currentYear = date.getFullYear();
  
  // Get all relevant timepoints
  const jan1 = NEW_APPLICATION_PERIOD_BEGINS.getDate(currentYear);
  const abatementDeadline = ABATEMENT_APPLICATION_DEADLINE.getDate(currentYear);
  const july1 = NEW_FY_PRELIMINARY_TAX_PERIOD_BEGINS.getDate(currentYear);
  const nextJan1 = NEW_APPLICATION_PERIOD_BEGINS.getDate(currentYear + 1);
  // 1. Jan 1 (inclusive) to abatement deadline (inclusive) - Application period for NEXT fiscal year
  if (date >= jan1 && date <= abatementDeadline) {
    return {
      phase: 'open',
      message: getAbatementPhaseMessage('open', {
        next_year: year + 1,
        deadline_date: formatDateForDisplay(abatementDeadline, { withTime: true }),
        current_year: year,
        parcel_id: parcelId
      }, parcelId),
      deadline: abatementDeadline
    };
  }
  
  // After deadline until July 1st
  if (date > abatementDeadline && date < july1) {
    return {
      phase: 'after_deadline',
      message: getAbatementPhaseMessage('after_deadline', {
        next_year: year + 1,
        current_year: year,
        deadline_date: formatDateForDisplay(abatementDeadline)
      }),
      deadline: abatementDeadline
    };
  }
  
  // 5. After July 1st and before next Jan 1: preliminary period - exemption flags show application status for current FY
  if (date >= july1 && date < nextJan1) {
    return {
      phase: 'preliminary',
      message: getAbatementPhaseMessage('preliminary', {
        current_fy: currentYear + 1,
        current_year: currentYear + 1,
        next_fy: currentYear + 2,
        next_jan1_date: formatDateForDisplay(nextJan1)
      }),
      deadline: abatementDeadline
    };
  }
  
  // Any other time (after nextJan1 or before jan1): we're in preliminary phase
  return {
    phase: 'preliminary',
    message: getAbatementPhaseMessage('preliminary', {})
  };
}

export const EXEMPTION_APPLICATION_DEADLINE_DATE = {
  label: 'Exemption Application Deadline',
  getDate: (year: number) => getNextMonday(new Date(year, 3, 1)), // April 1st, next Monday if weekend
};

export function getExemptionPhase(date: Date, year: number, opts: { grantedCount: number, type: 'Residential' | 'Personal' }) {
  const jan1 = NEW_APPLICATION_PERIOD_BEGINS.getDate(year);
  const deadline = EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(year);
  const july1 = NEW_FY_PRELIMINARY_TAX_PERIOD_BEGINS.getDate(year);
  const nextJan1 = NEW_APPLICATION_PERIOD_BEGINS.getDate(year + 1);
  const { type } = opts;

  
  // Before Jan 1
  if (date < jan1) {
    return {
      phase: 'before_jan1',
      message: getExemptionPhaseMessage('before_jan1', {
        exemption_type: type,
        next_year: year + 1,
        jan1_date: formatDateForDisplay(jan1),
        current_year: year
      })
    };
  }
  
  // Jan 1 to deadline (inclusive) - Application period for NEXT fiscal year
  if (date >= jan1 && date <= deadline) {
    return {
      phase: 'open',
      message: getExemptionPhaseMessage('open', {
        exemption_type: type,
        next_year: year + 1,
        deadline_date: formatDateForDisplay(deadline, { withTime: true }),
        current_year: year
      }),
      deadline
    };
  }
  
  // After deadline until July 1st
  if (date >= deadline && date < july1) {
    return {
      phase: 'after_deadline',
      message: getExemptionPhaseMessage('after_deadline', {
        exemption_type: type,
        next_year: year + 1,
        deadline_date: formatDateForDisplay(deadline),
        next_fy: year + 2,
        next_jan1_date: formatDateForDisplay(nextJan1),
        current_year: year
      }),
      deadline
    };
  }
  
  // After July 1st and before next Jan 1: preliminary period - exemption flags show application status for current FY
  if (date >= july1 && date < nextJan1) {
    return {
      phase: 'preliminary',
      message: getExemptionPhaseMessage('preliminary', {
        current_fy: year + 1,
        exemption_type_lower: type.toLowerCase(),
        next_fy: year + 2,
        next_jan1_date: formatDateForDisplay(nextJan1)
      }),
      deadline
    };
  }
  
  // Return empty message if no phase matches
  return { 
    phase: 'before_jan1', 
    message: ''
  };
} 