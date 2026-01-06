import * as admin from "firebase-admin";
import * as zlib from "zlib";
import {promisify} from "util";

const gzip = promisify(zlib.gzip);
const parcelIdAddressPairingsCacheBucket = admin.storage().bucket(process.env.PARCEL_ID_ADDRESS_PAIRINGS_CACHE_BUCKET!);
const staticMapImageCacheBucket = admin.storage().bucket(process.env.STATIC_MAP_IMAGE_CACHE_BUCKET!);
const pdfCacheBucket = admin.storage().bucket(process.env.PDF_CACHE_BUCKET!);
const feedbackExportBucket = admin.storage().bucket(process.env.FEEDBACK_EXPORT_BUCKET!);

/**
 * Retreives the signed URL of a static map image from the staticMapImageCacheBucket
 * given a parcelId.
 *
 * @param parcelId The parcel ID to search for.
 * @return The signed URL of the static map image.
 */
export const getStaticMapImageUrl = async (parcelId: string): Promise<string> => {
  const [files] = await staticMapImageCacheBucket.getFiles({
    prefix: `static-map-images/${parcelId}`,
  });

  if (files.length === 0) {
    console.log(`[StorageClient] No cached static map image found for parcelId: ${parcelId}`);
    throw new Error(`No cached static map image found for parcelId: ${parcelId}`);
  }

  const filename = files[0].name;
  const file = staticMapImageCacheBucket.file(filename);

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
  });

  console.log(`[StorageClient] Generated signed URL for ${filename}`);
  return signedUrl;
};

/**
 * Given a parcelId, returns a boolean indicating whether a static map image is cached.
 *
 * @param parcelId The parcel ID to search for.
 * @return A boolean indicating whether a static map image is cached.
 */
export const isStaticMapImageCached = async (parcelId: string): Promise<boolean> => {
  const [files] = await staticMapImageCacheBucket.getFiles({
    prefix: `static-map-images/${parcelId}`,
  });

  return files.length > 0;
};

/**
 * Given the binary png data of a static map image and its corresponding parcelId,
 * upload it to the staticMapImageCacheBucket.
 *
 * @param parcelId The parcel ID to search for.
 * @param staticMapImageData The binary png data of the static map image.
 *
 * @return The signed URL of the uploaded static map image.
 */
export const storeStaticMapImage = async (parcelId: string, staticMapImageData: Buffer): Promise<string> => {
  const filename = `static-map-images/${parcelId}.png`;
  const file = staticMapImageCacheBucket.file(filename);
  await file.save(staticMapImageData, {
    metadata: {
      contentType: "image/png",
    },
  });

  console.log(`[StorageClient] Successfully uploaded ${filename} to bucket`);

  // Generate signed URL (valid for 1 hour)
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
  });

  console.log(`[StorageClient] Generated signed URL for ${filename}`);
  return signedUrl;
};

/**
 * Given parcelId address pairings, upload them to the parcelIdAddressPairingsCacheBucket
 * as a gzipped JSON file with current timestamp as the name.
 *
 * @param parcelIdAddressPairings Array of parcel ID and address pairings to cache.
 */
export const storeParcelIdAddressPairings = async (parcelIdAddressPairings: Array<{parcelId: string, fullAddress: string}>): Promise<void> => {
  console.log(`[StorageClient] Starting upload of ${parcelIdAddressPairings.length} parcel ID address pairings`);

  try {
    // Convert to JSON string
    const jsonData = JSON.stringify(parcelIdAddressPairings);
    console.log(`[StorageClient] JSON data size: ${jsonData.length} characters`);

    // Compress with gzip using Node.js built-in zlib
    const gzippedData = await gzip(jsonData);
    console.log(`[StorageClient] Gzipped data size: ${gzippedData.length} bytes (${((gzippedData.length / jsonData.length) * 100).toFixed(1)}% compression)`);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `parcel-id-address-pairings-${timestamp}.json.gz`;

    // Upload to bucket
    const file = parcelIdAddressPairingsCacheBucket.file(filename);
    await file.save(gzippedData, {
      metadata: {
        contentType: "application/gzip",
        metadata: {
          originalSize: jsonData.length.toString(),
          compressedSize: gzippedData.length.toString(),
          recordCount: parcelIdAddressPairings.length.toString(),
        },
      },
    });

    console.log(`[StorageClient] Successfully uploaded ${filename} to bucket`);
  } catch (error) {
    console.error("[StorageClient] Error uploading parcel ID address pairings:", error);
    throw error;
  }
};

/**
 * Get all files in the parcelIdAddressPairingsCacheBucket, determine the most recent file
 * by checking the timestamp in the filename and generate a signed URL for the file.
 *
 * @return A signed URL for the most recent parcel ID address pairings file, or null if no files exist.
 */
export const getMostRecentParcelIdAddressPairingsUrl = async (): Promise<string | null> => {
  console.log("[StorageClient] Getting most recent parcel ID address pairings file");

  try {
    // List all files in the bucket
    const [files] = await parcelIdAddressPairingsCacheBucket.getFiles({
      prefix: "parcel-id-address-pairings-",
    });

    if (files.length === 0) {
      console.log("[StorageClient] No cached files found in bucket");
      return null;
    }

    console.log(`[StorageClient] Found ${files.length} cached files`);

    // Find the most recent file by parsing timestamps in filenames
    let mostRecentFile = files[0];
    let mostRecentTimestamp = new Date(0);

    for (const file of files) {
      const filename = file.name;
      // Extract timestamp from filename: parcel-id-address-pairings-YYYY-MM-DDTHH-MM-SS-sssZ.json.gz
      const timestampMatch = filename.match(/parcel-id-address-pairings-(.+)\.json\.gz$/);

      if (timestampMatch) {
        const timestampStr = timestampMatch[1].replace(/-/g, ":").replace(/-/g, ".");
        const fileTimestamp = new Date(timestampStr);

        if (fileTimestamp > mostRecentTimestamp) {
          mostRecentTimestamp = fileTimestamp;
          mostRecentFile = file;
        }
      }
    }

    console.log(`[StorageClient] Most recent file: ${mostRecentFile.name} (${mostRecentTimestamp.toISOString()})`);

    // Generate signed URL (valid for 1 hour)
    const [signedUrl] = await mostRecentFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
    });

    console.log(`[StorageClient] Generated signed URL for ${mostRecentFile.name}`);
    return signedUrl;
  } catch (error) {
    console.error("[StorageClient] Error getting most recent parcel ID address pairings URL:", error);
    throw error;
  }
};

/**
 * Check if a generated PDF is cached for a given parcelId, formType, and fiscal year.
 *
 * @param parcelId The parcel ID to check.
 * @param formType The form type (residential, personal, abatement_short, abatement_long).
 * @param fiscalYear The fiscal year for the PDF.
 * @return A boolean indicating whether the PDF is cached.
 */
export const isPdfCached = async (parcelId: string, formType: string, fiscalYear: number): Promise<boolean> => {
  const [files] = await pdfCacheBucket.getFiles({
    prefix: `generated-pdfs/${fiscalYear}/${parcelId}/${formType}`,
  });

  return files.length > 0;
};

/**
 * Store a generated PDF in the cache bucket.
 *
 * @param parcelId The parcel ID for the PDF.
 * @param formType The form type.
 * @param fiscalYear The fiscal year for the PDF.
 * @param pdfBuffer The PDF file as a Buffer.
 * @return The signed URL of the stored PDF.
 */
export const storePdf = async (parcelId: string, formType: string, fiscalYear: number, pdfBuffer: Buffer): Promise<string> => {
  const filename = `generated-pdfs/${fiscalYear}/${parcelId}/${formType}.pdf`;
  const file = pdfCacheBucket.file(filename);

  await file.save(pdfBuffer, {
    metadata: {
      contentType: "application/pdf",
      cacheControl: "public, max-age=3600",
      metadata: {
        parcelId: parcelId,
        formType: formType,
        fiscalYear: fiscalYear.toString(),
        generatedAt: new Date().toISOString(),
      },
    },
  });

  console.log(`[StorageClient] Successfully uploaded PDF to ${filename}`);

  // Generate signed URL (valid for 1 hour) with inline disposition for viewing
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
    responseDisposition: "inline",
    responseType: "application/pdf",
  });

  console.log(`[StorageClient] Generated signed URL for ${filename}`);
  return signedUrl;
};

/**
 * Get the signed URL for a cached PDF.
 *
 * @param parcelId The parcel ID for the PDF.
 * @param formType The form type.
 * @param fiscalYear The fiscal year for the PDF.
 * @return The signed URL of the cached PDF.
 */
export const getPdfUrl = async (parcelId: string, formType: string, fiscalYear: number): Promise<string> => {
  const filename = `generated-pdfs/${fiscalYear}/${parcelId}/${formType}.pdf`;
  const file = pdfCacheBucket.file(filename);

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
    responseDisposition: "inline",
    responseType: "application/pdf",
  });

  console.log(`[StorageClient] Generated signed URL for cached PDF ${filename}`);
  return signedUrl;
};

/**
 * Get a download URL for a PDF with attachment disposition.
 *
 * @param parcelId The parcel ID for the PDF.
 * @param formType The form type.
 * @param fiscalYear The fiscal year for the PDF.
 * @param fileName The name to use for the downloaded file.
 * @return The signed download URL for the PDF.
 */
export const getPdfDownloadUrl = async (
  parcelId: string,
  formType: string,
  fiscalYear: number,
  fileName: string
): Promise<string> => {
  const filename = `generated-pdfs/${fiscalYear}/${parcelId}/${formType}.pdf`;
  const file = pdfCacheBucket.file(filename);

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
    responseDisposition: `attachment; filename="${fileName}"`,
    responseType: "application/pdf",
  });

  console.log(`[StorageClient] Generated download URL for PDF ${filename}`);
  return signedUrl;
};

/**
 * Get the PDF buffer from cache for direct download.
 *
 * @param parcelId The parcel ID for the PDF.
 * @param formType The form type.
 * @param fiscalYear The fiscal year for the PDF.
 * @return The PDF file as a Buffer.
 */
export const getPdfBuffer = async (parcelId: string, formType: string, fiscalYear: number): Promise<Buffer> => {
  const filename = `generated-pdfs/${fiscalYear}/${parcelId}/${formType}.pdf`;
  const file = pdfCacheBucket.file(filename);

  const [buffer] = await file.download();
  console.log(`[StorageClient] Retrieved PDF buffer from ${filename} (${buffer.length} bytes)`);
  
  return buffer;
};

/**
 * Mapping of technical field names to human-readable column headers.
 * This makes the exported CSV more accessible for non-technical users.
 */
const FEEDBACK_FIELD_LABELS: Record<string, string> = {
  id: "Feedback ID",
  type: "Feedback Type",
  createdAt: "Submission Date",
  feedbackMessage: "User Message",
  parcelId: "Property Parcel ID",
  hasPositiveSentiment: "Positive Feedback",
  issueType: "Issue Category",
  searchQuery: "Search Query",
};

/**
 * Convert technical issue type codes to human-readable labels.
 */
const formatIssueType = (issueType: string): string => {
  const issueTypeLabels: Record<string, string> = {
    "not-found": "Property Not Found",
    "bug": "Bug Report",
    "suggestion": "Feature Suggestion",
  };
  return issueTypeLabels[issueType] || issueType;
};

/**
 * Convert technical feedback type to human-readable label.
 */
const formatFeedbackType = (type: string): string => {
  const typeLabels: Record<string, string> = {
    "property": "Property Feedback",
    "general": "General Feedback",
  };
  return typeLabels[type] || type;
};

/**
 * Format boolean sentiment to human-readable text.
 */
const formatSentiment = (hasPositiveSentiment: boolean | undefined): string => {
  if (hasPositiveSentiment === undefined || hasPositiveSentiment === null) {
    return "";
  }
  return hasPositiveSentiment ? "Yes" : "No";
};

/**
 * Convert feedback data array to CSV format string with human-readable headers.
 *
 * @param feedbackData Array of feedback documents.
 * @return CSV string with all feedback data.
 */
const convertFeedbackToCsv = (feedbackData: Array<Record<string, any>>): string => {
  if (feedbackData.length === 0) {
    return "No feedback data available";
  }

  // Collect all possible column names from all records
  const allColumns = new Set<string>();
  feedbackData.forEach((record) => {
    Object.keys(record).forEach((key) => allColumns.add(key));
  });

  // Define preferred column order for better readability
  const preferredOrder = [
    "id",
    "type",
    "createdAt",
    "issueType",
    "parcelId",
    "hasPositiveSentiment",
    "searchQuery",
    "feedbackMessage",
  ];

  // Sort columns: preferred order first, then alphabetically for any remaining
  const columns = Array.from(allColumns).sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.localeCompare(b);
  });

  // Helper to escape CSV values
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  // Helper to format cell values for better readability
  const formatCellValue = (column: string, value: any): string => {
    if (column === "type" && value) {
      return formatFeedbackType(value);
    }
    if (column === "issueType" && value) {
      return formatIssueType(value);
    }
    if (column === "hasPositiveSentiment") {
      return formatSentiment(value);
    }
    return value;
  };

  // Build CSV header with human-readable labels
  const csvHeaders = columns.map((col) => FEEDBACK_FIELD_LABELS[col] || col);
  const csvRows: string[] = [csvHeaders.map(escapeCsvValue).join(",")];

  // Build CSV rows with formatted values
  feedbackData.forEach((record) => {
    const row = columns.map((column) => {
      const rawValue = record[column];
      const formattedValue = formatCellValue(column, rawValue);
      return escapeCsvValue(formattedValue);
    });
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
};

/**
 * Store feedback data as a CSV file in the feedback export bucket.
 * Generates a timestamped filename for versioning.
 *
 * @param feedbackData Array of feedback documents to export.
 * @return The signed URL to download the CSV file.
 */
export const storeFeedbackCsv = async (feedbackData: Array<Record<string, any>>): Promise<string> => {
  console.log(`[StorageClient] Starting CSV export of ${feedbackData.length} feedback records`);

  try {
    // Convert to CSV
    const csvData = convertFeedbackToCsv(feedbackData);
    console.log(`[StorageClient] CSV data size: ${csvData.length} characters`);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `feedback-export-${timestamp}.csv`;

    // Upload to bucket
    const file = feedbackExportBucket.file(filename);
    await file.save(csvData, {
      metadata: {
        contentType: "text/csv",
        metadata: {
          recordCount: feedbackData.length.toString(),
          exportedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`[StorageClient] Successfully uploaded ${filename} to bucket`);

    // Generate signed URL (valid for 1 hour)
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
      responseDisposition: `attachment; filename="${filename}"`,
      responseType: "text/csv",
    });

    console.log(`[StorageClient] Generated signed URL for ${filename}`);
    return signedUrl;
  } catch (error) {
    console.error("[StorageClient] Error storing feedback CSV:", error);
    throw error;
  }
};
