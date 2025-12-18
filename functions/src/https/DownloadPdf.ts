/**
 * HTTP cloud function that generates and downloads a pre-filled PDF form.
 * Accepts parcel_id and form_type as query parameters, uses current date,
 * and triggers a PDF download instead of returning JSON.
 */

import {createHttp, sendErrorResponse} from "../lib/FunctionsClient";
import {fetchPropertyDetailsByParcelIdHelper, getFiscalYearAndQuarter} from "../lib/EGISClient";
import {isPdfCached, storePdf, getPdfBuffer} from "../lib/StorageClient";
import {getNextAbatementSequenceNumber} from "../lib/SequenceClient";
import {generateBarcodeForForm} from "../lib/BarcodeGenerator";
import {loadFieldConfig, mapPropertyDataToFields, getPdfPath} from "../lib/PdfFieldMapper";
import {fillPdfForm, determineFormType} from "../lib/PdfGenerator";
import {PdfPropertyData, PdfFormType} from "../types";

export const downloadPdf = createHttp("public", async (req, res) => {
  // Only allow GET requests
  if (req.method !== "GET") {
    console.error(`[DownloadPdf] Invalid method: ${req.method}`);
    sendErrorResponse(res, "Method not allowed. Only GET requests are supported.", 405);
    return;
  }

  // Extract query parameters
  const parcelId = req.query.parcel_id as string;
  const formType = req.query.form_type as string;

  // Validate parcel_id
  if (!parcelId || typeof parcelId !== "string") {
    sendErrorResponse(res, "parcel_id query parameter is required and must be a string", 400);
    return;
  }

  if (parcelId.trim() === "") {
    sendErrorResponse(res, "parcel_id cannot be empty", 400);
    return;
  }

  // Additional security validations
  if (parcelId.length > 20) {
    sendErrorResponse(res, "parcel_id too long", 400);
    return;
  }

  // Only allow alphanumeric characters and common separators
  if (!/^[a-zA-Z0-9\-_.]+$/.test(parcelId)) {
    sendErrorResponse(res, "parcel_id contains invalid characters", 400);
    return;
  }

  // Validate form_type
  const validFormTypes: PdfFormType[] = ["residential", "personal", "abatement"];
  if (!formType || !validFormTypes.includes(formType as PdfFormType)) {
    sendErrorResponse(res, "form_type must be one of: residential, personal, abatement", 400);
    return;
  }

  // Use current date
  const date = new Date();

  // Get fiscal year
  const fiscalYearAndQuarter = getFiscalYearAndQuarter(date);
  const fiscalYear = fiscalYearAndQuarter.year;

  console.log(`[DownloadPdf] Starting PDF download for parcelId: ${parcelId}, formType: ${formType}, fiscalYear: ${fiscalYear}`);

  try {
    // Fetch property details
    console.log("[DownloadPdf] Fetching property details...");
    const propertyDetailsWithGeometry = await fetchPropertyDetailsByParcelIdHelper(parcelId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {geometry, ...propertyDetails} = propertyDetailsWithGeometry;

    // Check if property was found
    if (propertyDetails.overview.fullAddress === "Property not found") {
      console.log(`[DownloadPdf] No property found for parcelId: ${parcelId}`);
      sendErrorResponse(res, "Property not found", 404);
      return;
    }

    // Parse full address (format: "123 Main St, Boston, 02101" or "123 Main St #2, Boston, 02101")
    const fullAddress = propertyDetails.overview.fullAddress;
    const addressParts = fullAddress.split(", ");

    // Extract components
    let streetAddress = "";
    let zipCode: string | undefined;
    let streetNumber: string | undefined;
    let streetName: string | undefined;

    if (addressParts.length >= 3) {
      // Format: "Street Address, City, Zip"
      streetAddress = addressParts[0]; // Just the street address (line 1)
      zipCode = addressParts[addressParts.length - 1]; // Last part is zip
    } else if (addressParts.length === 2) {
      // Format: "Street Address, City" or "Street Address, Zip"
      streetAddress = addressParts[0];
      // Check if second part is a zip code (5 digits)
      if (/^\d{5}$/.test(addressParts[1].trim())) {
        zipCode = addressParts[1].trim();
      }
    } else {
      // Single part - just use as is
      streetAddress = fullAddress;
    }

    // Parse street address into street number and street name
    // Format: "123 Main St" or "123-125 Main St" or "123 Main St #2"
    if (streetAddress) {
      const streetMatch = streetAddress.match(/^([\d-]+)\s+(.+)$/);
      if (streetMatch) {
        streetNumber = streetMatch[1]; // "123" or "123-125"
        streetName = streetMatch[2]; // "Main St" or "Main St #2"
      }
    }

    // Extract first and last name from first owner (format: "Last, First" or "Last First")
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (propertyDetails.overview.owners.length > 0) {
      const firstOwner = propertyDetails.overview.owners[0];
      if (firstOwner.includes(",")) {
        // Format: "Last, First"
        const nameParts = firstOwner.split(",").map((part) => part.trim());
        lastName = nameParts[0];
        firstName = nameParts[1];
      } else {
        // Format: "First Last" - split by space and take last word as last name
        const nameParts = firstOwner.trim().split(/\s+/);
        if (nameParts.length > 1) {
          firstName = nameParts.slice(0, -1).join(" ");
          lastName = nameParts[nameParts.length - 1];
        } else {
          lastName = nameParts[0];
        }
      }
    }

    // Format current date as MM/DD/YYYY
    const formattedDate = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;

    // Determine specific form type (for abatements: short vs long)
    const specificFormType = determineFormType(
      propertyDetails.overview.propertyTypeCode || "101",
      formType as PdfFormType
    );

    console.log(`[DownloadPdf] Determined form type: ${specificFormType}`);

    // Check cache
    const cached = await isPdfCached(parcelId, specificFormType, fiscalYear);

    let pdfBuffer: Buffer;

    if (cached) {
      console.log("[DownloadPdf] PDF found in cache, retrieving...");
      pdfBuffer = await getPdfBuffer(parcelId, specificFormType, fiscalYear);
    } else {
      // Generate new PDF
      console.log("[DownloadPdf] Generating new PDF...");

      // Get sequence number for abatements and generate application number
      let sequenceNumber: number | undefined;
      let applicationNumber: string | undefined;
      if (formType === "abatement") {
        sequenceNumber = await getNextAbatementSequenceNumber(fiscalYear);
        applicationNumber = `${fiscalYear}${sequenceNumber}`;
        console.log(`[DownloadPdf] Generated application number: ${applicationNumber}`);
      }

      // Prepare property data for PDF (after we have application number)
      const pdfPropertyData: PdfPropertyData = {
        parcelId: parcelId,
        owner: propertyDetails.overview.owners,
        address: streetAddress, // Just street address, no city/state/zip
        zipCode,
        firstName,
        lastName,
        date: formattedDate,
        assessedValue: propertyDetails.overview.assessedValue,
        propertyTypeCode: propertyDetails.overview.propertyTypeCode,
        applicationNumber, // For abatements
        classCode: propertyDetails.overview.landUseCode || "", // Use landUseCode from overview (raw code from map server 8)
        streetNumber,
        streetName,
      };

      // Generate barcode
      console.log("[DownloadPdf] Generating barcode...");
      const barcodeData = await generateBarcodeForForm(
        formType as PdfFormType,
        parcelId,
        fiscalYear,
        sequenceNumber
      );

      // Load field configuration
      const fieldConfig = loadFieldConfig(fiscalYear, specificFormType);

      // Map property data to field values
      const fieldValues = mapPropertyDataToFields(pdfPropertyData);

      // Get PDF template path
      const pdfPath = getPdfPath(fiscalYear, specificFormType);

      // Fill PDF form
      console.log("[DownloadPdf] Filling PDF form...");
      pdfBuffer = await fillPdfForm(
        pdfPath,
        fieldConfig,
        pdfPropertyData,
        fieldValues,
        barcodeData
      );

      // Store in cache
      console.log("[DownloadPdf] Storing PDF in cache...");
      await storePdf(parcelId, specificFormType, fiscalYear, pdfBuffer);
    }

    // Set headers to trigger download
    const fileName = `${specificFormType}-form-${parcelId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length.toString());

    console.log(`[DownloadPdf] Sending PDF (${pdfBuffer.length} bytes) for download: ${fileName}`);

    // Send the PDF buffer
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[DownloadPdf] Error generating/downloading PDF:", error);
    sendErrorResponse(res, "Failed to generate or download PDF", 500);
  }
});

