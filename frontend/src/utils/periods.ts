// Utility functions for property period calculations
import { getTimepointLabel, getAbatementPhaseMessage, getExemptionPhaseMessage } from './periodsLanguage';

/** Hour (24h) when monthly checkpoint deadlines end (local time). */
export const CHECKPOINT_DEADLINE_HOUR = 17;

/**
 * First weekday (Mon–Fri) on or after the given calendar day, at local 00:00:00.
 * Used for month-anchored checkpoints (e.g. April 1 → Wed stays Wed; Apr 1 Sat → Mon).
 */
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

/** First weekday of month `monthIndex` (0=Jan), at local midnight. */
export function getFirstNonWeekendDayOfMonth(year: number, monthIndex: number): Date {
  return getNextMonday(new Date(year, monthIndex, 1));
}

/** End of checkpoint window on that calendar day: 5:00 PM local time. */
export function getCheckpointDeadlineEnd(dayStart: Date): Date {
  const d = new Date(dayStart);
  d.setHours(CHECKPOINT_DEADLINE_HOUR, 0, 0, 0);
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
  getDate: (year: number) => getFirstNonWeekendDayOfMonth(year, 2),
};

export const EXEMPTION_APPLICATION_DEADLINE = {
  label: getTimepointLabel('exemption_application_deadline'),
  getDate: (year: number) => getNextMonday(new Date(year, 3, 1)),
};

export const NEW_FY_PRELIMINARY_TAX_PERIOD_BEGINS = {
  label: getTimepointLabel('new_fy_preliminary_tax_period_begins'),
  getDate: (year: number) => new Date(year, 6, 1),
};

export const BID_Q3_PAYMENT_DUE_DATE = {
  label: getTimepointLabel('bid_q3_payment_due'),
  getDate: (year: number) => getNextMonday(new Date(year, 1, 1)), // First non-weekend day in February
};

export const BID_Q4_PAYMENT_DUE_DATE = {
  label: getTimepointLabel('bid_q4_payment_due'),
  getDate: (year: number) => getNextMonday(new Date(year, 4, 1)), // First non-weekend day in May
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
      date: getCheckpointDeadlineEnd(ABATEMENT_APPLICATION_DEADLINE.getDate(year)),
    },
    {
      label: ABATEMENT_GRACE_PERIOD_DEADLINE.label,
      date: getCheckpointDeadlineEnd(ABATEMENT_GRACE_PERIOD_DEADLINE.getDate(year)),
    },
    {
      label: EXEMPTIONS_IN_PROGRESS.label,
      date: getCheckpointDeadlineEnd(EXEMPTIONS_IN_PROGRESS.getDate(year)),
    },
    {
      label: EXEMPTION_APPLICATION_DEADLINE.label,
      date: getCheckpointDeadlineEnd(EXEMPTION_APPLICATION_DEADLINE.getDate(year)),
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
  const abatementDeadlineDay = ABATEMENT_APPLICATION_DEADLINE.getDate(currentYear);
  const abatementDeadlineEnd = getCheckpointDeadlineEnd(abatementDeadlineDay);
  const july1 = NEW_FY_PRELIMINARY_TAX_PERIOD_BEGINS.getDate(currentYear);
  const nextJan1 = NEW_APPLICATION_PERIOD_BEGINS.getDate(currentYear + 1);
  // 1. Jan 1 (inclusive) to abatement deadline 5pm (inclusive) - Application period for NEXT fiscal year
  if (date >= jan1 && date <= abatementDeadlineEnd) {
    return {
      phase: 'open',
      message: getAbatementPhaseMessage('open', {
        next_year: year + 1,
        deadline_date: formatDateForDisplay(abatementDeadlineEnd, { withTime: true }),
        current_year: year,
        parcel_id: parcelId
      }, parcelId),
      deadline: abatementDeadlineDay
    };
  }
  
  // After deadline until July 1st
  if (date > abatementDeadlineEnd && date < july1) {
    return {
      phase: 'after_deadline',
      message: getAbatementPhaseMessage('after_deadline', {
        next_year: year + 1,
        current_year: year,
        deadline_date: formatDateForDisplay(abatementDeadlineDay)
      }),
      deadline: abatementDeadlineDay
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
      deadline: abatementDeadlineDay
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
  getDate: (year: number) => getNextMonday(new Date(year, 3, 1)), // April 1st, first weekday if weekend
};

/** Calendar day of exemption deadline (midnight); use {@link getExemptionApplicationDeadlineEnd} for the 5pm instant. */
export function getExemptionApplicationDeadlineEnd(calendarYear: number): Date {
  return getCheckpointDeadlineEnd(EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(calendarYear));
}

export function getAbatementApplicationDeadlineEnd(calendarYear: number): Date {
  return getCheckpointDeadlineEnd(ABATEMENT_APPLICATION_DEADLINE.getDate(calendarYear));
}

/** Whether residential/personal PDF exemption forms may be generated (open application window). */
export function isExemptionPdfFormAvailable(now: Date, calendarYear: number): boolean {
  return getExemptionPhase(now, calendarYear, { grantedCount: 0, type: 'Residential' }).phase === 'open';
}

/** Whether the abatement PDF form may be generated. */
export function isAbatementPdfFormAvailable(now: Date, abatementYear: number): boolean {
  return getAbatementPhase(now, abatementYear).phase === 'open';
}

export function getExemptionPhase(date: Date, year: number, opts: { grantedCount: number, type: 'Residential' | 'Personal' }) {
  const jan1 = NEW_APPLICATION_PERIOD_BEGINS.getDate(year);
  const deadlineDay = EXEMPTION_APPLICATION_DEADLINE_DATE.getDate(year);
  const deadlineEnd = getExemptionApplicationDeadlineEnd(year);
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
  
  // Jan 1 through deadline day 5pm (inclusive) - Application period for NEXT fiscal year
  if (date >= jan1 && date <= deadlineEnd) {
    return {
      phase: 'open',
      message: getExemptionPhaseMessage('open', {
        exemption_type: type,
        next_year: year + 1,
        deadline_date: formatDateForDisplay(deadlineEnd, { withTime: true }),
        current_year: year
      }),
      deadline: deadlineDay
    };
  }
  
  // After deadline until July 1st
  if (date > deadlineEnd && date < july1) {
    return {
      phase: 'after_deadline',
      message: getExemptionPhaseMessage('after_deadline', {
        exemption_type: type,
        next_year: year + 1,
        deadline_date: formatDateForDisplay(deadlineDay),
        next_fy: year + 2,
        next_jan1_date: formatDateForDisplay(nextJan1),
        current_year: year
      }),
      deadline: deadlineDay
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
      deadline: deadlineDay
    };
  }
  
  // Return empty message if no phase matches
  return { 
    phase: 'before_jan1', 
    message: ''
  };
} 