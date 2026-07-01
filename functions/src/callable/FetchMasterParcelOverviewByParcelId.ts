/**
 * Callable cloud function that fetches all child parcels for a master parcel
 * using Layer 15 (Master Parcel lookup). Assessed values are fetched from Layer 12.
 */

import {createCallable, createSuccessResponse} from "../lib/FunctionsClient";
import {fetchMasterParcelOverviewHelper} from "../lib/EGISClient";

export const fetchMasterParcelOverviewByParcelId = createCallable(async (data: { parcelId: string }) => {
  if (!data.parcelId || typeof data.parcelId !== "string") {
    throw new Error("parcelId must be a string");
  }

  if (data.parcelId.trim() === "") {
    throw new Error("parcelId cannot be empty");
  }

  if (data.parcelId.length > 20) {
    throw new Error("ParcelId too long");
  }

  if (!/^[a-zA-Z0-9\-_.]+$/.test(data.parcelId)) {
    throw new Error("ParcelId contains invalid characters");
  }

  if (data.parcelId.includes("'") || data.parcelId.includes("\"") || data.parcelId.includes(";")) {
    throw new Error("ParcelId contains invalid characters");
  }

  console.log(`[FetchMasterParcelOverviewByParcelId] Fetching overview for masterParcelId: ${data.parcelId}`);

  try {
    const childParcels = await fetchMasterParcelOverviewHelper(data.parcelId);

    console.log(`[FetchMasterParcelOverviewByParcelId] Found ${childParcels.length} child parcels`);

    return createSuccessResponse({
      results: childParcels,
    }, "Master parcel overview fetched successfully");
  } catch (error) {
    console.error("[FetchMasterParcelOverviewByParcelId] Error:", error);
    throw error;
  }
});
