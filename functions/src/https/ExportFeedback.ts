/**
 * HTTP cloud function that exports all feedback data from Firestore
 * to a CSV file and provides a download URL.
 */

import {createHttp, sendSuccessResponse, sendErrorResponse} from "../lib/FunctionsClient";
import {getAllFeedbackData} from "../lib/FirestoreClient";
import {storeFeedbackCsv} from "../lib/StorageClient";

export const exportFeedback = createHttp("internal", async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    console.error(`[ExportFeedback] Invalid method: ${req.method}`);
    sendErrorResponse(res, "Method not allowed. Only POST requests are supported.", 405);
    return;
  }

  console.log("[ExportFeedback] Starting feedback export process");

  try {
    // Fetch all feedback data from Firestore
    console.log("[ExportFeedback] Fetching feedback data from Firestore");
    const feedbackData = await getAllFeedbackData();

    if (feedbackData.length === 0) {
      console.log("[ExportFeedback] No feedback data found");
      sendSuccessResponse(res, {
        recordCount: 0,
        downloadUrl: null,
        timestamp: new Date().toISOString(),
      }, "No feedback data available to export");
      return;
    }

    console.log(`[ExportFeedback] Fetched ${feedbackData.length} feedback records`);

    // Store as CSV and get download URL
    console.log("[ExportFeedback] Converting to CSV and uploading to storage");
    const downloadUrl = await storeFeedbackCsv(feedbackData);

    console.log("[ExportFeedback] Successfully completed feedback export");

    sendSuccessResponse(res, {
      recordCount: feedbackData.length,
      downloadUrl,
      timestamp: new Date().toISOString(),
    }, "Feedback data exported successfully");
  } catch (error) {
    console.error("[ExportFeedback] Error exporting feedback:", error);
    sendErrorResponse(res, "Failed to export feedback data", 500);
  }
});
