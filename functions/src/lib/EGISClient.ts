/**
 * Helper function to determine fiscal year and quarter based on a date.
 * If the date is before 7/1 of the year of the date, return the year of the date and quarter "3".
 * Otherwise, return the next year to the year of the date and quarter "1".
 *
 * @param date The date to determine fiscal year and quarter for
 * @return Object containing year and quarter
 */
export function getFiscalYearAndQuarter(date: Date): { year: number; quarter: string } {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0=Jan, 6=July

  // If date is before July 1st (month < 6), return current year with quarter 3
  if (month < 6) {
    return {year, quarter: "3"};
  }

  // If date is on or after July 1st (month >= 6), return next year with quarter 1
  return {year: year + 1, quarter: "1"};
}

/**
 * This is a client for making requests to the EGIS API.
 *
 * The EGIS API is a RESTful API that allows you to get property details,
 * tax and parcel information for properties in Boston. It also contains
 * geospatial data for each property that will be
 */

import {PropertyDetailsData, PropertyDetails} from "../types";
const baseUrl = "https://gisportal.boston.gov/arcgis/rest/services/Assessing/properties_boston_gov/MapServer";
const geomertricDataLayerUrl = `${baseUrl}/0`;

/**
 * TEMPORAL FIELD PATTERNS BY LAYER:
 * 
 * Layers with fiscal_year + quarter:
 * - Layer 6: Residential Property Attributes (fiscal_year, quarter)
 * - Layer 7: Current Owners (fiscal_year, quarter)
 * - Layer 9: Condo Attributes (fiscal_year, quarter)
 * - Layer 10: Outbuildings (fiscal_year, quarter)
 * 
 * Layers with fiscal_year only (NO quarter):
 * - Layer 5: Value History (fiscal_year)
 * - Layer 13: Real Estate (fiscal_year)
 * 
 * Layers with different year field name (NO quarter):
 * - Layer 12: Taxes (bill_year)
 * 
 * Layers with NO temporal fields:
 * - Layer 0: Geometry (static/current data)
 * - Layer 11: Sales (uses dates: latest_sales_date)
 */

/**
 * EGIS Schema Layer 5: Value History
 * parcel_id,fiscal_year,assessed_value,land_use
 */
const valueHistoryDataLayerUrl = `${baseUrl}/5`;
/**
 * EGIS Schema Layer 6: Residential Property Attributes
 * parcel_id, fiscal_year, quarter, line_number, composite_land_use, 
 * building_style, bedrooms, full_bath, half_bath, other_fixtures, 
 * bath_style_1, bath_style_2, bath_style_3, kitchens, kitchen_style_1, 
 * kitchen_style_2, kitchen_style_3, fireplaces, ac_type, heat_type,
 * interior_condition, interior_finish, view_, grade, num_of_parking_spots,
 * year_built, story_height, roof_cover, roof_structure, exterior_condition,
 * exterior_finish, foundation
 */
const residentialPropertyAttributesDataLayerUrl = `${baseUrl}/6`;
/**
 * EGIS Schema Layer 7: Current Owners
 * parcel_id,fiscal_year,quarter,parcel_id,seqno,owner_name
 */
const currentOwnersDataLayerUrl = `${baseUrl}/7`;
/**
 * EGIS Schema Layer 9: Condo Attributes
 * parcel_id, fiscal_year, quarter, composite_land_use, building_style, 
 * orientation, corner_unit, floor, rooms, bedrooms, bedroom_type, full_bath, 
 * half_bath, other_fixtures, bath_style_1, bath_style_2, bath_style_3, 
 * kitchens, kitchen_type, kitchen_style_1, kitchen_style_2, kitchen_style_3, 
 * fireplaces, penthouse_unit, ac_type, heat_type, interior_condition, 
 * interior_finish, view_, grade, num_of_parking_spots, parking_ownership, 
 * parking_type, tandem_parking, complex, year_built, story_height, roof_cover, 
 * roof_structure, exterior_condition, exterior_finish, foundation
 */
const condoAttributesDataLayerUrl = `${baseUrl}/9`;
/**
 * EGIS Schema Layer 10: Outbuildings
 * parcel_id,fiscal_year,quarter,tot_units,quality,condition,code
 */
const outbuildingsDataLayerUrl = `${baseUrl}/10`;
/**
 * EGIS Schema Layer 11: Sales
 * parcel_id,latest_sales_date,latest_sales_price,latest_bkgpcert
 */
const salesDataLayerUrl = `${baseUrl}/11`;
/**
 * EGIS Schema Layer 12: Taxes
 * parcel_id,bill_year,bill_number,total_assessed_value,gross_re_tax,resex_amt,
 * resex_value,net_re_tax,personal_ex_type_1,personal_ex_amt_1,
 * personal_ex_type_2,personal_ex_amt_2,cpa_tax,personal_exemption_flag,
 * persexempt_total,net_tax,total_billed_amt
 */
const taxesDataLayerUrl = `${baseUrl}/12`;
/**
 * EGIS Schema Layer 13: Real Estate
 * parcel_id,fiscal_year,quarter,street_number,street_number_suffix,street_name,
 * apt_unit,city,location_zip_code,land_use,residential_exemption_flag,
 * property_type,property_class_description,property_code_description
 */
const realEstateDataLayerUrl = `${baseUrl}/13`;

// Type definitions for ArcGIS Feature and response data
interface ArcGISFeature {
    attributes: Record<string, any>;
    geometry?: any;
}

// Response type for EGIS API queries, transfer limit as buffer
type EGISQueryResponse = {
    features: ArcGISFeature[];
    exceededTransferLimit?: boolean;
}

/**
 * Abstract function that handles pagination for the EGIS API to ensure all data is retreived when using queries.
 *
 * @param url The proper layer URL to make the request to.
 * @param query The query to make the request with.
 * @return The data from the request.
 */
const fetchEGISData = async (url: string, query: string): Promise<ArcGISFeature[]> => {
  console.log(`[EGISClient] Starting fetchEGISData with URL: ${url}`);
  console.log(`[EGISClient] Query: ${query}`);

  const allFeatures: ArcGISFeature[] = [];
  let resultOffset = 0;
  const recordCount = 1000; // Fixed chunk size to avoid memory issues
  let requestCount = 0;
  const maxRetries = 3;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      requestCount++;
      const paginatedQuery = `${query}&resultOffset=${resultOffset}&resultRecordCount=${recordCount}`;
      const fullUrl = `${url}/query${paginatedQuery}`;

      console.log(`[EGISClient] Making request #${requestCount} with offset ${resultOffset}`);

      let retryCount = 0;
      let response;
      let data;

      // Retry logic for failed requests
      while (retryCount < maxRetries) {
        try {
          response = await fetch(fullUrl);
          if (response.ok) {
            data = await response.json() as EGISQueryResponse;
            break;
          }
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        } catch (error) {
          console.error(`[EGISClient] Request attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!response?.ok || !data) {
        throw new Error(`Failed to fetch data after ${maxRetries} retries`);
      }

      const features = data.features || [];
      if (features.length === 0) {
        break; // No more data to fetch
      }

      // Process features in smaller batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < features.length; i += batchSize) {
        const batch = features.slice(i, i + batchSize);
        allFeatures.push(...batch);
      }

      console.log(`[EGISClient] Processed ${features.length} features, total: ${allFeatures.length}`);

      if (!data.exceededTransferLimit) {
        break; // No more pages to fetch
      }

      resultOffset += features.length;
    }

    console.log(`[EGISClient] Completed. Total features: ${allFeatures.length}, Requests: ${requestCount}`);
    return allFeatures;
  } catch (error) {
    console.error("[EGISClient] Error in fetchEGISData:", error);
    throw error;
  }
};

/**
 * Helper function to filter results for the highest fiscal year and quarter.
 * This is used when no specific date is provided and we want the most recent data.
 * 
 * Supports different field name patterns:
 * - fiscal_year + quarter (Layers 6, 7, 9, 10, 13)
 * - fiscal_year only (Layer 5)
 * - bill_year (Layer 12)
 *
 * @param features Array of ArcGIS features to filter
 * @param options Optional configuration for field names
 * @return Filtered array with only the highest fiscal year and quarter entries
 */
function filterForHighestFiscalYearAndQuarter(
  features: ArcGISFeature[], 
  options?: { yearField?: string; hasQuarter?: boolean }
): ArcGISFeature[] {
  if (!features?.length) return [];

  const yearField = options?.yearField || 'fiscal_year';
  const hasQuarter = options?.hasQuarter !== false; // Default to true

  try {
    // Process in batches to avoid memory issues
    const batchSize = 1000;
    let maxYear = 0;
    let maxQuarter = 0;

    // Find max year and quarter in batches
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, Math.min(i + batchSize, features.length));
      batch.forEach((feature) => {
        const year = feature.attributes?.[yearField] || 0;
        const quarter = hasQuarter ? (parseInt(feature.attributes?.quarter) || 0) : 0;
        if (year > maxYear || (year === maxYear && quarter > maxQuarter)) {
          maxYear = year;
          maxQuarter = quarter;
        }
      });
    }

    if (hasQuarter) {
      console.log(`[EGISClient] Found highest ${yearField}: ${maxYear}, quarter: ${maxQuarter}`);
    } else {
      console.log(`[EGISClient] Found highest ${yearField}: ${maxYear}`);
    }

    // Filter features in batches
    const result: ArcGISFeature[] = [];
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, Math.min(i + batchSize, features.length));
      const filtered = batch.filter((f) => {
        const yearMatch = f.attributes?.[yearField] === maxYear;
        if (!hasQuarter) {
          return yearMatch;
        }
        return yearMatch && parseInt(f.attributes?.quarter) === maxQuarter;
      });
      result.push(...filtered);
    }

    if (hasQuarter) {
      console.log(`[EGISClient] Filtered ${features.length} features to ${result.length} features (${yearField}=${maxYear} Q${maxQuarter})`);
    } else {
      console.log(`[EGISClient] Filtered ${features.length} features to ${result.length} features (${yearField}=${maxYear})`);
    }
    return result;
  } catch (error) {
    console.error("[EGISClient] Error in filterForHighestFiscalYearAndQuarter:", error);
    return features; // Return original array in case of error
  }
}

/**
 * Helper function to prioritize values from multiple data layers.
 * Priority order: residential attributes > condo attributes
 * Returns the first value that is not null, undefined, or an empty string (but allows 0 for numbers).
 *
 * @param residentialValue Value from residential attributes layer (highest priority)
 * @param condoValue Value from condo attributes layer (lower priority)
 * @return The prioritized value
 */
function prioritizeValue<T>(residentialValue: T | null | undefined, condoValue: T | null | undefined): T | null | undefined {
  const isValid = (v: any) => v !== null && v !== undefined && (typeof v === "number" ? true : v !== "");
  if (isValid(residentialValue)) return residentialValue;
  if (isValid(condoValue)) return condoValue;
  return undefined;
}

/**
 * Helper to construct full address from fields
 */
function constructFullAddress(attrs: Record<string, any>): string {
  // Get and trim all parts, and apply proper case to each
  const stNum = attrs.street_number ? String(attrs.street_number).trim() : "";
  const stNumSuffix = attrs.street_number_suffix ? String(attrs.street_number_suffix).trim() : "";
  const stName = attrs.street_name ? toProperCase(String(attrs.street_name).trim()) : "";
  const unitNum = attrs.apt_unit ? String(attrs.apt_unit).trim() : "";
  const city = attrs.city ? (String(attrs.city).trim() === "=" ? "Boston" : toProperCase(String(attrs.city).trim())) : "";
  const zip = attrs.location_zip_code ? String(attrs.location_zip_code).trim() : "";

  // Compose street number (may be a range)
  let fullStreetNumber = stNum;
  if (stNumSuffix && stNumSuffix !== stNum) {
    fullStreetNumber = `${stNum}-${stNumSuffix}`;
  }

  // Compose street address
  let address = fullStreetNumber;
  if (stName) address += (address ? " " : "") + stName;
  if (unitNum) address += ` #${unitNum}`;
  // Always add comma before city if city is present
  if (city) address += `, ${city}`;
  if (zip) address += `, ${zip}`;

  return address || "Address not available";
}

// Basic proper case function for text
function toProperCase(str: string | undefined | null | any): string {
  // Handle non-string values
  if (str === null || str === undefined) return "";
  
  // Convert to string if not already
  const strValue = typeof str === 'string' ? str : String(str);
  
  if (!strValue || strValue.trim() === "") return "";

  // If all uppercase and short (likely an abbreviation), keep as is
  if (/^[A-Z0-9 .,'&-]+$/.test(strValue) && strValue.length <= 6) return strValue;

  // Basic proper case
  return strValue.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Convert string to camel case (capitalize first letter of each word)
function toCamelCase(str: string | undefined | null | any): string {
  // Handle non-string values
  if (str === null || str === undefined) return "";
  
  // Convert to string if not already
  const strValue = typeof str === 'string' ? str : String(str);
  
  if (!strValue || strValue.trim() === "") return "";

  // If all uppercase and short (likely an abbreviation), keep as is
  if (/^[A-Z0-9 .,'&-]+$/.test(strValue) && strValue.length <= 6) return strValue;

  // First split only by spaces to handle multi-word names
  return strValue.toLowerCase()
    .split(" ")
    .map((part) =>
      // For each part (which might contain hyphens or apostrophes),
      // split by word boundaries but preserve special characters
      part.replace(/\b\w+\b/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))
    )
    .join(" ");
}

/**
 * Helper to parse a string like 'XXX - XXXXXX XXX XXXX' and return the portion after the last ' - '.
 * If the format is not matched, returns the original string trimmed. Handles null/undefined/empty gracefully.
 * Also applies proper case formatting to the result.
 * @param value The input string
 * @return The portion after the last ' - ', or the original string trimmed, with proper case applied
 */
export function parseAfterDash(value: string | null | undefined | any): string {
  if (value === null || value === undefined) return "";
  
  // Convert to string if not already
  const strValue = typeof value === 'string' ? value : String(value);
  
  if (!strValue || strValue.trim() === "") return "";
  
  const idx = strValue.indexOf(" - ");
  const result = idx !== -1 ? strValue.slice(idx + 3).trim() : strValue.trim();
  return toProperCase(result);
}

/**
 * Helper function to get all parcelId and full address pairings for all properties in Boston.
 * Uses Layer 0 (geometric data layer) which contains address fields.
 * Results can be found in the "features" array with each feature having an "attributes" object.
 *
 * @return A list of objects with parcelId and full address.
 */
export const fetchAllParcelIdAddressPairingsHelper = async (): Promise<{parcelId: string, fullAddress: string}[]> => {
  console.log("[EGISClient] Starting fetchAllParcelIdAddressPairings");

  const query = "?where=1=1&outFields=*&returnGeometry=false&f=json";
  console.log(`[EGISClient] Parcel ID address pairings query: ${query}`);
  console.log(`[EGISClient] Full parcel ID address pairings URL: ${geomertricDataLayerUrl}/query${query}`);

  const features = await fetchEGISData(geomertricDataLayerUrl, query);

  console.log(`[EGISClient] Fetched ${features.length} parcel ID address pairings`);

  const result = features.map((feature: ArcGISFeature) => {
    return {
      parcelId: feature.attributes.parcel_id,
      fullAddress: constructFullAddress(feature.attributes),
    };
  });

  console.log(`[EGISClient] fetchAllParcelIdAddressPairings completed. Returning ${result.length} pairings`);
  return result;
};

/**
 * Helper function to get property summaries - parcelId, full address, owner and assessed value for the current year given parcelIds.
 * Combines data from multiple layers:
 * - Layer 13 (Real Estate) for address fields and property type info
 * - Layer 7 (Current Owners) for owner information
 * - Layer 12 (Taxes) for assessed value (total_assessed_value)
 *
 * @param parcelIds Array of parcel IDs to search for.
 * @param fiscalYearAndQuarter Optional fiscal year and quarter for data filtering.
 * @return Array of property summary objects with parcelId, fullAddress, owner, and assessedValue.
 */
export const fetchPropertySummariesByParcelIdsHelper = async (
  parcelIds: string[],
  fiscalYearAndQuarter?: { year: number; quarter: string }
): Promise<Array<{parcelId: string, fullAddress: string, owner: string, assessedValue: number}>> => {
  console.log(`[EGISClient] Starting fetchPropertySummariesByParcelIds for ${parcelIds.length} parcelIds`);

  if (fiscalYearAndQuarter) {
    console.log(`[EGISClient] Using fiscal year: ${fiscalYearAndQuarter.year}, quarter: ${fiscalYearAndQuarter.quarter}`);
  } else {
    console.log("[EGISClient] No fiscal year/quarter specified, using latest available data");
  }

  // Build OR query for multiple parcel IDs
  const parcelIdConditions = parcelIds.map((id) => `parcel_id='${id}'`).join(" OR ");

  try {
    // Fetch address data from Layer 13 (Real Estate)
    const addressQuery = `?where=${parcelIdConditions}&outFields=*&returnGeometry=false&f=json`;
    console.log(`[EGISClient] Address query: ${addressQuery}`);
    let addressFeatures = await fetchEGISData(realEstateDataLayerUrl, addressQuery);
    // Filter for highest fiscal year and quarter
    addressFeatures = filterForHighestFiscalYearAndQuarter(addressFeatures);
    
    // Fetch owner data from Layer 7 (Current Owners)
    let ownersWhereClause = `(${parcelIdConditions})`;
    if (fiscalYearAndQuarter) {
      ownersWhereClause += ` AND fiscal_year=${fiscalYearAndQuarter.year} AND quarter=${fiscalYearAndQuarter.quarter}`;
    }
    const ownersQuery = `?where=${ownersWhereClause}&outFields=*&returnGeometry=false&f=json`;
    console.log(`[EGISClient] Owners query: ${ownersQuery}`);
    let ownersFeatures = await fetchEGISData(currentOwnersDataLayerUrl, ownersQuery);
    
    // Filter owners for highest fiscal year/quarter if not specified
    if (!fiscalYearAndQuarter) {
      ownersFeatures = filterForHighestFiscalYearAndQuarter(ownersFeatures);
    }
    
    // Fetch assessed value from Layer 12 (Taxes)
    let taxesWhereClause = `(${parcelIdConditions})`;
    if (fiscalYearAndQuarter) {
      taxesWhereClause += ` AND bill_year=${fiscalYearAndQuarter.year}`;
    }
    const taxesQuery = `?where=${taxesWhereClause}&outFields=*&returnGeometry=false&f=json`;
    console.log(`[EGISClient] Taxes query: ${taxesQuery}`);
    let taxesFeatures = await fetchEGISData(taxesDataLayerUrl, taxesQuery);
    
    // Filter taxes for highest bill year if not specified (Layer 12 uses bill_year, no quarter)
    if (!fiscalYearAndQuarter) {
      taxesFeatures = filterForHighestFiscalYearAndQuarter(taxesFeatures, { yearField: 'bill_year', hasQuarter: false });
    }

    // Create lookup maps
    const addressMap = new Map(addressFeatures.map(f => [f.attributes.parcel_id, f.attributes]));
    const ownersMap = new Map(ownersFeatures.map(f => [f.attributes.parcel_id, f.attributes.owner_name]));
    const valueMap = new Map(taxesFeatures.map(f => [f.attributes.parcel_id, f.attributes.total_assessed_value]));

    // Combine data
    const results = parcelIds.map((parcelId) => ({
      parcelId,
      fullAddress: addressMap.has(parcelId) ? constructFullAddress(addressMap.get(parcelId)!) : "Address not available",
      owner: ownersMap.has(parcelId) ? toCamelCase(ownersMap.get(parcelId)) : "",
      assessedValue: valueMap.get(parcelId) || 0,
    }));

    console.log(`[EGISClient] Found ${results.length} property summaries`);
    return results;
  } catch (error) {
    console.error("[EGISClient] Error fetching property summaries:", error);
    return [];
  }
};

/**
 * Helper function to get a property summary - parcelId, full address, owner and assessed value for the current year given a parcelId.
 * Combines data from multiple layers:
 * - Layer 13 (Real Estate) for address fields and property type info
 * - Layer 7 (Current Owners) for owner information
 * - Layer 12 (Taxes) for assessed value (total_assessed_value)
 *
 * @param parcelId The parcel ID to search for.
 * @return A property summary object with parcelId, fullAddress, owner, and assessedValue.
 */
export const fetchPropertySummaryByParcelIdHelper = async (parcelId: string): Promise<{parcelId: string, fullAddress: string, owner: string, assessedValue: number} | null> => {
  console.log(`[EGISClient] Starting fetchPropertySummaryByParcelId for parcelId: ${parcelId}`);

  try {
    // Fetch address data from Layer 13 (Real Estate)
    const addressQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;
    console.log(`[EGISClient] Address query: ${addressQuery}`);
    let addressFeatures = await fetchEGISData(realEstateDataLayerUrl, addressQuery);
    // Filter for highest fiscal year and quarter
    addressFeatures = filterForHighestFiscalYearAndQuarter(addressFeatures);
    
    // Fetch owner data from Layer 7 (Current Owners)
    const ownersQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;
    console.log(`[EGISClient] Owners query: ${ownersQuery}`);
    let ownersFeatures = await fetchEGISData(currentOwnersDataLayerUrl, ownersQuery);
    ownersFeatures = filterForHighestFiscalYearAndQuarter(ownersFeatures);
    
    // Fetch assessed value from Layer 12 (Taxes) - uses bill_year, no quarter
    const taxesQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;
    console.log(`[EGISClient] Taxes query: ${taxesQuery}`);
    let taxesFeatures = await fetchEGISData(taxesDataLayerUrl, taxesQuery);
    taxesFeatures = filterForHighestFiscalYearAndQuarter(taxesFeatures, { yearField: 'bill_year', hasQuarter: false });

    if (addressFeatures.length > 0) {
      const result = {
        parcelId,
        fullAddress: constructFullAddress(addressFeatures[0].attributes),
        owner: ownersFeatures.length > 0 ? toCamelCase(ownersFeatures[0].attributes.owner_name) : "",
        assessedValue: taxesFeatures.length > 0 ? taxesFeatures[0].attributes.total_assessed_value : 0,
      };

      console.log(`[EGISClient] Property summary found for parcelId: ${parcelId}`, result);
      return result;
    }
  } catch (error) {
    console.error(`[EGISClient] Error fetching property summary for parcelId: ${parcelId}:`, error);
  }

  console.log(`[EGISClient] No property found for parcelId: ${parcelId}`);
  return null;
};

/**
 * Helper function to get all property details for a property given a parcelId.
 * This involves getting all fields from propertyAssessmentJoinUrl (layer 0) and adding
 * a historical property value field that contains the results from historicalPropertyDataLayerUrl.
 * Also returns geometry data for map generation.
 *
 * @param parcelId The parcel ID to search for.
 * @param fiscalYearAndQuarter Optional fiscal year and quarter for data filtering.
 * @return A property details object with all current fields plus historical values and geometry.
 */
export const fetchPropertyDetailsByParcelIdHelper = async (
  parcelId: string,
  fiscalYearAndQuarter?: { year: number; quarter: string }
): Promise<PropertyDetailsData & { geometry?: any }> => {
  console.log(`[EGISClient] Starting fetchPropertyDetailsByParcelId for parcelId: ${parcelId}`);

  if (fiscalYearAndQuarter) {
    console.log(`[EGISClient] Using fiscal year: ${fiscalYearAndQuarter.year}, quarter: ${fiscalYearAndQuarter.quarter}`);
  } else {
    console.log("[EGISClient] No fiscal year/quarter specified, using default data");
  }

  // Get geometry from the joined layer (layer 0)
  console.log(`[EGISClient] Fetching geometry for parcelId: ${parcelId} from propertyAssessmentJoinUrl`);
  const geometryQuery = `?where=PID='${parcelId}'&returnGeometry=true&outFields=PID&f=json`;
  console.log(`[EGISClient] Geometry query: ${geometryQuery}`);
  console.log(`[EGISClient] Full geometry URL: ${geomertricDataLayerUrl}/query${geometryQuery}`);
  let geometricDataFeatures: ArcGISFeature[] = [];
  let geometricData: any = null;

  try {
    console.log(`[EGISClient] Using geometry query: ${geometryQuery}`);
    geometricDataFeatures = await fetchEGISData(geomertricDataLayerUrl, geometryQuery);
    if (geometricDataFeatures.length > 0) {
      geometricData = geometricDataFeatures[0].geometry;
      console.log(`[EGISClient] Geometry found for parcelId: ${parcelId}`);
    }
  } catch (error) {
    console.log(`[EGISClient] Geometry query failed: ${geometryQuery}`, error);
  }

  console.log("[EGISClient] Geometry:", geometricData);

  // Get historical property values from layer 1
  console.log(`[EGISClient] Fetching historical property values for parcelId: ${parcelId}`);
  const historicalQuery = `?where=Parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  console.log(`[EGISClient] Historical data query: ${historicalQuery}`);
  console.log(`[EGISClient] Full historical data URL: ${valueHistoryDataLayerUrl}/query${historicalQuery}`);

  let valueHistoryFeatures: ArcGISFeature[] = [];
  try {
    console.log(`[EGISClient] Using historical data query: ${historicalQuery}`);
    valueHistoryFeatures = await fetchEGISData(valueHistoryDataLayerUrl, historicalQuery);
    console.log(`[EGISClient] Historical data found: ${valueHistoryFeatures.length} records`);
  } catch (error) {
    console.log(`[EGISClient] Historical data query failed: ${historicalQuery}`, error);
  }

  // Parse historical values
  const historicalValues: { [year: number]: number } = {};

  valueHistoryFeatures.forEach((feature: ArcGISFeature, index: number) => {
    const yearId = feature.attributes.fiscal_year;
    const assessedValue = feature.attributes.assessed_value;
    console.log(`[EGISClient] Historical feature ${index}: Fiscal_Year=${yearId}, Assessed_value=${assessedValue}`);
    if (yearId && assessedValue !== undefined) {
      historicalValues[yearId] = assessedValue;
    }
  });

  // Get owners from layer 3
  console.log(`[EGISClient] Fetching owners for parcelId: ${parcelId}`);
  let ownersQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  // Add fiscal year and quarter filtering if provided
  if (fiscalYearAndQuarter) {
    ownersQuery = `?where=parcel_id='${parcelId}' AND fiscal_year=${fiscalYearAndQuarter.year} AND quarter=${fiscalYearAndQuarter.quarter}&outFields=*&returnGeometry=false&f=json`;
  }

  console.log(`[EGISClient] Owners query: ${ownersQuery}`);
  console.log(`[EGISClient] Full owners URL: ${currentOwnersDataLayerUrl}/query${ownersQuery}`);

  let owners: string[] = ["Owner not available"];
  try {
    let currentOwnersFeatures = await fetchEGISData(currentOwnersDataLayerUrl, ownersQuery);

    // If no fiscal year/quarter specified, filter for highest
    if (!fiscalYearAndQuarter) {
      currentOwnersFeatures = filterForHighestFiscalYearAndQuarter(currentOwnersFeatures);
    }

    if (currentOwnersFeatures.length > 0) {
      owners = currentOwnersFeatures.map((feature: ArcGISFeature) => toCamelCase(feature.attributes.owner_name) || "").filter(Boolean);
    }
  } catch (error) {
    console.log(`[EGISClient] Owners query failed: ${ownersQuery}`, error);
  }

  console.log("[EGISClient] Owners:", owners);

  // Get residential property attributes data from layer 6
  console.log(`[EGISClient] Fetching residential property attributes for parcelId: ${parcelId}`);
  let residentialAttrsQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  // Add fiscal year and quarter filtering if provided
  if (fiscalYearAndQuarter) {
    residentialAttrsQuery = `?where=parcel_id='${parcelId}' AND fiscal_year=${fiscalYearAndQuarter.year} AND quarter=${fiscalYearAndQuarter.quarter}&outFields=*&returnGeometry=false&f=json`;
  }

  console.log(`[EGISClient] Residential attributes query: ${residentialAttrsQuery}`);
  console.log(`[EGISClient] Full residential attributes URL: ${residentialPropertyAttributesDataLayerUrl}/query${residentialAttrsQuery}`);

  let residentialPropertyFeatures: ArcGISFeature[] = [];
  try {
    residentialPropertyFeatures = await fetchEGISData(residentialPropertyAttributesDataLayerUrl, residentialAttrsQuery);
    console.log(`[EGISClient] Residential attributes data found: ${residentialPropertyFeatures.length} records`);

    // If no fiscal year/quarter specified, filter for highest
    if (!fiscalYearAndQuarter) {
      residentialPropertyFeatures = filterForHighestFiscalYearAndQuarter(residentialPropertyFeatures);
      console.log(`[EGISClient] After filtering, residential attributes data: ${residentialPropertyFeatures.length} records`);
    }
  } catch (error) {
    console.log(`[EGISClient] Residential attributes query failed: ${residentialAttrsQuery}`, error);
  }

  // Check if we have multiple residential features with different attributes
  const hasMultipleBuildings = residentialPropertyFeatures.length > 1 &&
    residentialPropertyFeatures.some((feature, i) => {
      if (i === 0) return false;
      const prev = residentialPropertyFeatures[i - 1].attributes;
      const curr = feature.attributes;
      const differences = [];

      // Compare all relevant attributes and track differences
      if (prev.composite_land_use !== curr.composite_land_use) differences.push("land_use");
      if (prev.gross_area !== curr.gross_area) differences.push("gross_area");
      if (prev.building_style !== curr.building_style) differences.push("style");
      if (prev.story_height !== curr.story_height) differences.push("story_height");
      if (prev.floor !== curr.floor) differences.push("floor");
      if (prev.penthouse_unit !== curr.penthouse_unit) differences.push("penthouse");
      if (prev.orientation !== curr.orientation) differences.push("orientation");
      if (prev.bedrooms !== curr.bedrooms) differences.push("bedrooms");
      if (prev.full_bath !== curr.full_bath) differences.push("full_bath");
      if (prev.half_bath !== curr.half_bath) differences.push("half_bath");
      if (prev.bath_style_1 !== curr.bath_style_1) differences.push("bath_style_1");
      if (prev.bath_style_2 !== curr.bath_style_2) differences.push("bath_style_2");
      if (prev.bath_style_3 !== curr.bath_style_3) differences.push("bath_style_3");
      if (prev.kitchens !== curr.kitchens) differences.push("kitchens");
      if (prev.kitchen_type !== curr.kitchen_type) differences.push("kitchen_type");
      if (prev.kitchen_style_1 !== curr.kitchen_style_1) differences.push("kitchen_style_1");
      if (prev.kitchen_style_2 !== curr.kitchen_style_2) differences.push("kitchen_style_2");
      if (prev.kitchen_style_3 !== curr.kitchen_style_3) differences.push("kitchen_style_3");
      if (prev.year_built !== curr.year_built) differences.push("year_built");
      if (prev.exterior_finish !== curr.exterior_finish) differences.push("exterior_finish");
      if (prev.exterior_condition !== curr.exterior_condition) differences.push("exterior_condition");
      if (prev.roof_cover !== curr.roof_cover) differences.push("roof_cover");
      if (prev.roof_structure !== curr.roof_structure) differences.push("roof_structure");
      if (prev.foundation !== curr.foundation) differences.push("foundation");
      if (prev.num_of_parking_spots !== curr.num_of_parking_spots) differences.push("parking");
      if (prev.heat_type !== curr.heat_type) differences.push("heat");
      if (prev.ac_type !== curr.ac_type) differences.push("ac");
      if (prev.fireplaces !== curr.fireplaces) differences.push("fireplaces");

      // Log comparison details
      if (differences.length > 0) {
        console.log(`[EGISClient] Found differences between features ${i-1} and ${i}:`, {
          differences,
          feature1: {
            id: residentialPropertyFeatures[i-1].attributes.OBJECTID,
            landUse: prev.composite_land_use,
            grossArea: prev.gross_area,
            style: prev.building_style,
            bedrooms: prev.bedrooms,
            baths: `${prev.full_bath}/${prev.half_bath}`,
            kitchens: prev.kitchens,
          },
          feature2: {
            id: curr.OBJECTID,
            landUse: curr.composite_land_use,
            grossArea: curr.gross_area,
            style: curr.building_style,
            bedrooms: curr.bedrooms,
            baths: `${curr.full_bath}/${curr.half_bath}`,
            kitchens: curr.kitchens,
          },
        });
      }

      return differences.length > 0;
    });
  console.log("[EGISClient] Multiple buildings check:", {
    hasMultipleBuildings,
    count: residentialPropertyFeatures.length,
    features: residentialPropertyFeatures.map((f) => f.attributes.OBJECTID),
  });

  // Get the primary residential attributes (first building or only building)
  const primaryResidentialAttrs = residentialPropertyFeatures[0]?.attributes || {};

  // Prepare building attributes if we have multiple residential features
  const buildingAttrs = hasMultipleBuildings ?
    residentialPropertyFeatures.map((feature: ArcGISFeature, index: number) => ({
      buildingNumber: index + 1,
      landUse: parseAfterDash(feature.attributes.composite_land_use),
      grossArea: feature.attributes.gross_area,
      livingArea: feature.attributes.living_area,
      style: toProperCase(parseAfterDash(feature.attributes.building_style)),
      storyHeight: toProperCase(feature.attributes.story_height),
      floor: toProperCase(feature.attributes.floor),
      penthouseUnit: toProperCase(feature.attributes.penthouse_unit),
      orientation: toProperCase(feature.attributes.orientation),
      bedroomNumber: feature.attributes.bedrooms,
      totalBathrooms: feature.attributes.full_bath,
      halfBathrooms: feature.attributes.half_bath,
      otherFixtures: feature.attributes.other_fixtures,
      bathStyle1: toProperCase(parseAfterDash(feature.attributes.bath_style_1)),
      bathStyle2: toProperCase(parseAfterDash(feature.attributes.bath_style_2)),
      bathStyle3: toProperCase(parseAfterDash(feature.attributes.bath_style_3)),
      numberOfKitchens: feature.attributes.kitchens,
      kitchenType: toProperCase(parseAfterDash(feature.attributes.kitchen_type)),
      kitchenStyle1: toProperCase(parseAfterDash(feature.attributes.kitchen_style_1)),
      kitchenStyle2: toProperCase(parseAfterDash(feature.attributes.kitchen_style_2)),
      kitchenStyle3: toProperCase(parseAfterDash(feature.attributes.kitchen_style_3)),
      yearBuilt: feature.attributes.year_built,
      exteriorFinish: toProperCase(parseAfterDash(feature.attributes.exterior_finish)),
      exteriorCondition: toProperCase(parseAfterDash(feature.attributes.exterior_condition)),
      interiorCondition: toProperCase(parseAfterDash(feature.attributes.interior_condition)),
      interiorFinish: toProperCase(parseAfterDash(feature.attributes.interior_finish)),
      view: toProperCase(parseAfterDash(feature.attributes.view_)),
      grade: toProperCase(parseAfterDash(feature.attributes.grade)),
      roofCover: toProperCase(parseAfterDash(feature.attributes.roof_cover)),
      roofStructure: toProperCase(parseAfterDash(feature.attributes.roof_structure)),
      foundation: toProperCase(parseAfterDash(feature.attributes.foundation)),
      parkingSpots: feature.attributes.num_of_parking_spots,
      heatType: toProperCase(parseAfterDash(feature.attributes.heat_type)),
      acType: toProperCase(parseAfterDash(feature.attributes.ac_type)),
      fireplaces: feature.attributes.fireplaces,
    })) :
    undefined;

  console.log("[EGISClient] Residential attributes:", {
    hasMultipleBuildings,
    count: residentialPropertyFeatures.length,
    primaryAttributes: primaryResidentialAttrs,
    buildingAttributes: buildingAttrs,
  });

  // Get condo attributes data from layer 9
  console.log(`[EGISClient] Fetching condo attributes for parcelId: ${parcelId}`);
  let condoAttrsQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  // Add fiscal year and quarter filtering if provided
  if (fiscalYearAndQuarter) {
    condoAttrsQuery = `?where=parcel_id='${parcelId}' AND fiscal_year=${fiscalYearAndQuarter.year} AND quarter=${fiscalYearAndQuarter.quarter}&outFields=*&returnGeometry=false&f=json`;
  }

  console.log(`[EGISClient] Condo attributes query: ${condoAttrsQuery}`);
  console.log(`[EGISClient] Full condo attributes URL: ${condoAttributesDataLayerUrl}/query${condoAttrsQuery}`);

  let condoAttributesFeatures: ArcGISFeature[] = [];
  try {
    condoAttributesFeatures = await fetchEGISData(condoAttributesDataLayerUrl, condoAttrsQuery);
    console.log(`[EGISClient] Condo attributes data found: ${condoAttributesFeatures.length} records`);

    // If no fiscal year/quarter specified, filter for highest
    if (!fiscalYearAndQuarter) {
      condoAttributesFeatures = filterForHighestFiscalYearAndQuarter(condoAttributesFeatures);
      console.log(`[EGISClient] After filtering, condo attributes data: ${condoAttributesFeatures.length} records`);
    }
  } catch (error) {
    console.log(`[EGISClient] Condo attributes query failed: ${condoAttrsQuery}`, error);
  }

  const condoAttrs = condoAttributesFeatures[0]?.attributes || {};
  console.log("[EGISClient] Condo attributes:", condoAttrs);

  // Get outbuildings data from layer 10
  console.log(`[EGISClient] Fetching outbuildings for parcelId: ${parcelId}`);
  let outbuildingsQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  // Add fiscal year and quarter filtering if provided
  if (fiscalYearAndQuarter) {
    outbuildingsQuery = `?where=parcel_id='${parcelId}' AND fiscal_year=${fiscalYearAndQuarter.year} AND quarter=${fiscalYearAndQuarter.quarter}&outFields=*&returnGeometry=false&f=json`;
  }

  console.log(`[EGISClient] Outbuildings query: ${outbuildingsQuery}`);
  console.log(`[EGISClient] Full outbuildings URL: ${outbuildingsDataLayerUrl}/query${outbuildingsQuery}`);

  let outbuildingsFeatures: ArcGISFeature[] = [];
  try {
    outbuildingsFeatures = await fetchEGISData(outbuildingsDataLayerUrl, outbuildingsQuery);
    console.log(`[EGISClient] Outbuildings data found: ${outbuildingsFeatures.length} records`);

    // If no fiscal year/quarter specified, filter for highest
    if (!fiscalYearAndQuarter) {
      outbuildingsFeatures = filterForHighestFiscalYearAndQuarter(outbuildingsFeatures);
      console.log(`[EGISClient] After filtering, outbuildings data: ${outbuildingsFeatures.length} records`);
    }
  } catch (error) {
    console.log(`[EGISClient] Outbuildings query failed: ${outbuildingsQuery}`, error);
  }

  // Process outbuildings data
  const outbuildingAttrs = outbuildingsFeatures.map((feature) => ({
    type: toProperCase(parseAfterDash(feature.attributes.code)),
    size: feature.attributes.tot_units,
    quality: toProperCase(parseAfterDash(feature.attributes.quality)),
    condition: toProperCase(parseAfterDash(feature.attributes.condition)),
  }));

  // Get sales data from layer 11 (note: this layer does not have fiscal year/quarter fields)
  console.log(`[EGISClient] Fetching sales data for parcelId: ${parcelId}`);
  const salesDataQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  console.log(`[EGISClient] Sales data query: ${salesDataQuery}`);
  console.log(`[EGISClient] Full sales data URL: ${salesDataLayerUrl}/query${salesDataQuery}`);

  let salesDataFeatures: ArcGISFeature[] = [];
  try {
    salesDataFeatures = await fetchEGISData(salesDataLayerUrl, salesDataQuery);
    console.log(`[EGISClient] Sales data found: ${salesDataFeatures.length} records`);
  } catch (error) {
    console.log(`[EGISClient] Sales data query failed: ${salesDataQuery}`, error);
  }

  // Extract sales data from the first feature (should only be one per parcel)
  const salesData = salesDataFeatures[0]?.attributes || {};
  console.log("[EGISClient] Sales data:", salesData);

  // Get tax data from Layer 12 (Taxes)
  console.log(`[EGISClient] Fetching tax data for parcelId: ${parcelId}`);
  let taxesQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  // Add bill year filtering if provided (Layer 12 uses bill_year, not fiscal_year)
  if (fiscalYearAndQuarter) {
    taxesQuery = `?where=parcel_id='${parcelId}' AND bill_year=${fiscalYearAndQuarter.year}&outFields=*&returnGeometry=false&f=json`;
  }

  console.log(`[EGISClient] Taxes query: ${taxesQuery}`);
  console.log(`[EGISClient] Full taxes URL: ${taxesDataLayerUrl}/query${taxesQuery}`);

  let taxesFeatures: ArcGISFeature[] = [];
  try {
    taxesFeatures = await fetchEGISData(taxesDataLayerUrl, taxesQuery);
    console.log(`[EGISClient] Taxes data found: ${taxesFeatures.length} records`);

    // If no fiscal year specified, get the most recent bill year (Layer 12 uses bill_year, no quarter)
    if (!fiscalYearAndQuarter) {
      taxesFeatures = filterForHighestFiscalYearAndQuarter(taxesFeatures, { yearField: 'bill_year', hasQuarter: false });
      console.log(`[EGISClient] After filtering, taxes data: ${taxesFeatures.length} records`);
    }
  } catch (error) {
    console.log(`[EGISClient] Taxes query failed: ${taxesQuery}`, error);
  }

  const taxesData = taxesFeatures[0]?.attributes || {};
  console.log("[EGISClient] Taxes data:", taxesData);

  // Get real estate data from Layer 13 (Real Estate)
  console.log(`[EGISClient] Fetching real estate data for parcelId: ${parcelId}`);
  let realEstateQuery = `?where=parcel_id='${parcelId}'&outFields=*&returnGeometry=false&f=json`;

  // Add fiscal year filtering if provided
  if (fiscalYearAndQuarter) {
    realEstateQuery = `?where=parcel_id='${parcelId}' AND fiscal_year=${fiscalYearAndQuarter.year}&outFields=*&returnGeometry=false&f=json`;
  }

  console.log(`[EGISClient] Real estate query: ${realEstateQuery}`);
  console.log(`[EGISClient] Full real estate URL: ${realEstateDataLayerUrl}/query${realEstateQuery}`);

  let realEstateFeatures: ArcGISFeature[] = [];
  try {
    realEstateFeatures = await fetchEGISData(realEstateDataLayerUrl, realEstateQuery);
    console.log(`[EGISClient] Real estate data found: ${realEstateFeatures.length} records`);

    // If no fiscal year specified, filter for highest (Layer 13 has no quarter field)
    if (!fiscalYearAndQuarter) {
      realEstateFeatures = filterForHighestFiscalYearAndQuarter(realEstateFeatures, { hasQuarter: false });
      console.log(`[EGISClient] After filtering, real estate data: ${realEstateFeatures.length} records`);
    }
  } catch (error) {
    console.log(`[EGISClient] Real estate query failed: ${realEstateQuery}`, error);
  }

  const realEstateData = realEstateFeatures[0]?.attributes || {};
  console.log("[EGISClient] Real estate data:", realEstateData);

  // Address data is already in realEstateData from Layer 13
  // Layer 13 contains: parcel_id,fiscal_year,quarter,street_number,street_number_suffix,street_name,
  // apt_unit,city,location_zip_code,land_use,residential_exemption_flag,
  // property_type,property_class_description,property_code_description
  const addressData = realEstateData;
  console.log("[EGISClient] Address data from Layer 13:", addressData);

  // Helper function to extract master parcel ID from apartment complex identifier
  const extractMasterParcelId = (complexIdentifier: string | undefined): string | undefined => {
    if (!complexIdentifier || !complexIdentifier.trim()) return undefined;
    // Split by space or special characters and take the first part
    const match = complexIdentifier.match(/^[A-Za-z0-9]+/);
    const result = match ? match[0] : undefined;
    console.log("[EGISClient] Master parcel ID:", result);
    return result;
  };

  // Check if this unit belongs to an apartment complex (has non-empty complex field)
  const isPartOfComplex = !!condoAttrs?.complex?.trim();
  const masterParcelId = isPartOfComplex ? extractMasterParcelId(condoAttrs.complex) : undefined;

  // Log property structure and layout decision
  const layout = residentialPropertyFeatures.length > 1 ? "multiple_buildings" :
    isPartOfComplex ? "condo_unit_split" :
      "standard";
  console.log("[EGISClient] Property layout:", {
    layout,
    buildings: residentialPropertyFeatures.length,
    complex: {
      field: condoAttrs?.complex || "",
      id: masterParcelId,
    },
  });

  const condoMainAttributes = isPartOfComplex ? {
    masterParcelId,
    grade: condoAttrs.grade,
    exteriorCondition: toProperCase(parseAfterDash(condoAttrs.exterior_condition)),
    exteriorFinish: toProperCase(parseAfterDash(condoAttrs.exterior_finish)),
    foundation: toProperCase(parseAfterDash(condoAttrs.foundation)),
    roofCover: toProperCase(parseAfterDash(condoAttrs.roof_cover)),
    roofStructure: toProperCase(parseAfterDash(condoAttrs.roof_structure)),
  } : {};


  // Compose the final object
  console.log("[EGISClient] Constructing PropertyDetails with:", {
    layout,
    hasMultipleBuildings,
    buildingAttrsCount: buildingAttrs?.length,
    isPartOfComplex,
  });

  console.log("[EGISClient] Final data structure:", {
    layout,
    hasMultipleBuildings,
    isPartOfComplex,
    buildingCount: buildingAttrs?.length,
    outbuildingCount: outbuildingAttrs?.length,
    residentialFeatures: residentialPropertyFeatures.map((f) => ({
      id: f.attributes.OBJECTID,
      landUse: f.attributes.composite_land_use,
      grossArea: f.attributes.gross_area,
      style: f.attributes.building_style,
      bedrooms: f.attributes.bedrooms,
      baths: `${f.attributes.full_bath}/${f.attributes.half_bath}`,
      kitchens: f.attributes.kitchens,
    })),
    condoData: condoAttrs ? {
      complex: condoAttrs.complex,
      masterParcelId,
    } : undefined,
  });

  const propertyDetails = new PropertyDetails({
    hasComplexCondoData: layout === "condo_unit_split",
    buildingAttributes: hasMultipleBuildings ? buildingAttrs : undefined,
    outbuildingAttributes: outbuildingAttrs,
    ...condoMainAttributes,
    // Overview fields
    fullAddress: constructFullAddress(addressData),
    owners: owners,
    imageSrc: "", // Not applicable for EGIS data
    assessedValue: taxesData.total_assessed_value || 0,
    propertyTypeCode: addressData.property_type || addressData.property_code_description || "Not available",
    propertyTypeDescription: addressData.property_class_description || "Not available",
    landUseCode: addressData.land_use || realEstateData.land_use || undefined,
    parcelId: parcelId,
    propertyNetTax: taxesData.net_tax || 0,
    personalExemptionFlag: taxesData.personal_exemption_flag,
    residentialExemptionFlag: (taxesData.resex_amt && taxesData.resex_amt > 0) ? true : false, // Derived from resex_amt
    totalBilledAmount: taxesData.total_billed_amt || 0,
    // Property Value fields
    historicPropertyValues: historicalValues,
    // Property Attributes fields
    landUse: prioritizeValue(parseAfterDash(primaryResidentialAttrs.composite_land_use), parseAfterDash(condoAttrs.composite_land_use)) || parseAfterDash(realEstateData.land_use) || "Not available",
    grossArea: undefined, // Not available in new schema
    livingArea: undefined, // Not available in new schema
    style: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.building_style)), toProperCase(parseAfterDash(condoAttrs.building_style))) || "Not available",
    storyHeight: prioritizeValue(toProperCase(primaryResidentialAttrs.story_height), toProperCase(condoAttrs.story_height)) || "Not available",
    floor: prioritizeValue(toProperCase(primaryResidentialAttrs.floor), toProperCase(condoAttrs.floor)) || undefined,
    penthouseUnit: prioritizeValue(toProperCase(primaryResidentialAttrs.penthouse_unit), toProperCase(condoAttrs.penthouse_unit)) || undefined,
    orientation: prioritizeValue(toProperCase(primaryResidentialAttrs.orientation), toProperCase(condoAttrs.orientation)) || undefined,
    bedroomNumber: prioritizeValue(primaryResidentialAttrs.bedrooms, condoAttrs.bedrooms) || undefined,
    bedroomType: condoAttrs.bedroom_type ? toProperCase(parseAfterDash(condoAttrs.bedroom_type)) : undefined, // Condo only
    rooms: condoAttrs.rooms || undefined, // Condo only - total room count
    totalBathrooms: (() => {
      const residentialFullBath = primaryResidentialAttrs.full_bath;
      const residentialHalfBath = primaryResidentialAttrs.half_bath;
      const condoFullBath = condoAttrs.full_bath;
      const condoHalfBath = condoAttrs.half_bath;

      const fullBath = prioritizeValue(residentialFullBath, condoFullBath);
      const halfBath = prioritizeValue(residentialHalfBath, condoHalfBath);

      if (fullBath !== undefined && halfBath !== undefined) {
        return String(Number(fullBath) + Number(halfBath) * 0.5);
      }
      return undefined;
    })(),
    halfBathrooms: prioritizeValue(primaryResidentialAttrs.half_bath, condoAttrs.half_bath) || undefined,
    otherFixtures: prioritizeValue(primaryResidentialAttrs.other_fixtures, condoAttrs.other_fixtures) || undefined,
    bathStyle1: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.bath_style_1)), toProperCase(parseAfterDash(condoAttrs.bath_style_1))) || undefined,
    bathStyle2: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.bath_style_2)), toProperCase(parseAfterDash(condoAttrs.bath_style_2))) || undefined,
    bathStyle3: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.bath_style_3)), toProperCase(parseAfterDash(condoAttrs.bath_style_3))) || undefined,
    numberOfKitchens: prioritizeValue(primaryResidentialAttrs.kitchens, condoAttrs.kitchens) || undefined,
    kitchenType: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.kitchen_type)), toProperCase(parseAfterDash(condoAttrs.kitchen_type))) || undefined,
    kitchenStyle1: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.kitchen_style_1)), toProperCase(parseAfterDash(condoAttrs.kitchen_style_1))) || undefined,
    kitchenStyle2: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.kitchen_style_2)), toProperCase(parseAfterDash(condoAttrs.kitchen_style_2))) || undefined,
    kitchenStyle3: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.kitchen_style_3)), toProperCase(parseAfterDash(condoAttrs.kitchen_style_3))) || undefined,
    yearBuilt: prioritizeValue(primaryResidentialAttrs.year_built, condoAttrs.year_built) || undefined,
    exteriorFinish: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.exterior_finish)), toProperCase(parseAfterDash(condoAttrs.exterior_finish))) || undefined,
    exteriorCondition: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.exterior_condition)), toProperCase(parseAfterDash(condoAttrs.exterior_condition))) || undefined,
    roofCover: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.roof_cover)), toProperCase(parseAfterDash(condoAttrs.roof_cover))) || undefined,
    roofStructure: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.roof_structure)), toProperCase(parseAfterDash(condoAttrs.roof_structure))) || undefined,
    foundation: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.foundation)), toProperCase(parseAfterDash(condoAttrs.foundation))) || "Not available",
    parkingSpots: prioritizeValue(primaryResidentialAttrs.num_of_parking_spots, condoAttrs.num_of_parking_spots) || undefined,
    heatType: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.heat_type)), toProperCase(parseAfterDash(condoAttrs.heat_type))) || undefined,
    acType: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.ac_type)), toProperCase(parseAfterDash(condoAttrs.ac_type))) || undefined,
    fireplaces: prioritizeValue(primaryResidentialAttrs.fireplaces, condoAttrs.fireplaces) || undefined,
    interiorCondition: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.interior_condition)), toProperCase(parseAfterDash(condoAttrs.interior_condition))) || undefined,
    interiorFinish: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.interior_finish)), toProperCase(parseAfterDash(condoAttrs.interior_finish))) || undefined,
    view: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.view_)), toProperCase(parseAfterDash(condoAttrs.view_))) || undefined,
    grade: prioritizeValue(toProperCase(parseAfterDash(primaryResidentialAttrs.grade)), toProperCase(parseAfterDash(condoAttrs.grade))) || undefined,
    cornerUnit: condoAttrs.corner_unit ? toProperCase(condoAttrs.corner_unit) : undefined, // Condo only
    parkingOwnership: condoAttrs.parking_ownership ? toProperCase(parseAfterDash(condoAttrs.parking_ownership)) : undefined, // Condo only
    parkingType: condoAttrs.parking_type ? toProperCase(parseAfterDash(condoAttrs.parking_type)) : undefined, // Condo only
    tandemParking: condoAttrs.tandem_parking ? toProperCase(condoAttrs.tandem_parking) : undefined, // Condo only
    salePrice: (() => {
      const price = salesData["latest_sales_price"] || salesData["latest-sales_price"];
      return price ? Number(price).toLocaleString() : undefined;
    })(),
    saleDate: salesData.latest_sales_date || undefined,
    registryBookAndPlace: salesData.latest_bkgpcert || undefined,
    // Property Taxes fields
    billNumber: taxesData.bill_number || undefined,
    billYear: taxesData.bill_year || undefined,
    totalAssessedValue: taxesData.total_assessed_value || 0,
    propertyGrossTax: taxesData.gross_re_tax || 0,
    residentialExemptionAmount: taxesData.resex_amt || 0,
    residentialExemptionValue: taxesData.resex_value || 0,
    personalExemptionAmount: taxesData.persexempt_total || 0,
    personalExemptionType1: taxesData.personal_ex_type_1 ? toProperCase(parseAfterDash(taxesData.personal_ex_type_1)) : undefined,
    personalExemptionAmount1: taxesData.personal_ex_amt_1 || 0,
    personalExemptionType2: taxesData.personal_ex_type_2 ? toProperCase(parseAfterDash(taxesData.personal_ex_type_2)) : undefined,
    personalExemptionAmount2: taxesData.personal_ex_amt_2 || 0,
    communityPreservationAmount: taxesData.cpa_tax || 0,
    netRealEstateTax: taxesData.net_re_tax || 0,
    estimatedTotalFirstHalf: taxesData.net_re_tax || 0, // Keep for backward compatibility
  });

  console.log(`[EGISClient] Property details completed for parcelId: ${parcelId}. Historical values count: ${Object.keys(historicalValues).length}`);

  // Return both property details and geometry
  return {
    ...propertyDetails,
    geometry: geometricData,
  };
};

/**
 * Helper function to generate static map image for a property using existing geometry data.
 * This avoids making an additional API call since we already have the geometry from the property details call.
 *
 * @param parcelId The parcel ID for logging purposes.
 * @param geometry The geometry data from the property details call.
 * @return A Buffer containing the PNG image data, or null if geometry is not available.
 */
export const generatePropertyStaticMapImageFromGeometryHelper = async (parcelId: string, geometry: any): Promise<Buffer | null> => {
  console.log(`[EGISClient] Starting generatePropertyStaticMapImageFromGeometry for parcelId: ${parcelId}`);

  try {
    if (!geometry || !geometry.rings) {
      console.log(`[EGISClient] No valid geometry provided for parcelId: ${parcelId} - will use placeholder image`);
      return null;
    }

    console.log("[EGISClient] Geometry spatial reference:", geometry.spatialReference);
    console.log("[EGISClient] Geometry rings count:", geometry.rings.length);

    // Calculate bounding box from the geometry rings
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;

    geometry.rings.forEach((ring: number[][], ringIndex: number) => {
      console.log(`[EGISClient] Processing ring ${ringIndex} with ${ring.length} points`);
      ring.forEach(([x, y], pointIndex: number) => {
        if (pointIndex < 5) { // Log first 5 points for debugging
          console.log(`[EGISClient] Point ${pointIndex}: (${x}, ${y})`);
        }
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    });

    // Validate bounding box values
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      throw new Error(`Invalid bounding box calculated: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
    }

    // Add padding to the bounding box (40% on each side for 2x zoom out)
    const paddingX = Math.max((maxX - minX) * 0.4, 100); // Minimum 100 units padding
    const paddingY = Math.max((maxY - minY) * 0.4, 100);

    const bbox = [
      minX - paddingX,
      minY - paddingY,
      maxX + paddingX,
      maxY + paddingY,
    ];

    console.log(`[EGISClient] Calculated bounding box: [${bbox.join(", ")}]`);

    // Try different export configurations
    const exportConfigs = [
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "0",
        description: "MA State Plane, layers=0, 512x512",
      },
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "show:0",
        description: "MA State Plane, layers=show:0, 512x512",
      },
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "0",
        format: "jpg",
        description: "MA State Plane, JPG format, 512x512",
      },
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "0",
        format: "png",
        transparent: "true",
        description: "MA State Plane, transparent PNG, 512x512",
      },
    ];

    for (const config of exportConfigs) {
      try {
        console.log(`[EGISClient] Trying export config: ${config.description}`);

        const exportUrl = `${geomertricDataLayerUrl.replace("/0", "")}/export`;
        const exportParams = new URLSearchParams({
          bbox: bbox.join(","),
          bboxSR: config.bboxSR,
          imageSR: config.imageSR,
          size: config.size,
          layers: config.layers,
          format: config.format || "png",
          transparent: config.transparent || "false",
          f: "image",
        });

        const fullExportUrl = `${exportUrl}?${exportParams.toString()}`;
        console.log(`[EGISClient] Requesting static map image from: ${fullExportUrl}`);

        const response = await fetch(fullExportUrl);

        if (response.ok) {
          // Get the image data as ArrayBuffer and convert to Buffer
          const imageArrayBuffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(imageArrayBuffer);

          console.log(`[EGISClient] Successfully generated static map image for parcelId: ${parcelId}, size: ${imageBuffer.length} bytes using config: ${config.description}`);
          return imageBuffer;
        } else {
          // Try to get the error details from the response
          let errorDetails = "";
          try {
            const errorText = await response.text();
            errorDetails = ` - ${errorText}`;
          } catch (e) {
            errorDetails = " - Could not read error details";
          }
          console.log(`[EGISClient] Export failed with config ${config.description}: ${response.status} ${response.statusText}${errorDetails}`);
        }
      } catch (configError) {
        console.log(`[EGISClient] Export error with config ${config.description}:`, configError);
      }
    }

    // If all configs fail, throw an error
    throw new Error(`Failed to generate static map image with all coordinate system configurations for parcelId: ${parcelId}`);
  } catch (error) {
    console.error(`[EGISClient] Error generating static map image for parcelId: ${parcelId}:`, error);
    throw error;
  }
};

/**
 * Helper function to generate static map image for a property given a parcelId.
 * Uses propertyAssessmentJoinUrl (layer 0) with query at:
 * https://gisportal.boston.gov/arcgis/rest/services/Assessing/Assessing_Online_data/MapServer/0/query
    ?where=PID='{parcelId}'
    &returnGeometry=true
    &outFields=PID
    &f=json
 * to get the bounding box and spatial reference of the property.
 * The uses the export query to get the static map image:
 * https://gisportal.boston.gov/arcgis/rest/services/Assessing/Assessing_Online_data/MapServer/export
    ?bbox=736200,2905200,736500,2905400
    &bboxSR=2249
    &imageSR=3857
    &size=800,600
    &layers=show:0
    &format=png
    &transparent=false
    &f=image
 * to get the static map image in binary png format.
 *
 * @param parcelId The parcel ID to search for.
 * @return A Buffer containing the PNG image data.
 */
export const fetchPropertyStaticMapImageByParcelIdHelper = async (parcelId: string): Promise<Buffer> => {
  console.log(`[EGISClient] Starting fetchPropertyStaticMapImageByParcelId for parcelId: ${parcelId}`);

  try {
    // First, let's check the map service information to understand available layers
    console.log("[EGISClient] Checking map service information...");
    const serviceInfoUrl = `${baseUrl}/0?f=json`;
    const serviceInfoResponse = await fetch(serviceInfoUrl);
    if (serviceInfoResponse.ok) {
      const serviceInfo = await serviceInfoResponse.json();
      console.log("[EGISClient] Map service layers:", serviceInfo.layers?.map((l: any) => ({id: l.id, name: l.name})));
    }

    // Get the property geometry to determine the bounding box
    const geometryQuery = `?where=PID='${parcelId}'&returnGeometry=true&outFields=PID&f=json`;

    let geometryFeatures: ArcGISFeature[] = [];
    try {
      console.log(`[EGISClient] Static map geometry query: ${geometryQuery}`);
      console.log(`[EGISClient] Full static map geometry URL: ${geomertricDataLayerUrl}/query${geometryQuery}`);

      geometryFeatures = await fetchEGISData(geomertricDataLayerUrl, geometryQuery);
      console.log(`[EGISClient] Geometry data found: ${geometryFeatures.length} records`);
    } catch (error) {
      console.log(`[EGISClient] Geometry query failed: ${geometryQuery}`, error);
      throw new Error(`No property geometry found for parcelId: ${parcelId}`);
    }

    if (geometryFeatures.length === 0) {
      console.log(`[EGISClient] No property geometry found for parcelId: ${parcelId}`);
      throw new Error(`No property geometry found for parcelId: ${parcelId}`);
    }

    const feature = geometryFeatures[0];
    const geometry = feature.geometry;

    if (!geometry || !geometry.rings) {
      console.log(`[EGISClient] No valid geometry found for parcelId: ${parcelId}`);
      throw new Error(`No valid geometry found for parcelId: ${parcelId}`);
    }

    console.log("[EGISClient] Geometry spatial reference:", geometry.spatialReference);
    console.log("[EGISClient] Geometry rings count:", geometry.rings.length);

    // Calculate bounding box from the geometry rings
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;

    geometry.rings.forEach((ring: number[][], ringIndex: number) => {
      console.log(`[EGISClient] Processing ring ${ringIndex} with ${ring.length} points`);
      ring.forEach(([x, y], pointIndex: number) => {
        if (pointIndex < 5) { // Log first 5 points for debugging
          console.log(`[EGISClient] Point ${pointIndex}: (${x}, ${y})`);
        }
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    });

    // Validate bounding box values
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      throw new Error(`Invalid bounding box calculated: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
    }

    // Add padding to the bounding box (40% on each side for 2x zoom out)
    const paddingX = Math.max((maxX - minX) * 0.4, 100); // Minimum 100 units padding
    const paddingY = Math.max((maxY - minY) * 0.4, 100);

    const bbox = [
      minX - paddingX,
      minY - paddingY,
      maxX + paddingX,
      maxY + paddingY,
    ];

    console.log(`[EGISClient] Calculated bounding box: [${bbox.join(", ")}]`);

    // Try different export configurations
    const exportConfigs = [
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "0",
        description: "MA State Plane, layers=0, 512x512",
      },
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "show:0",
        description: "MA State Plane, layers=show:0, 512x512",
      },
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "0",
        format: "jpg",
        description: "MA State Plane, JPG format, 512x512",
      },
      {
        bboxSR: "2249",
        imageSR: "2249",
        size: "512,512",
        layers: "0",
        format: "png",
        transparent: "true",
        description: "MA State Plane, transparent PNG, 512x512",
      },
    ];

    for (const config of exportConfigs) {
      try {
        console.log(`[EGISClient] Trying export config: ${config.description}`);

        const exportUrl = `${geomertricDataLayerUrl.replace("/0", "")}/export`;
        const exportParams = new URLSearchParams({
          bbox: bbox.join(","),
          bboxSR: config.bboxSR,
          imageSR: config.imageSR,
          size: config.size,
          layers: config.layers,
          format: config.format || "png",
          transparent: config.transparent || "false",
          f: "image",
        });

        const fullExportUrl = `${exportUrl}?${exportParams.toString()}`;
        console.log(`[EGISClient] Requesting static map image from: ${fullExportUrl}`);

        const response = await fetch(fullExportUrl);

        if (response.ok) {
          // Get the image data as ArrayBuffer and convert to Buffer
          const imageArrayBuffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(imageArrayBuffer);

          console.log(`[EGISClient] Successfully generated static map image for parcelId: ${parcelId}, size: ${imageBuffer.length} bytes using config: ${config.description}`);
          return imageBuffer;
        } else {
          // Try to get the error details from the response
          let errorDetails = "";
          try {
            const errorText = await response.text();
            errorDetails = ` - ${errorText}`;
          } catch (e) {
            errorDetails = " - Could not read error details";
          }
          console.log(`[EGISClient] Export failed with config ${config.description}: ${response.status} ${response.statusText}${errorDetails}`);
        }
      } catch (configError) {
        console.log(`[EGISClient] Export error with config ${config.description}:`, configError);
      }
    }

    // If all configs fail, throw an error
    throw new Error(`Failed to generate static map image with all coordinate system configurations for parcelId: ${parcelId}`);
  } catch (error) {
    console.error(`[EGISClient] Error generating static map image for parcelId: ${parcelId}:`, error);
    throw error;
  }
};

