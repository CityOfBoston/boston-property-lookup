# Tax Rates Configuration

## Overview

The tax rates for residential and commercial properties are now dynamically loaded based on the selected fiscal year. This system allows you to easily configure and update tax rates for different fiscal years without modifying the application code.

## Files

- **`taxRates.yaml`** - Configuration file containing tax rates for each fiscal year
- **`taxRates.ts`** - Utility functions for reading and formatting tax rates
- **`usePropertyTaxesContent.ts`** - Hook that uses the tax rates in the UI

## How to Add Tax Rates for a New Fiscal Year

1. Open `frontend/src/utils/taxRates.yaml`

2. Add a new entry under the `taxRates` section with the fiscal year as the key:

```yaml
taxRates:
  2027:
    residential: 12.00
    commercial: 26.50
```

3. Save the file. The changes will be automatically picked up when the application is rebuilt.

## Example Configuration

```yaml
taxRates:
  2026:
    residential: 11.58
    commercial: 25.96
  
  2025:
    residential: 10.48
    commercial: 24.68
```

## Default Rates

If a fiscal year is not found in the `taxRates` section, the system will fall back to the `defaultRates` defined at the bottom of the `taxRates.yaml` file:

```yaml
defaultRates:
  residential: 11.58
  commercial: 25.96
```

You can update these default rates as needed.

## How It Works

1. When a user selects a date in the frontend, the system calculates the corresponding fiscal year
2. The `getTaxRates(fiscalYear)` function looks up the tax rates for that fiscal year
3. If found, those rates are displayed; otherwise, the default rates are used
4. The rates are automatically formatted as "$X.XX per $1,000" for display

## Testing

To test the tax rates:

1. Enable the TimeChanger component by setting `VITE_ENABLE_TIME_CHANGER=true` in your `.env` file
2. Start the development server: `npm run dev`
3. Navigate to a property details page
4. Use the TimeChanger to select different dates (which correspond to different fiscal years)
5. Verify that the tax rates displayed in the "Taxes & Exemptions" section update based on the selected date

## Notes

- Tax rates are specified as the amount per $1,000 of assessed value
- The fiscal year runs from July 1 to June 30 (e.g., FY2026 is July 1, 2025 - June 30, 2026)
- Changes to `taxRates.yaml` require rebuilding the application to take effect
- The system is designed to be backwards compatible - older fiscal years can remain in the configuration file
