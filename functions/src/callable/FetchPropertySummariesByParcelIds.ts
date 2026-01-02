/**
 * Callable cloud function that fetches property summaries for a list of parcelIDs.
 */

import {createCallable, createSuccessResponse} from "../lib/FunctionsClient";
import {fetchPropertySummariesByParcelIdsHelper} from "../lib/EGISClient";
import {PropertySearchResult} from "../types";

export const fetchPropertySummariesByParcelIds = createCallable(async (data: { parcelIds: string[] }) => {
  // Validate input data
  if (!data.parcelIds || !Array.isArray(data.parcelIds)) {
    throw new Error("parcelIds must be an array");
  }

  if (data.parcelIds.length === 0) {
    throw new Error("parcelIds array cannot be empty");
  }

  if (data.parcelIds.length > 500) {
    throw new Error("Maximum 500 parcelIds allowed per request");
  }

  // Validate each parcelId with additional security checks
  for (const parcelId of data.parcelIds) {
    if (typeof parcelId !== "string" || parcelId.trim() === "") {
      throw new Error("All parcelIds must be non-empty strings");
    }

    // Additional security validations
    if (parcelId.length > 20) {
      throw new Error("ParcelId too long");
    }

    // Only allow alphanumeric characters and common separators
    if (!/^[a-zA-Z0-9\-_.]+$/.test(parcelId)) {
      throw new Error("ParcelId contains invalid characters");
    }

    // Prevent potential injection attacks
    if (parcelId.includes("'") || parcelId.includes("\"") || parcelId.includes(";")) {
      throw new Error("ParcelId contains invalid characters");
    }
  }

  console.log(`[FetchPropertySummariesByParcelIds] Input validation passed. Fetching summaries for ${data.parcelIds.length} parcelIds`);

  try {
    // Fetch all property summaries in one batch request
    const summaries = await fetchPropertySummariesByParcelIdsHelper(data.parcelIds);

    // Transform the summaries to match PropertySearchResult interface
    const results: PropertySearchResult[] = summaries.map((summary) => ({
      parcelId: summary.parcelId,
      address: summary.fullAddress,
      owners: [summary.owner],
      value: summary.assessedValue,
    }));

    console.log(`[FetchPropertySummariesByParcelIds] Successfully fetched ${results.length} summaries`);
    console.log("[FetchPropertySummariesByParcelIds] Returning results:", results);

    return createSuccessResponse({
      results: results,
    }, "Property summaries fetched successfully");
  } catch (error) {
    console.error("[FetchPropertySummariesByParcelIds] Error fetching summaries:", error);
    throw error;
  }
});
