/**
 * Callable cloud function that fetches the current parcelId and address pairings
 * from Firebase storage and returns the compressed file data directly.
 */

import {createCallable, createSuccessResponse, createErrorResponse} from "../lib/FunctionsClient";
import {getMostRecentParcelIdAddressPairingsUrl} from "../lib/StorageClient";

export const getCurrentParcelIdAddressPairings = createCallable(async () => {
  console.log("[GetCurrentParcelIdAddressPairings] Fetching most recent parcel ID address pairings");

  try {
    // Get signed URL for most recent cached file
    const latest = await getMostRecentParcelIdAddressPairingsUrl();

    if (!latest) {
      console.log("[GetCurrentParcelIdAddressPairings] No cached files found");
      return createErrorResponse("No cached parcel ID address pairings found", null);
    }

    console.log(`[GetCurrentParcelIdAddressPairings] Got signed URL for ${latest.fileName}, downloading file`);

    // Download the file on the server side
    const response = await fetch(latest.signedUrl);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    // Get the gzipped data as ArrayBuffer
    const gzippedData = await response.arrayBuffer();

    // Convert to base64 for transmission
    const base64Data = Buffer.from(gzippedData).toString("base64");

    console.log("[GetCurrentParcelIdAddressPairings] Successfully downloaded and encoded file");

    return createSuccessResponse({
      compressedData: base64Data,
      fileName: latest.fileName,
    }, "Parcel ID address pairings downloaded successfully");
  } catch (error) {
    console.error("[GetCurrentParcelIdAddressPairings] Error:", error);
    return createErrorResponse("Failed to download parcel ID address pairings", error);
  }
});
