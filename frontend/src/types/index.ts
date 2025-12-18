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
    totalBathrooms?: string;
    halfBathrooms?: string;
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
    salePrice?: string;
    saleDate?: string;
    registryBookAndPlace?: string;

    // Property Taxes fields
    propertyGrossTax: number;
    residentialExemptionAmount: number;
    personalExemptionAmount: number;
    communityPreservationAmount: number;
    personalExemptionAmount1: number;
    personalExemptionAmount2: number;
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
      parcelId: data.parcelId,
      netTax: data.propertyNetTax,
      totalBilledAmount: data.totalBilledAmount,
      personalExemptionFlag: data.personalExemptionFlag,
      residentialExemptionFlag: data.residentialExemptionFlag,
      personalExemptionAmount: data.personalExemptionAmount,
      residentialExemptionAmount: data.residentialExemptionAmount
    };

    // Construct property value section
    this.propertyValue = {
      historicPropertyValues: data.historicPropertyValues,
    };

    // Construct property attributes section

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
            {label: "Condition", value: building.condition}
          ].filter(field => field.value)
        }))
      }] : []),
      {
        title: "Last Transaction",
        content: [
          {label: "Sale Price", value: data.salePrice ? `$${data.salePrice}` : undefined},
          {label: "Sale Date", value: data.saleDate},
          {label: "Registry Book & Place", value: data.registryBookAndPlace}
        ]
      }
    ];

    this.propertyAttributes = {
      attributeGroups: data.buildingAttributes ? [
        // Map each building to its own group
        ...data.buildingAttributes.map(building => ({
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
                {label: "Orientation", value: building.orientation}
              ].filter(field => field.value)
            },
            {
              title: "Rooms",
              content: [
                {label: "Number of Bedrooms", value: building.bedroomNumber},
                {label: "Total Bathrooms", value: building.totalBathrooms},
                {label: "Half Bathrooms", value: building.halfBathrooms},
                {label: "Bath Style 1", value: building.bathStyle1},
                {label: "Bath Style 2", value: building.bathStyle2},
                {label: "Bath Style 3", value: building.bathStyle3},
                {label: "Number of Kitchens", value: building.numberOfKitchens},
                {label: "Kitchen Type", value: building.kitchenType},
                {label: "Kitchen Style 1", value: building.kitchenStyle1},
                {label: "Kitchen Style 2", value: building.kitchenStyle2},
                {label: "Kitchen Style 3", value: building.kitchenStyle3}
              ].filter(field => field.value)
            },
            {
              title: "Construction",
              content: [
                {label: "Year Built", value: building.yearBuilt},
                {label: "Exterior Finish", value: building.exteriorFinish},
                {label: "Exterior Condition", value: building.exteriorCondition},
                {label: "Roof Cover", value: building.roofCover},
                {label: "Roof Structure", value: building.roofStructure},
                {label: "Foundation", value: building.foundation},
                {label: "Parking Spots", value: building.parkingSpots}
              ].filter(field => field.value)
            },
            {
              title: "Utilities",
              content: [
                {label: "Heat Type", value: building.heatType},
                {label: "AC Type", value: building.acType},
                {label: "Fireplaces", value: building.fireplaces}
              ].filter(field => field.value)
            }
          ]
          })),
        ...commonSections
      ] : data.hasComplexCondoData ? [  // Condo case
        {
          title: "Condo Main Attributes",
          content: [
            {label: "Master Parcel ID", value: data.masterParcelId},
            {label: "Grade", value: data.grade},
            {label: "Exterior Condition", value: data.exteriorCondition},
            {label: "Exterior Finish", value: data.exteriorFinish},
            {label: "Foundation", value: data.foundation},
            {label: "Roof Cover", value: data.roofCover},
            {label: "Roof Structure", value: data.roofStructure}
          ].filter((attr) => attr.value)
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
                {label: "Orientation", value: data.orientation}
              ]
            },
            {
              title: "Rooms",
              content: [
                {label: "Number of Bedrooms", value: data.bedroomNumber},
                {label: "Total Bathrooms", value: data.totalBathrooms},
                {label: "Half Bathrooms", value: data.halfBathrooms},
                {label: "Bath Style 1", value: data.bathStyle1},
                {label: "Bath Style 2", value: data.bathStyle2},
                {label: "Bath Style 3", value: data.bathStyle3},
                {label: "Number of Kitchens", value: data.numberOfKitchens},
                {label: "Kitchen Type", value: data.kitchenType},
                {label: "Kitchen Style 1", value: data.kitchenStyle1},
                {label: "Kitchen Style 2", value: data.kitchenStyle2},
                {label: "Kitchen Style 3", value: data.kitchenStyle3}
              ]
            },
            {
              title: "Construction",
              content: [
                {label: "Year Built", value: data.yearBuilt},
                {label: "Parking Spots", value: data.parkingSpots}
              ]
            },
            {
              title: "Utilities",
              content: [
                {label: "Heat Type", value: data.heatType},
                {label: "AC Type", value: data.acType},
                {label: "Fireplaces", value: data.fireplaces}
              ]
            }
          ]
        },
        ...commonSections
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
            {label: "Orientation", value: data.orientation}
          ]
        },
        {
          title: "Rooms",
          content: [
            {label: "Number of Bedrooms", value: data.bedroomNumber},
            {label: "Total Bathrooms", value: data.totalBathrooms},
            {label: "Half Bathrooms", value: data.halfBathrooms},
            {label: "Bath Style 1", value: data.bathStyle1},
            {label: "Bath Style 2", value: data.bathStyle2},
            {label: "Bath Style 3", value: data.bathStyle3},
            {label: "Number of Kitchens", value: data.numberOfKitchens},
            {label: "Kitchen Type", value: data.kitchenType},
            {label: "Kitchen Style 1", value: data.kitchenStyle1},
            {label: "Kitchen Style 2", value: data.kitchenStyle2},
            {label: "Kitchen Style 3", value: data.kitchenStyle3}
          ]
        },
        {
          title: "Construction",
          content: [
            {label: "Year Built", value: data.yearBuilt},
            {label: "Exterior Finish", value: data.exteriorFinish},
            {label: "Exterior Condition", value: data.exteriorCondition},
            {label: "Roof Cover", value: data.roofCover},
            {label: "Roof Structure", value: data.roofStructure},
            {label: "Foundation", value: data.foundation},
            {label: "Parking Spots", value: data.parkingSpots}
          ]
        },
        {
          title: "Utilities",
          content: [
            {label: "Heat Type", value: data.heatType},
            {label: "AC Type", value: data.acType},
            {label: "Fireplaces", value: data.fireplaces}
          ]
        },
        ...commonSections
      ]
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
      totalBilledAmount: data.totalBilledAmount
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
  type: 'property';
  parcelId: string;
  hasPositiveSentiment: boolean;
}

// General site feedback (new ComplexFeedbackSender)
export interface GeneralFeedbackData extends BaseFeedbackData {
  type: 'general';
  issueType: 'not-found' | 'bug' | 'suggestion';
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

export type PdfFormType = "residential" | "personal" | "abatement";

export interface PdfGenerationRequest {
  parcelId: string;
  formType: PdfFormType;
  date?: string;
}

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