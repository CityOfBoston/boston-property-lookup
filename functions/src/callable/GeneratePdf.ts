/**
 * Callable cloud function that generates pre-filled PDF forms for property tax applications.
 * Supports residential exemption, personal exemption, and abatement applications.
 */

import {createCallable, createSuccessResponse, createErrorResponse} from "../lib/FunctionsClient";
import {fetchPropertyDetailsByParcelIdHelper, getFiscalYearAndQuarter} from "../lib/EGISClient";
import {isPdfCached, storePdf, getPdfUrl, getPdfDownloadUrl} from "../lib/StorageClient";
import {getNextAbatementSequenceNumber} from "../lib/SequenceClient";
import {generateBarcodeForForm} from "../lib/BarcodeGenerator";
import {loadFieldConfig, mapPropertyDataToFields, getPdfPath} from "../lib/PdfFieldMapper";
import {fillPdfForm, determineFormType} from "../lib/PdfGenerator";
import {PdfGenerationRequest, PdfPropertyData, PdfFormType} from "../types";

export const generatePdf = createCallable(async (data: PdfGenerationRequest) => {
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

  // Validate form type
  const validFormTypes: PdfFormType[] = ["residential", "personal", "abatement"];
  if (!data.formType || !validFormTypes.includes(data.formType)) {
    throw new Error("formType must be one of: residential, personal, abatement");
  }

  // Parse and validate date if provided
  let date: Date;
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
  } else {
    date = new Date();
  }

  // Get fiscal year
  const fiscalYearAndQuarter = getFiscalYearAndQuarter(date);
  const fiscalYear = fiscalYearAndQuarter.year;

  console.log(`[GeneratePdf] Starting PDF generation for parcelId: ${data.parcelId}, formType: ${data.formType}, fiscalYear: ${fiscalYear}`);

  try {
    // Fetch property details
    console.log("[GeneratePdf] Fetching property details...");
    const propertyDetailsWithGeometry = await fetchPropertyDetailsByParcelIdHelper(data.parcelId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {geometry, ...propertyDetails} = propertyDetailsWithGeometry;

    // Check if property was found
    if (propertyDetails.overview.fullAddress === "Property not found") {
      console.log(`[GeneratePdf] No property found for parcelId: ${data.parcelId}`);
      return createErrorResponse("Property not found", null);
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
      data.formType
    );

    console.log(`[GeneratePdf] Determined form type: ${specificFormType}`);

    // Check cache
    const cached = await isPdfCached(data.parcelId, specificFormType, fiscalYear);

    if (cached) {
      console.log("[GeneratePdf] PDF found in cache");
      const pdfUrl = await getPdfUrl(data.parcelId, specificFormType, fiscalYear);
      const fileName = `${specificFormType}-form-${data.parcelId}.pdf`;
      const pdfDownloadUrl = await getPdfDownloadUrl(data.parcelId, specificFormType, fiscalYear, fileName);

      return createSuccessResponse({
        pdfUrl,
        pdfDownloadUrl,
        formType: data.formType,
        formSubtype: specificFormType.includes("abatement") ? specificFormType.split("_")[1] : undefined,
        metadata: {
          parcelId: data.parcelId,
          fiscalYear,
          cached: true,
        },
      }, "PDF retrieved from cache");
    }

    // Generate new PDF
    console.log("[GeneratePdf] Generating new PDF...");

    // Get sequence number for abatements and generate application number
    let sequenceNumber: number | undefined;
    let applicationNumber: string | undefined;
    if (data.formType === "abatement") {
      sequenceNumber = await getNextAbatementSequenceNumber(fiscalYear);
      applicationNumber = `${fiscalYear}${sequenceNumber}`;
      console.log(`[GeneratePdf] Generated application number: ${applicationNumber}`);
    }

    // Prepare property data for PDF (after we have application number)
    const pdfPropertyData: PdfPropertyData = {
      parcelId: data.parcelId,
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
    console.log("[GeneratePdf] Generating barcode...");
    const barcodeData = await generateBarcodeForForm(
      data.formType,
      data.parcelId,
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
    console.log("[GeneratePdf] Filling PDF form...");
    const filledPdfBuffer = await fillPdfForm(
      pdfPath,
      fieldConfig,
      pdfPropertyData,
      fieldValues,
      barcodeData
    );

    // Store in cache
    console.log("[GeneratePdf] Storing PDF in cache...");
    const pdfUrl = await storePdf(data.parcelId, specificFormType, fiscalYear, filledPdfBuffer);
    
    // Generate download URL with attachment disposition
    const fileName = `${specificFormType}-form-${data.parcelId}.pdf`;
    const pdfDownloadUrl = await getPdfDownloadUrl(data.parcelId, specificFormType, fiscalYear, fileName);

    console.log("[GeneratePdf] PDF generation completed successfully");

    return createSuccessResponse({
      pdfUrl,
      pdfDownloadUrl,
      formType: data.formType,
      formSubtype: specificFormType.includes("abatement") ? specificFormType.split("_")[1] : undefined,
      metadata: {
        parcelId: data.parcelId,
        fiscalYear,
        cached: false,
      },
    }, "PDF generated successfully");
  } catch (error) {
    console.error("[GeneratePdf] Error generating PDF:", error);
    return createErrorResponse("Failed to generate PDF", error);
  }
});

