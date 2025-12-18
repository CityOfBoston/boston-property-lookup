import periodsYaml from '@utils/periods.yaml';

// Type definitions for structured content
export interface Link {
  text: string;
  url: string;
}

export interface Phone {
  text: string;
  url: string;
  label: string;
}

export interface StructuredDescription {
  text: string;
  links: Record<string, Link>;
  phone?: Phone;
  suffix?: string;
  status_text?: string;
  application_text?: {
    prefix: string;
    date: string;
    suffix: string;
  };
}

// Type definitions for the YAML structure
interface PeriodsLanguage {
  periods: {
    date_range?: {
      start_date?: string;
      end_date?: string;
    };
    timepoints: Record<string, string>;
    abatement_phases: Record<string, string>;
    exemption_phases: Record<string, string>;
    property_taxes: Record<string, string | StructuredDescription>;
    personal_exemption_links: Record<string, string>;
    abatements: Record<string, string>;
    overview: Record<string, string>;
    common: Record<string, string>;
  };
}

// Load the YAML data
const languageData: PeriodsLanguage = periodsYaml;

/**
 * Replace template variables in a string with provided values
 */
function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

/**
 * Get a language string with template variable replacement
 */
export function getLanguageString(
  path: string, 
  variables: Record<string, any> = {}
): string | StructuredDescription {
  const keys = path.split('.');
  let value: any = languageData;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`Language key not found: ${path}, stopped at key: ${key}`);
      return path; // Return the path as fallback
    }
  }
  
  if (typeof value === 'string') {
    const result = replaceTemplateVariables(value, variables);
    return result;
  }

  if (typeof value === 'object' && value !== null) {
    // Return the structured content as is
    return value as StructuredDescription;
  }
  
  console.warn(`Language value is not a string or structured content: ${path}, type:`, typeof value);
  return path;
}

/**
 * Get a language string without template replacement
 */
export function getLanguageStringRaw(path: string): string {
  const keys = path.split('.');
  let value: any = languageData;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`Language key not found: ${path}`);
      return path;
    }
  }
  
  return typeof value === 'string' ? value : path;
}

// Export commonly used language strings as functions
export const getTimepointLabel = (key: string) => getLanguageStringRaw(`periods.timepoints.${key}`);
export const getAbatementPhaseMessage = (phase: string, variables: Record<string, any>, parcelId?: string) => {
  const vars = { ...variables };
  if (parcelId) {
    vars.parcel_id = parcelId;
  }
  return getLanguageString(`periods.abatement_phases.${phase}`, vars);
};
export const getExemptionPhaseMessage = (phase: string, variables: Record<string, any>) => 
  getLanguageString(`periods.exemption_phases.${phase}`, variables);
export const getPropertyTaxMessage = (key: string, variables: Record<string, any> = {}) => 
  getLanguageString(`periods.property_taxes.${key}`, variables);
export const getPersonalExemptionLink = (key: string) => getLanguageStringRaw(`periods.personal_exemption_links.${key}`);
export const getPersonalExemptionLabel = (key: string) => getLanguageStringRaw(`periods.personal_exemption_links.${key}_label`);
export const getAbatementMessage = (key: string) => getLanguageStringRaw(`periods.abatements.${key}`);
export const getOverviewMessage = (key: string) => getLanguageStringRaw(`periods.overview.${key}`);
export const getCommonValue = (key: string) => getLanguageStringRaw(`periods.common.${key}`);

/**
 * Get the date range constraints for the TimeChanger
 * Returns null if no constraint is set
 */
export const getDateRangeConstraints = (): { startDate: Date | null; endDate: Date | null } => {
  const startDateStr = languageData.periods.date_range?.start_date;
  const endDateStr = languageData.periods.date_range?.end_date;
  
  const startDate = startDateStr ? parseYamlDate(startDateStr) : null;
  const endDate = endDateStr ? parseYamlDate(endDateStr) : null;
  
  return { startDate, endDate };
};

/**
 * Parse a date string from YAML (YYYY-MM-DD format)
 */
function parseYamlDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const [, year, month, day] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Validate the date is valid
  if (isNaN(date.getTime())) return null;
  
  return date;
} 