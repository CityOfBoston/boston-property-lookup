import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface DateContextType {
  date: Date;
  setDate: (date: Date) => void;
  resetDate: () => void;
  formatDate: (date: Date) => string;
  parseDate: (dateStr: string) => Date;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDateState] = useState<Date>(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [year, month, day] = dateParam.split('-').map(Number);
      if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const parsedDate = new Date(year, month - 1, day);
        if (isValidDate(parsedDate)) {
          // Only use the date part (no time)
          return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
        }
      }
    }
    // Fallback to today
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

  const setDate = useCallback((newDate: Date) => {
    if (isValidDate(newDate)) {
      // Only use the date part (no time)
      const dateOnly = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
      
      // Check if this date change crosses the July 1st boundary (fiscal year change)
      const currentMonth = date.getMonth(); // 0-indexed: 0=Jan, 6=July
      const newMonth = dateOnly.getMonth();
      const currentYear = date.getFullYear();
      const newYear = dateOnly.getFullYear();
      
      // Check if we're crossing July 1st boundary (before July 1st to after, or vice versa)
      const crossesJuly1st = 
        (currentMonth < 6 && newMonth >= 6) || // Before July to July or later
        (currentMonth >= 6 && newMonth < 6) || // July or later to before July
        (currentYear !== newYear); // Different years always cross the boundary
      
      setDateState(dateOnly);
      
      // Update URL
      setSearchParams(prev => {
        prev.set('date', formatDate(dateOnly));
        return prev;
      }, { replace: true });
      
      // If crossing July 1st boundary, reload the page
      if (crossesJuly1st) {
        window.location.reload();
      }
    }
  }, [setSearchParams, date]);

  const resetDate = useCallback(() => {
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setDateState(todayOnly);
    
    // Remove date from URL
    setSearchParams(prev => {
      prev.delete('date');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  // Sync with URL changes
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [year, month, day] = dateParam.split('-').map(Number);
      if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const parsedDate = new Date(year, month - 1, day);
        if (isValidDate(parsedDate)) {
          const dateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
          if (dateOnly.getTime() !== date.getTime()) {
            setDateState(dateOnly);
          }
        }
      }
    } else if (dateParam === null) {
      // Date was removed from URL, reset to today
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (todayOnly.getTime() !== date.getTime()) {
        setDateState(todayOnly);
      }
    }
  }, [searchParams, date]);

  const value: DateContextType = {
    date,
    setDate,
    resetDate,
    formatDate,
    parseDate,
  };

  return (
    <DateContext.Provider value={value}>
      {children}
    </DateContext.Provider>
  );
}

export function useDateContext(): DateContextType {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDateContext must be used within a DateProvider');
  }
  return context;
}

/**
 * Combines the test/simulated calendar day from context with the user's real clock time
 * so same-day deadlines (e.g. 5:00 PM on checkpoint days) resolve correctly.
 */
export function combineCalendarDateWithRealTime(calendarDate: Date): Date {
  const real = new Date();
  const d = new Date(calendarDate);
  d.setHours(real.getHours(), real.getMinutes(), real.getSeconds(), real.getMilliseconds());
  return d;
}

/**
 * Like `date` from {@link useDateContext}, but with real hours/minutes/seconds for deadline logic.
 * Re-renders periodically so phases update when a 5 PM boundary is crossed.
 */
export function useEffectiveNow(): Date {
  const { date } = useDateContext();
  const [effective, setEffective] = useState(() => combineCalendarDateWithRealTime(date));

  useEffect(() => {
    setEffective(combineCalendarDateWithRealTime(date));
    const t = setInterval(() => {
      setEffective(combineCalendarDateWithRealTime(date));
    }, 30_000);
    return () => clearInterval(t);
  }, [date]);

  return effective;
} 