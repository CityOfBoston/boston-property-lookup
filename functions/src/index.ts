/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 */

// Initialize Firebase Admin SDK
import * as admin from "firebase-admin";

// Initialize the app if it hasn't been initialized already
if (!admin.apps.length) {
  admin.initializeApp();
}

// Callable functions
import {storePropertyFeedback} from "./callable/StorePropertyFeedback";
import {fetchPropertyDetailsByParcelId} from "./callable/FetchPropertyDetailsByParcelId";
import {fetchPropertySummariesByParcelIds} from "./callable/FetchPropertySummariesByParcelIds";
import {getCurrentParcelIdAddressPairings} from "./callable/GetCurrentParcelIdAddressPairings";
import {generatePdf} from "./callable/GeneratePdf";
import {fetchMasterParcelOverviewByParcelId} from "./callable/FetchMasterParcelOverviewByParcelId";

// HTTP functions
import {generateAndStoreParcelIdAddressPairings} from "./https/GenerateAndStoreParcelIdAddressPairings";
import {downloadPdf} from "./https/DownloadPdf";
import {exportFeedback} from "./https/ExportFeedback";

// Scheduler functions
import {runYearlyParcelIdAddressPairingsUpdate} from "./scheduler/RunYearlyParcelIdAddressPairingsUpdate";

export {
  storePropertyFeedback,
  fetchPropertyDetailsByParcelId,
  fetchPropertySummariesByParcelIds,
  fetchMasterParcelOverviewByParcelId,
  getCurrentParcelIdAddressPairings,
  generatePdf,
  generateAndStoreParcelIdAddressPairings,
  downloadPdf,
  exportFeedback,
  runYearlyParcelIdAddressPairingsUpdate,
};
