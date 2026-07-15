/**
 * HTTP cloud function that generates and stores parcel ID address pairings
 * by fetching from EGIS Layer 13 (current fiscal year/quarter) and uploading to Firebase storage.
 */

import {createHttp, sendSuccessResponse, sendErrorResponse} from "../lib/FunctionsClient";
import {fetchAllParcelIdAddressPairingsHelper} from "../lib/EGISClient";
import {storeParcelIdAddressPairings} from "../lib/StorageClient";

export const generateAndStoreParcelIdAddressPairings = createHttp("internal", async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    console.error(`[GenerateAndStoreParcelIdAddressPairings] Invalid method: ${req.method}`);
    sendErrorResponse(res, "Method not allowed. Only POST requests are supported.", 405);
    return;
  }

  console.log("[GenerateAndStoreParcelIdAddressPairings] Starting generation and storage process");

  // Fetch all parcel ID address pairings from EGIS API
  console.log("[GenerateAndStoreParcelIdAddressPairings] Fetching parcel ID address pairings from EGIS API");
  const parcelIdAddressPairings = await fetchAllParcelIdAddressPairingsHelper();

  console.log(`[GenerateAndStoreParcelIdAddressPairings] Fetched ${parcelIdAddressPairings.length} parcel ID address pairings`);

  // Upload to Firebase storage
  console.log("[GenerateAndStoreParcelIdAddressPairings] Uploading to Firebase storage");
  await storeParcelIdAddressPairings(parcelIdAddressPairings);

  console.log("[GenerateAndStoreParcelIdAddressPairings] Successfully completed generation and storage");

  sendSuccessResponse(res, {
    recordCount: parcelIdAddressPairings.length,
    timestamp: new Date().toISOString(),
  }, "Parcel ID address pairings generated and stored successfully");
}, true);
