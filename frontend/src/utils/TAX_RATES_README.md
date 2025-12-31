# Fiscal Data Configuration

## Overview

The fiscal year configuration data for the application is now dynamically loaded based on the selected date. This system allows you to easily configure and update:
- **Tax rates** (residential and commercial) for different fiscal years
- **Owner disclaimer dates** that change quarterly (Q1 & Q3 of each fiscal year)

All configuration is centralized in a single file without requiring code modifications.

## Files

- **`fiscalData.yaml`** - Configuration file containing tax rates and owner disclaimer dates by fiscal year
- **`fiscalData.ts`** - Utility functions for reading tax rates and generating owner disclaimers
- **`usePropertyTaxesContent.ts`** - Hook that uses the tax rates in the UI
- **`useOverviewContent.ts`** - Hook that uses the owner disclaimer in the UI

## Configuration Structure

The `fiscalData.yaml` file contains all fiscal year data grouped by year:

```yaml
fiscalYears:
  2026:
    taxRates:
      residential: 12.40
      commercial: 26.96
    ownerDisclaimerDates:
      q1: "April 25, 2025"
      q3: "October 25, 2025"
```

Each fiscal year entry contains:
1. **taxRates** - Residential and commercial tax rates (per $1,000 of assessed value)
2. **ownerDisclaimerDates** - Disclaimer dates for Q1 (July-Dec) and Q3 (Jan-June)

## How to Add a New Fiscal Year

1. Open `frontend/src/utils/fiscalData.yaml`

2. Add a new entry under the `fiscalYears` section with all the data for that year:

```yaml
fiscalYears:
  2027:
    taxRates:
      residential: 12.00
      commercial: 26.50
    ownerDisclaimerDates:
      q1: "April 25, 2026"    # Used July 1, 2026 - December 31, 2026
      q3: "October 25, 2026"  # Used January 1, 2027 - June 30, 2027
```

3. Save the file. The changes will be automatically picked up when the application is rebuilt.

## How to Update an Existing Fiscal Year

To update tax rates or disclaimer dates for an existing fiscal year, simply edit the values under that year's entry:

```yaml
fiscalYears:
  2026:
    taxRates:
      residential: 12.50  # Updated rate
      commercial: 27.00   # Updated rate
    ownerDisclaimerDates:
      q1: "April 30, 2025"     # Updated date
      q3: "October 30, 2025"   # Updated date
```

## Example Configuration

Here's what a complete fiscal year configuration looks like:

```yaml
fiscalYears:
  2026:
    taxRates:
      residential: 12.40
      commercial: 26.96
    ownerDisclaimerDates:
      q1: "April 25, 2025"    # July 1, 2025 - December 31, 2025
      q3: "October 25, 2025"  # January 1, 2026 - June 30, 2026
  
  2025:
    taxRates:
      residential: 11.58
      commercial: 25.96
    ownerDisclaimerDates:
      q1: "April 25, 2024"
      q3: "October 25, 2024"
```

## Default Values and Future Date Handling

The system includes smart fallback logic for handling dates beyond the configured fiscal years:

### For Future Dates (e.g., FY2027 when only FY2026 is configured):
- **Tax Rates**: Uses the latest configured fiscal year's rates (e.g., FY2026 rates)
- **Owner Disclaimer**: Uses the latest Q3 disclaimer date (most recent update)

### For Past Dates or Missing Data:
Falls back to default values:

```yaml
defaults:
  taxRates:
    residential: 11.58
    commercial: 25.96
  ownerDisclaimerDate: "October 25, 2024"
```

### Example Behavior:

If the configuration only has data through FY2026:

**Future Dates (Smart Fallback):**
```
Date: July 1, 2026 (FY2027 Q1)
├─ Tax rates: Uses FY2026 rates (latest available)
└─ Disclaimer: "...after October 25, 2025" (FY2026 Q3, most recent)

Date: January 1, 2027 (FY2027 Q3)
├─ Tax rates: Uses FY2026 rates (latest available)
└─ Disclaimer: "...after October 25, 2025" (FY2026 Q3, most recent)

Date: July 1, 2030 (FY2031 Q1) - Far future
├─ Tax rates: Uses FY2026 rates (latest available)
└─ Disclaimer: "...after October 25, 2025" (FY2026 Q3, most recent)
```

**Configured Dates (Exact Match):**
```
Date: July 1, 2025 (FY2026 Q1)
├─ Tax rates: Uses FY2026 rates (exact match)
└─ Disclaimer: "...after April 25, 2025" (FY2026 Q1, exact match)

Date: January 1, 2026 (FY2026 Q3)
├─ Tax rates: Uses FY2026 rates (exact match)
└─ Disclaimer: "...after October 25, 2025" (FY2026 Q3, exact match)
```

**Past Dates (Default Fallback):**
```
Date: July 1, 2015 (FY2016 Q1) - Not configured
├─ Tax rates: Uses default rates
└─ Disclaimer: Uses default date
```

This prevents crashes when using the TimeChanger to select future dates and provides reasonable estimates based on the most recent data.

## How It Works

### Tax Rates
1. When a user selects a date in the frontend, the system calculates the corresponding fiscal year
2. The `getTaxRates(fiscalYear)` function looks up the tax rates for that fiscal year
3. If found, those rates are displayed; otherwise, the default rates are used
4. The rates are automatically formatted as "$X.XX per $1,000" for display

### Owner Disclaimer
1. When displaying property owner information, the system determines:
   - The fiscal year based on the selected date (July 1 - June 30)
   - The quarter (Q1 for July-December, Q3 for January-June)
2. The `getOwnerDisclaimer(date)` function retrieves the appropriate disclaimer date
3. The disclaimer text is dynamically generated: "Owner information may not reflect any changes submitted to the City of Boston's Assessing Department after [date]."

## Testing

To test the fiscal data configuration:

1. Enable the TimeChanger component by setting `VITE_ENABLE_TIME_CHANGER=true` in your `.env` file
2. Start the development server: `npm run dev`
3. Navigate to a property details page
4. Use the TimeChanger to select different dates (which correspond to different fiscal years and quarters)
5. Verify that:
   - The tax rates displayed in the "Taxes & Exemptions" section update based on the selected fiscal year
   - The owner disclaimer in the "Overview" section updates based on the selected date and quarter

## Notes

- Tax rates are specified as the amount per $1,000 of assessed value
- The fiscal year runs from July 1 to June 30 (e.g., FY2026 is July 1, 2025 - June 30, 2026)
- Owner disclaimer dates change twice per fiscal year (Q1 and Q3)
- Changes to `fiscalData.yaml` require rebuilding the application to take effect
- The system is designed to be backwards compatible - older fiscal years can remain in the configuration file

## Quarterly Schedule

**Q1 (July 1 - December 31)**: First half of fiscal year
- Uses the `q1` disclaimer date
- Example: For FY2026, July 1, 2025 - December 31, 2025

**Q3 (January 1 - June 30)**: Second half of fiscal year  
- Uses the `q3` disclaimer date
- Example: For FY2026, January 1, 2026 - June 30, 2026
