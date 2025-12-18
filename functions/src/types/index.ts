/**
 * A type representing the data for the OverviewSection component.
 */
export interface OverviewSectionData {
  fullAddress: string;
  owners: string[];
  imageSrc: string;
  assessedValue: number;
  propertyTypeCode: string;
  propertyTypeDescription?: string;
  landUseCode?: string; // Raw land_use code from map server 8 (e.g., "R1", "C")
  parcelId: string;
  netTax: number;
  totalBilledAmount: number;
  personalExemptionFlag: boolean;
  residentialExemptionFlag: boolean;
  personalExemptionAmount: number;
  residentialExemptionAmount: number;
}

/**
 * A type representing the data for the PropertyValueSection component.
 */
export interface PropertyValueSectionData {
  historicPropertyValues: {
    [year: number]: number;
  };
}

/**
 * A type representing a property attribute field.
 */
export interface PropertyAttributeField {
  label: string;
  value: string | undefined;
}

/**
 * A type representing a property attribute category.
 */
export interface PropertyAttributeCategory {
  title: string;
  content: PropertyAttributeField[];
}

/**
 * A type representing a property attribute group.
 */
export interface PropertyAttributeGroup {
  title: string;
  content: PropertyAttributeField[] | PropertyAttributeCategory[];
}

/**
 * A type representing the attributes of a property.
 */
export interface PropertyAttributesData {
  attributeGroups: PropertyAttributeGroup[];
}

/**
 * A type representing the data for the PropertyTaxesSection component.
 */
export interface PropertyTaxesSectionData {
  propertyGrossTax: number;
  residentialExemptionFlag: boolean;
  personalExemptionFlag: boolean;
  residentialExemptionAmount: number;
  personalExemptionAmount: number;
  communityPreservationAmount: number;
  propertyNetTax: number;
  parcelId: string;
  personalExemptionAmount1: number;
  personalExemptionAmount2: number;
  estimatedTotalFirstHalf: number;
  totalBilledAmount: number;
}

/**
 * Data object for all property details sections.
 */
export interface PropertyDetailsData {
  overview: OverviewSectionData;
  propertyValue: PropertyValueSectionData;
  propertyAttributes: PropertyAttributesData;
  propertyTaxes: PropertyTaxesSectionData;
}

/**
 * Class implementation of PropertyDetailsData.
 */
export class PropertyDetails implements PropertyDetailsData {
  overview!: OverviewSectionData;
  propertyValue!: PropertyValueSectionData;
  propertyAttributes!: PropertyAttributesData;
  propertyTaxes!: PropertyTaxesSectionData;

  constructor(data: {
    // Overview fields
    fullAddress: string;
    owners: string[];
    imageSrc: string;
    assessedValue: number;
    propertyTypeCode: string;
    propertyTypeDescription?: string;
    landUseCode?: string;
    parcelId: string;
    propertyNetTax: number;
    personalExemptionFlag: boolean;
    residentialExemptionFlag: boolean;
    buildingAttributes?: Array<{
      buildingNumber: number;
      landUse?: string;
      grossArea?: string;
      livingArea?: string;
      style?: string;
      storyHeight?: string;
      floor?: string;
      penthouseUnit?: string;
      orientation?: string;
      bedroomNumber?: string;
      totalBathrooms?: string;
      halfBathrooms?: string;
      otherFixtures?: string;
      bathStyle1?: string;
      bathStyle2?: string;
      bathStyle3?: string;
      numberOfKitchens?: string;
      kitchenType?: string;
      kitchenStyle1?: string;
      kitchenStyle2?: string;
      kitchenStyle3?: string;
      yearBuilt?: string;
      exteriorFinish?: string;
      exteriorCondition?: string;
      interiorCondition?: string;
      interiorFinish?: string;
      view?: string;
      grade?: string;
      roofCover?: string;
      roofStructure?: string;
      foundation?: string;
      parkingSpots?: string;
      heatType?: string;
      acType?: string;
      fireplaces?: string;
    }>;

    // Property Value fields
    historicPropertyValues: { [year: number]: number };

    // Property Attributes fields
    hasComplexCondoData?: boolean;
    outbuildingAttributes?: Array<{
      type: string;
      size: string | number;
      quality: string;
      condition: string;
    }>;
    masterParcelId?: string;
    grade?: string;
    landUse?: string;
    grossArea?: string;
    livingArea?: string;
    style?: string;
    storyHeight?: string;
    floor?: string;
    penthouseUnit?: string;
    orientation?: string;
    bedroomNumber?: string;
    bedroomType?: string; // Condo only
    rooms?: string; // Condo only - total room count
    totalBathrooms?: string;
    halfBathrooms?: string;
    otherFixtures?: string;
    bathStyle1?: string;
    bathStyle2?: string;
    bathStyle3?: string;
    numberOfKitchens?: string;
    kitchenType?: string;
    kitchenStyle1?: string;
    kitchenStyle2?: string;
    kitchenStyle3?: string;
    yearBuilt?: string;
    exteriorFinish?: string;
    exteriorCondition?: string;
    roofCover?: string;
    roofStructure?: string;
    foundation?: string;
    parkingSpots?: string;
    heatType?: string;
    acType?: string;
    fireplaces?: string;
    interiorCondition?: string;
    interiorFinish?: string;
    view?: string;
    cornerUnit?: string; // Condo only
    parkingOwnership?: string; // Condo only
    parkingType?: string; // Condo only
    tandemParking?: string; // Condo only
    salePrice?: string;
    saleDate?: string;
    registryBookAndPlace?: string;

    // Property Taxes fields
    billNumber?: string;
    billYear?: number;
    totalAssessedValue?: number;
    propertyGrossTax: number;
    residentialExemptionAmount: number;
    residentialExemptionValue?: number;
    personalExemptionAmount: number;
    personalExemptionType1?: string;
    personalExemptionAmount1: number;
    personalExemptionType2?: string;
    personalExemptionAmount2: number;
    communityPreservationAmount: number;
    netRealEstateTax?: number;
    estimatedTotalFirstHalf: number;
    totalBilledAmount: number;
  }) {
    // Construct overview section
    this.overview = {
      fullAddress: data.fullAddress,
      owners: data.owners,
      imageSrc: data.imageSrc,
      assessedValue: data.assessedValue,
      propertyTypeCode: data.propertyTypeCode,
      propertyTypeDescription: data.propertyTypeDescription,
      landUseCode: data.landUseCode,
      parcelId: data.parcelId,
      netTax: data.propertyNetTax,
      totalBilledAmount: data.totalBilledAmount,
      personalExemptionFlag: data.personalExemptionFlag,
      residentialExemptionFlag: data.residentialExemptionFlag,
      personalExemptionAmount: data.personalExemptionAmount,
      residentialExemptionAmount: data.residentialExemptionAmount,
    };

    // Construct property value section
    this.propertyValue = {
      historicPropertyValues: data.historicPropertyValues,
    };

    // Construct property attributes section
    console.log("[PropertyDetails] Constructing with data:", {
      hasComplexCondoData: data.hasComplexCondoData,
      buildingAttributes: data.buildingAttributes,
      masterParcelId: data.masterParcelId,
      grade: data.grade,
      outbuildingAttributes: data.outbuildingAttributes?.length,
    });

    // Prepare common sections that appear in all cases
    const commonSections = [
      ...(data.outbuildingAttributes?.length ? [{
        title: "Outbuildings",
        content: data.outbuildingAttributes.map((building, index) => ({
          title: `Outbuilding ${index + 1}`,
          content: [
            {label: "Type", value: building.type},
            {label: "Size", value: building.size?.toString()},
            {label: "Quality", value: building.quality},
            {label: "Condition", value: building.condition},
          ].filter((field) => field.value),
        })),
      }] : []),
      {
        title: "Last Transaction",
        content: [
          {label: "Sale Price", value: data.salePrice ? `$${data.salePrice}` : undefined},
          {label: "Sale Date", value: data.saleDate},
          {label: "Registry Book & Place", value: data.registryBookAndPlace},
        ],
      },
    ];

    this.propertyAttributes = {
      attributeGroups: data.buildingAttributes ? [
        // Map each building to its own group
        ...data.buildingAttributes.map((building) => ({
          title: `Building ${building.buildingNumber}`,
          content: [
            {
              title: "General",
              content: [
                {label: "Land Use", value: building.landUse},
                {label: "Gross Area", value: building.grossArea ? `${building.grossArea} sq ft` : undefined},
                {label: "Living Area", value: building.livingArea ? `${building.livingArea} sq ft` : undefined},
                {label: "Style", value: building.style},
                {label: "Story Height", value: building.storyHeight},
                {label: "Floor", value: building.floor},
                {label: "Penthouse Unit", value: building.penthouseUnit},
                {label: "Orientation", value: building.orientation},
                {label: "View", value: building.view},
                {label: "Grade", value: building.grade},
              ].filter((field) => field.value),
            },
            {
              title: "Rooms",
              content: [
                {label: "Number of Bedrooms", value: building.bedroomNumber},
                {label: "Total Bathrooms", value: building.totalBathrooms},
                {label: "Half Bathrooms", value: building.halfBathrooms},
                {label: "Other Fixtures", value: building.otherFixtures},
                {label: "Bath Style 1", value: building.bathStyle1},
                {label: "Bath Style 2", value: building.bathStyle2},
                {label: "Bath Style 3", value: building.bathStyle3},
                {label: "Number of Kitchens", value: building.numberOfKitchens},
                {label: "Kitchen Type", value: building.kitchenType},
                {label: "Kitchen Style 1", value: building.kitchenStyle1},
                {label: "Kitchen Style 2", value: building.kitchenStyle2},
                {label: "Kitchen Style 3", value: building.kitchenStyle3},
              ].filter((field) => field.value),
            },
            {
              title: "Construction & Condition",
              content: [
                {label: "Year Built", value: building.yearBuilt},
                {label: "Exterior Finish", value: building.exteriorFinish},
                {label: "Exterior Condition", value: building.exteriorCondition},
                {label: "Interior Finish", value: building.interiorFinish},
                {label: "Interior Condition", value: building.interiorCondition},
                {label: "Roof Cover", value: building.roofCover},
                {label: "Roof Structure", value: building.roofStructure},
                {label: "Foundation", value: building.foundation},
                {label: "Parking Spots", value: building.parkingSpots},
              ].filter((field) => field.value),
            },
            {
              title: "Utilities",
              content: [
                {label: "Heat Type", value: building.heatType},
                {label: "AC Type", value: building.acType},
                {label: "Fireplaces", value: building.fireplaces},
              ].filter((field) => field.value),
            },
          ],
        })),
        ...commonSections,
      ] : data.hasComplexCondoData ? [ // Condo case
        {
          title: "Condo Main Attributes",
          content: [
            {label: "Master Parcel ID", value: data.masterParcelId},
            {label: "Grade", value: data.grade},
            {label: "Exterior Condition", value: data.exteriorCondition},
            {label: "Exterior Finish", value: data.exteriorFinish},
            {label: "Foundation", value: data.foundation},
            {label: "Roof Cover", value: data.roofCover},
            {label: "Roof Structure", value: data.roofStructure},
          ].filter((attr) => attr.value),
        },
        {
          title: "Unit Attributes",
          content: [
            {
              title: "General",
              content: [
                {label: "Land Use", value: data.landUse},
                {label: "Gross Area", value: data.grossArea ? `${data.grossArea} sq ft` : undefined},
                {label: "Living Area", value: data.livingArea ? `${data.livingArea} sq ft` : undefined},
                {label: "Style", value: data.style},
                {label: "Story Height", value: data.storyHeight},
                {label: "Floor", value: data.floor},
                {label: "Penthouse Unit", value: data.penthouseUnit},
                {label: "Orientation", value: data.orientation},
                {label: "Corner Unit", value: data.cornerUnit},
                {label: "View", value: data.view},
              ],
            },
            {
              title: "Rooms",
              content: [
                {label: "Total Rooms", value: data.rooms},
                {label: "Number of Bedrooms", value: data.bedroomNumber},
                {label: "Bedroom Type", value: data.bedroomType},
                {label: "Total Bathrooms", value: data.totalBathrooms},
                {label: "Half Bathrooms", value: data.halfBathrooms},
                {label: "Other Fixtures", value: data.otherFixtures},
                {label: "Bath Style 1", value: data.bathStyle1},
                {label: "Bath Style 2", value: data.bathStyle2},
                {label: "Bath Style 3", value: data.bathStyle3},
                {label: "Number of Kitchens", value: data.numberOfKitchens},
                {label: "Kitchen Type", value: data.kitchenType},
                {label: "Kitchen Style 1", value: data.kitchenStyle1},
                {label: "Kitchen Style 2", value: data.kitchenStyle2},
                {label: "Kitchen Style 3", value: data.kitchenStyle3},
              ],
            },
            {
              title: "Construction & Condition",
              content: [
                {label: "Year Built", value: data.yearBuilt},
                {label: "Interior Finish", value: data.interiorFinish},
                {label: "Interior Condition", value: data.interiorCondition},
              ],
            },
            {
              title: "Parking",
              content: [
                {label: "Parking Spots", value: data.parkingSpots},
                {label: "Parking Ownership", value: data.parkingOwnership},
                {label: "Parking Type", value: data.parkingType},
                {label: "Tandem Parking", value: data.tandemParking},
              ],
            },
            {
              title: "Utilities",
              content: [
                {label: "Heat Type", value: data.heatType},
                {label: "AC Type", value: data.acType},
                {label: "Fireplaces", value: data.fireplaces},
              ],
            },
          ],
        },
        ...commonSections,
      ] : [
        // Standard case
        {
          title: "General",
          content: [
            {label: "Land Use", value: data.landUse},
            {label: "Gross Area", value: data.grossArea ? `${data.grossArea} sq ft` : undefined},
            {label: "Living Area", value: data.livingArea ? `${data.livingArea} sq ft` : undefined},
            {label: "Style", value: data.style},
            {label: "Story Height", value: data.storyHeight},
            {label: "Floor", value: data.floor},
            {label: "Penthouse Unit", value: data.penthouseUnit},
            {label: "Orientation", value: data.orientation},
            {label: "View", value: data.view},
            {label: "Grade", value: data.grade},
          ],
        },
        {
          title: "Rooms",
          content: [
            {label: "Number of Bedrooms", value: data.bedroomNumber},
            {label: "Total Bathrooms", value: data.totalBathrooms},
            {label: "Half Bathrooms", value: data.halfBathrooms},
            {label: "Other Fixtures", value: data.otherFixtures},
            {label: "Bath Style 1", value: data.bathStyle1},
            {label: "Bath Style 2", value: data.bathStyle2},
            {label: "Bath Style 3", value: data.bathStyle3},
            {label: "Number of Kitchens", value: data.numberOfKitchens},
            {label: "Kitchen Type", value: data.kitchenType},
            {label: "Kitchen Style 1", value: data.kitchenStyle1},
            {label: "Kitchen Style 2", value: data.kitchenStyle2},
            {label: "Kitchen Style 3", value: data.kitchenStyle3},
          ],
        },
        {
          title: "Construction & Condition",
          content: [
            {label: "Year Built", value: data.yearBuilt},
            {label: "Exterior Finish", value: data.exteriorFinish},
            {label: "Exterior Condition", value: data.exteriorCondition},
            {label: "Interior Finish", value: data.interiorFinish},
            {label: "Interior Condition", value: data.interiorCondition},
            {label: "Roof Cover", value: data.roofCover},
            {label: "Roof Structure", value: data.roofStructure},
            {label: "Foundation", value: data.foundation},
            {label: "Parking Spots", value: data.parkingSpots},
          ],
        },
        {
          title: "Utilities",
          content: [
            {label: "Heat Type", value: data.heatType},
            {label: "AC Type", value: data.acType},
            {label: "Fireplaces", value: data.fireplaces},
          ],
        },
        ...commonSections,
      ],
    };

    // Construct property taxes section
    this.propertyTaxes = {
      propertyGrossTax: data.propertyGrossTax,
      residentialExemptionFlag: data.residentialExemptionFlag,
      personalExemptionFlag: data.personalExemptionFlag,
      residentialExemptionAmount: data.residentialExemptionAmount,
      personalExemptionAmount: data.personalExemptionAmount,
      communityPreservationAmount: data.communityPreservationAmount,
      propertyNetTax: data.propertyNetTax,
      parcelId: data.parcelId,
      personalExemptionAmount1: data.personalExemptionAmount1,
      personalExemptionAmount2: data.personalExemptionAmount2,
      estimatedTotalFirstHalf: data.estimatedTotalFirstHalf,
      totalBilledAmount: data.totalBilledAmount,
    };
  }
}

/**
 * A type representing a single property search result.
 */
export interface PropertySearchResult {
  parcelId: string;
  address: string;
  owners: string[];
  value: number;
}

/**
 * A type representing the results of a property search.
 */
export interface PropertySearchResults {
  results: PropertySearchResult[];
}

export interface PropertySearchSuggestion {
  fullAddress: string;
  parcelId: string;
}

export interface PropertySearchSuggestions {
  suggestions: PropertySearchSuggestion[];
}

// Base feedback interface
export interface BaseFeedbackData {
  feedbackMessage?: string;
  createdAt?: any; // Firestore Timestamp
}

// Property-specific feedback (existing FeedbackSender)
export interface PropertyFeedbackData extends BaseFeedbackData {
  type: "property";
  parcelId: string;
  hasPositiveSentiment: boolean;
}

// General site feedback (new ComplexFeedbackSender)
export interface GeneralFeedbackData extends BaseFeedbackData {
  type: "general";
  issueType: "not-found" | "bug" | "suggestion";
  searchQuery?: string;
}

// Union type for all feedback
export type FeedbackData = PropertyFeedbackData | GeneralFeedbackData;

// Standard response interface
export interface StandardResponse<T = any> {
  status: "success" | "error";
  message: string;
  data?: T;
}

// PDF Generation Types

/**
 * PDF form types
 */
export type PdfFormType = "residential" | "personal" | "abatement";

/**
 * PDF form subtype (for abatements)
 */
export type PdfFormSubtype = "short" | "long";

/**
 * Request to generate a PDF form
 */
export interface PdfGenerationRequest {
  parcelId: string;
  formType: PdfFormType;
  date?: string;
}

/**
 * Response from PDF generation
 */
export interface PdfGenerationResponse {
  pdfUrl: string;
  pdfDownloadUrl: string;
  formType: string;
  formSubtype?: string;
  metadata: {
    parcelId: string;
    fiscalYear: number;
    cached: boolean;
  };
}

/**
 * Bounding box configuration for PDF field placement
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Barcode configuration
 */
export interface BarcodeConfig extends BoundingBox {
  mode: "bounding_box";
}

/**
 * Font configuration for bounding box text
 */
export interface FontConfig {
  autoSizeFont?: boolean;
  maxFontSize?: number;
  minFontSize?: number;
  defaultFontSize?: number;
}

/**
 * Field configuration for field index mode
 */
export interface FieldIndexConfig {
  mode: "field_index";
  index: number;
}

/**
 * Field configuration for bounding box mode
 */
export interface BoundingBoxFieldConfig extends BoundingBox, FontConfig {
  mode: "bounding_box";
}

/**
 * Union type for field configurations
 */
export type FieldConfig = FieldIndexConfig | BoundingBoxFieldConfig;

/**
 * Complete form field mapping from YAML
 */
export interface FormFieldMapping {
  fields: {
    [fieldName: string]: FieldConfig;
  };
}

/**
 * Property data for PDF generation
 */
export interface PdfPropertyData {
  parcelId: string;
  owner: string[];
  address: string;
  zipCode?: string;
  firstName?: string;
  lastName?: string;
  date?: string;
  assessedValue: number;
  propertyTypeCode?: string;
  applicationNumber?: string; // For abatements: year + sequence number
  classCode?: string; // Property class code
  streetNumber?: string; // Street number portion of address
  streetName?: string; // Street name portion of address
}
