import * as admin from "firebase-admin";
import * as zlib from "zlib";
import {promisify} from "util";

const gzip = promisify(zlib.gzip);
const parcelIdAddressPairingsCacheBucket = admin.storage().bucket(process.env.PARCEL_ID_ADDRESS_PAIRINGS_CACHE_BUCKET!);
const staticMapImageCacheBucket = admin.storage().bucket(process.env.STATIC_MAP_IMAGE_CACHE_BUCKET!);
const pdfCacheBucket = admin.storage().bucket(process.env.PDF_CACHE_BUCKET!);

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
