/**
 * Callable cloud function that fetches property details, containing both
 * current and historical property data, for a given parcelId.
 */

import {createCallable, createSuccessResponse, createErrorResponse} from "../lib/FunctionsClient";
import {fetchPropertyDetailsByParcelIdHelper, generatePropertyStaticMapImageFromGeometryHelper, getFiscalYearAndQuarter} from "../lib/EGISClient";
import {isStaticMapImageCached, storeStaticMapImage, getStaticMapImageUrl} from "../lib/StorageClient";

export const fetchPropertyDetailsByParcelId = createCallable(async (data: { parcelId: string; date?: string }) => {
  // Validate input data
  if (!data.parcelId || typeof data.parcelId !== "string") {
    throw new Error("parcelId must be a string");
  }

  if (data.parcelId.trim() === "") {
    throw new Error("parcelId cannot be empty");
  }

  // Additional security validations
  if (data.parcelId.length > 20) {
    throw new Error("ParcelId too long");
  }

  // Only allow alphanumeric characters and common separators
  if (!/^[a-zA-Z0-9\-_.]+$/.test(data.parcelId)) {
    throw new Error("ParcelId contains invalid characters");
  }

  // Prevent potential injection attacks
  if (data.parcelId.includes("'") || data.parcelId.includes("\"") || data.parcelId.includes(";")) {
    throw new Error("ParcelId contains invalid characters");
  }

  // Parse and validate date if provided
  let date: Date | undefined;
  if (data.date) {
    if (typeof data.date !== "string") {
      throw new Error("date must be a string in YYYY-MM-DD format");
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error("date must be in YYYY-MM-DD format");
    }

    const [year, month, day] = data.date.split("-").map(Number);
    date = new Date(year, month - 1, day);

    // Validate the date is valid
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date provided");
    }
  }

  // Get fiscal year and quarter if date is provided
  let fiscalYearAndQuarter: { year: number; quarter: string } | undefined;
  if (date) {
    fiscalYearAndQuarter = getFiscalYearAndQuarter(date);
    console.log(`[FetchPropertyDetailsByParcelId] Date provided: ${data.date}, Fiscal Year: ${fiscalYearAndQuarter.year}, Quarter: ${fiscalYearAndQuarter.quarter}`);
  }

  console.log(`[FetchPropertyDetailsByParcelId] Input validation passed. Fetching details for parcelId: ${data.parcelId}`);

  // Fetch property details and geometry using EGISClient (single call)
  const propertyDetailsWithGeometry = await fetchPropertyDetailsByParcelIdHelper(data.parcelId, fiscalYearAndQuarter);

  const {geometry, ...propertyDetails} = propertyDetailsWithGeometry;

  // Check if property was found (not the default "Property not found" case)
  if (propertyDetails.overview.fullAddress === "Property not found") {
    console.log(`[FetchPropertyDetailsByParcelId] No property found for parcelId: ${data.parcelId}`);
    return createErrorResponse("Property not found", null);
  }

  // Checks if static map image is cached. If not, generate it using the geometry we already have. If it is, get its signed URL.
  const isCached = await isStaticMapImageCached(data.parcelId);
  if (!isCached) {
    // Use the geometry from the property details call to generate the static map image
    const staticMapImageData = await generatePropertyStaticMapImageFromGeometryHelper(data.parcelId, geometry);
    
    // If no geometry is available, set a special value for the frontend to handle
    if (!staticMapImageData) {
      console.log(`[FetchPropertyDetailsByParcelId] No geometry available for parcelId: ${data.parcelId}, marking image as unavailable`);
      propertyDetails.overview.imageSrc = "UNAVAILABLE";
    } else {
      const signedUrl = await storeStaticMapImage(data.parcelId, staticMapImageData);
      propertyDetails.overview.imageSrc = signedUrl;
    }
  } else {
    const signedUrl = await getStaticMapImageUrl(data.parcelId);
    propertyDetails.overview.imageSrc = signedUrl;
  }

  console.log(`[FetchPropertyDetailsByParcelId] Successfully fetched property details for parcelId: ${data.parcelId}`);
  console.log(`[FetchPropertyDetailsByParcelId] Property address: ${propertyDetails.overview.fullAddress}`);
  console.log(`[FetchPropertyDetailsByParcelId] Historical values count: ${Object.keys(propertyDetails.propertyValue.historicPropertyValues).length}`);

  return createSuccessResponse(propertyDetails, "Property details fetched successfully");
});
