# Boston Property Lookup - Firebase Cloud Functions

Backend Firebase Cloud Functions for the Boston Property Lookup application. These functions provide APIs for fetching property data from EGIS, managing parcel ID/address pairings, and storing user feedback.

## Table of Contents
- [Overview](#overview)
- [Development Setup](#development-setup)
- [Function Types](#function-types)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Library Modules](#library-modules)
- [Data Types](#data-types)
- [Security](#security)
- [Deployment](#deployment)
- [Testing](#testing)

## Overview

This backend provides serverless functions that:
- Fetch property details from Boston's EGIS (Enterprise GIS) API
- Manage compressed parcel ID/address pairings for search functionality
- Store and retrieve user feedback in Firestore
- Generate static map images for properties
- Schedule yearly data updates

### Technology Stack
- **Firebase Functions v2** - Serverless compute
- **TypeScript** - Type-safe development
- **Firebase Admin SDK** - Backend Firebase integration
- **Google Cloud Secret Manager** - Secure API key storage
- **Pako** - Data compression/decompression

## Development Setup

### Prerequisites
- Node.js v20 or later
- Firebase CLI (`npm install -g firebase-tools`)
- Access to Firebase project
- Yarn package manager

### Installation

```bash
cd functions
yarn install
```

### Available Scripts

```bash
# Lint code
yarn lint

# Build TypeScript to JavaScript
yarn build

# Build and watch for changes
yarn build:watch

# Run functions locally with emulators
yarn serve

# Open functions shell for testing
yarn shell

# Deploy all functions to Firebase
yarn deploy

# View function logs
yarn logs
```

### Local Development

1. **Set up environment variables** (if needed for local testing)
2. **Start emulators:**
   ```bash
   yarn serve
   ```
3. **In another terminal, watch for changes:**
   ```bash
   yarn build:watch
   ```

## Function Types

### Callable Functions
Callable functions can be invoked directly from the client SDK with automatic authentication.

| Function | Description |
|----------|-------------|
| `fetchPropertyDetailsByParcelId` | Fetch complete property details by parcel ID |
| `fetchPropertySummariesByParcelIds` | Fetch property summaries for multiple parcels |
| `getCurrentParcelIdAddressPairings` | Get compressed parcel ID/address pairings for search |
| `storePropertyFeedback` | Store user feedback about properties |
| `generatePdf` | Generate pre-filled PDF forms for property tax applications |

### HTTPS Functions
HTTP endpoints that can be called via standard HTTP requests.

| Function | Description |
|----------|-------------|
| `generateAndStoreParcelIdAddressPairings` | Generate and store compressed search data |
| `downloadPdf` | Generate and download pre-filled PDF forms via direct HTTP GET |

### Scheduled Functions
Functions that run on a schedule using Cloud Scheduler.

| Function | Description | Schedule |
|----------|-------------|----------|
| `runYearlyParcelIdAddressPairingsUpdate` | Update parcel/address pairings | Yearly (configurable) |

## Project Structure

```
functions/
├── src/
│   ├── callable/                    # Callable cloud functions
│   │   ├── FetchPropertyDetailsByParcelId.ts
│   │   ├── FetchPropertySummariesByParcelIds.ts
│   │   ├── GetCurrentParcelIdAddressPairings.ts
│   │   ├── GeneratePdf.ts
│   │   └── StorePropertyFeedback.ts
│   ├── https/                       # HTTP endpoint functions
│   │   ├── GenerateAndStoreParcelIdAddressPairings.ts
│   │   └── DownloadPdf.ts
│   ├── scheduler/                   # Scheduled functions
│   │   └── RunYearlyParcelIdAddressPairingsUpdate.ts
│   ├── lib/                         # Shared library modules
│   │   ├── BarcodeGenerator.ts     # Barcode generation for PDFs
│   │   ├── EGISClient.ts           # EGIS API client
│   │   ├── FirestoreClient.ts      # Firestore operations
│   │   ├── FunctionsClient.ts      # Function utilities
│   │   ├── PdfFieldMapper.ts       # PDF field mapping
│   │   ├── PdfGenerator.ts         # PDF generation
│   │   ├── SequenceClient.ts       # Sequence number generation
│   │   └── StorageClient.ts        # Cloud Storage operations
│   ├── assets/
│   │   └── forms/                  # PDF form templates
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   ├── data-boston-key.json        # API key reference
│   └── index.ts                    # Function exports
├── dist/                           # Compiled JavaScript (generated)
├── package.json
└── tsconfig.json
```

## API Documentation

### `fetchPropertyDetailsByParcelId`

Fetches comprehensive property details for a single parcel ID.

**Request:**
```typescript
{
  parcelId: string;  // Required: Property parcel ID
  date?: string;     // Optional: Date in YYYY-MM-DD format
}
```

**Response:**
```typescript
{
  status: "success" | "error";
  message: string;
  data?: PropertyDetailsData;
}
```

**Features:**
- Fetches data from multiple EGIS data layers
- Generates/caches static map images
- Handles complex properties (condos, multi-building)
- Validates parcel ID format
- Historical property value data

**Security:**
- Validates parcel ID length (max 20 characters)
- Allows only alphanumeric and common separators
- Prevents injection attacks
- Validates date format

---

### `fetchPropertySummariesByParcelIds`

Fetches summary information for multiple properties (used in search results).

**Request:**
```typescript
{
  parcelIds: string[];  // Array of parcel IDs (max 50)
  date?: string;        // Optional: Date in YYYY-MM-DD format
}
```

**Response:**
```typescript
{
  status: "success" | "error";
  message: string;
  data?: {
    results: Array<{
      parcelId: string;
      address: string;
      owners: string[];
      value: number;
    }>;
  };
}
```

**Features:**
- Batch processing for efficiency
- Limited to 50 parcels per request
- Lightweight data for search results

---

### `getCurrentParcelIdAddressPairings`

Returns compressed parcel ID/address pairings for client-side search.

**Request:**
```typescript
{
  date?: string;  // Optional: Date in YYYY-MM-DD format
}
```

**Response:**
```typescript
{
  status: "success" | "error";
  message: string;
  data?: string;  // Compressed data (pako gzip)
}
```

**Features:**
- Data compressed with pako (gzip)
- Stored in Firestore
- Efficient client-side search
- Updated yearly via scheduler

---

### `storePropertyFeedback`

Stores user feedback about properties or the site.

**Request:**
```typescript
// Property-specific feedback
{
  type: 'property';
  parcelId: string;
  hasPositiveSentiment: boolean;
  feedbackMessage?: string;
}

// General site feedback
{
  type: 'general';
  issueType: 'not-found' | 'bug' | 'suggestion';
  searchQuery?: string;
  feedbackMessage?: string;
}
```

**Response:**
```typescript
{
  status: "success" | "error";
  message: string;
}
```

**Features:**
- Stores in Firestore with timestamp
- Supports property-specific and general feedback
- Input validation and sanitization

---

### `generatePdf`

Generates pre-filled PDF forms for property tax applications (residential exemption, personal exemption, or abatement).

**Request:**
```typescript
{
  parcelId: string;              // Required: Property parcel ID
  formType: 'residential' | 'personal' | 'abatement';  // Required
  date?: string;                 // Optional: Date in YYYY-MM-DD format (defaults to current date)
}
```

**Response:**
```typescript
{
  status: "success" | "error";
  message: string;
  data?: {
    pdfUrl: string;              // URL to view PDF inline
    pdfDownloadUrl: string;      // URL to download PDF
    formType: string;
    formSubtype?: 'short' | 'long';  // For abatement forms
    metadata: {
      parcelId: string;
      fiscalYear: number;
      cached: boolean;
    };
  };
}
```

**Features:**
- Auto-fills form fields with property data
- Generates unique application numbers for abatements
- Determines abatement form type (short/long) based on property type
- Caches generated PDFs for reuse
- Adds barcodes for tracking
- Uses current fiscal year based on date

**Security:**
- Validates parcel ID format
- Validates form type
- Rate limiting applied

---

### `generateAndStoreParcelIdAddressPairings` (HTTPS)

Generates and stores compressed parcel ID/address pairings for search functionality.

**Features:**
- HTTP endpoint (requires authentication)
- Fetches all properties from EGIS
- Compresses data with pako
- Stores in Firestore
- Called by scheduler or manually

---

### `downloadPdf` (HTTPS)

Generates and downloads pre-filled PDF forms via HTTP GET request. Similar to `generatePdf` but uses query parameters and triggers a direct download.

**URL Format:**
```
GET /downloadPdf?parcel_id=<PARCEL_ID>&form_type=<FORM_TYPE>
```

**Query Parameters:**
- `parcel_id` (required): Property parcel ID
- `form_type` (required): One of `residential`, `personal`, or `abatement`

**Response:**
- Returns PDF file directly with `Content-Disposition: attachment`
- Filename format: `{formType}-form-{parcelId}.pdf`
- Content-Type: `application/pdf`

**Features:**
- Uses current date automatically (no date parameter)
- Same PDF generation logic as `generatePdf`
- Returns PDF buffer directly instead of JSON
- Triggers browser download
- Public endpoint (no authentication required)
- Caches generated PDFs

**Example Usage:**
```bash
# Direct link in browser or curl
curl "https://your-project.cloudfunctions.net/downloadPdf?parcel_id=1234567890&form_type=residential" \
  --output residential-form.pdf
```

**Error Responses:**
- 400: Invalid or missing query parameters
- 404: Property not found
- 405: Method not allowed (only GET supported)
- 500: PDF generation failed

## Library Modules

### EGISClient (`lib/EGISClient.ts`)

Client for interacting with Boston's EGIS (Enterprise GIS) ArcGIS REST API.

**Key Functions:**
- `fetchPropertyDetailsByParcelIdHelper(parcelId, date)` - Fetch full property details
- `fetchPropertySummariesByParcelIdsHelper(parcelIds, date)` - Fetch property summaries
- `generatePropertyStaticMapImageFromGeometryHelper(geometry, parcelId)` - Generate map images
- `getFiscalYearAndQuarter(date)` - Calculate fiscal year/quarter

**Data Layers:**
- Layer 0: Geometric data (property boundaries)
- Layer 5: Value history
- Layer 6: Residential property attributes
- Layer 7: Current owners
- Layer 8: Properties web app data
- Layer 9: Condo attributes
- Layer 10: Outbuildings

---

### FirestoreClient (`lib/FirestoreClient.ts`)

Wrapper for Firestore operations.

**Key Functions:**
- `getDocument(collection, docId)` - Get a document
- `setDocument(collection, docId, data)` - Set a document
- `addDocument(collection, data)` - Add a document
- `updateDocument(collection, docId, data)` - Update a document
- `deleteDocument(collection, docId)` - Delete a document

---

### StorageClient (`lib/StorageClient.ts`)

Handles Cloud Storage operations for static map images.

**Key Functions:**
- `isStaticMapImageCached(parcelId)` - Check if map image exists
- `storeStaticMapImage(parcelId, imageBuffer)` - Store map image
- `getStaticMapImageUrl(parcelId)` - Get public URL for map image

**Features:**
- Caches static map images
- Generates signed URLs
- Bucket: Property map images

---

### FunctionsClient (`lib/FunctionsClient.ts`)

Utilities for creating cloud functions with consistent error handling.

**Key Functions:**
- `createCallable(handler)` - Create a callable function wrapper
- `createSuccessResponse(message, data)` - Standard success response
- `createErrorResponse(message)` - Standard error response

**Features:**
- Consistent error handling
- Standardized response format
- Logging

## Data Types

### PropertyDetailsData

Comprehensive property information including:
- **Overview**: Address, owners, assessed value, property type, exemptions
- **Property Value**: Historical assessment values by year
- **Property Attributes**: Building details, construction info, utilities
- **Property Taxes**: Tax calculations, exemptions, billing info

### PropertySearchResult

Lightweight property summary for search results:
- `parcelId` - Property identifier
- `address` - Full address string
- `owners` - Array of owner names
- `value` - Assessed property value

### FeedbackData

User feedback types:
- **PropertyFeedbackData**: Feedback about a specific property
- **GeneralFeedbackData**: General site feedback (bugs, suggestions, not found)

See [`src/types/index.ts`](src/types/index.ts) for complete type definitions.

## Security

### Input Validation

All functions implement robust input validation:
- **Parcel ID validation**: Length limits, allowed characters, injection prevention
- **Date validation**: Format checking (YYYY-MM-DD)
- **Array limits**: Max 50 items for batch operations
- **String sanitization**: Remove potentially harmful characters

### Authentication

- Callable functions automatically validate Firebase Auth tokens
- HTTPS endpoints should be protected (implement auth as needed)
- Scheduler functions run with service account permissions

### API Keys

- EGIS API keys stored in Google Cloud Secret Manager
- Never committed to version control
- Accessed via `data-boston-key.json` reference

### CORS

- Callable functions: Handled automatically by Firebase
- HTTPS functions: Configure CORS as needed

## Deployment

### Prerequisites

1. Firebase project set up
2. Firebase CLI authenticated: `firebase login`
3. Project selected: `firebase use <project-id>`

### Deploy All Functions

```bash
yarn deploy
```

### Deploy Specific Function

```bash
firebase deploy --only functions:fetchPropertyDetailsByParcelId
```

### Deploy Multiple Functions

```bash
firebase deploy --only functions:fetchPropertyDetailsByParcelId,functions:storePropertyFeedback
```

### Environment Configuration

Functions automatically use the Firebase project's configuration. For secrets:

1. Store in Google Cloud Secret Manager
2. Reference in code via Secret Manager API
3. Grant functions service account access

### Performance Optimization

- **Memory allocation**: Configure per function based on needs
- **Timeout**: Set appropriate timeouts for long-running operations
- **Cold start**: Consider keeping critical functions warm
- **Caching**: Use Firestore and Cloud Storage for caching

## Testing

### Local Testing with Emulators

```bash
# Start emulators
yarn serve

# Test callable functions
curl http://localhost:5001/<project-id>/us-central1/fetchPropertyDetailsByParcelId \
  -H "Content-Type: application/json" \
  -d '{"data": {"parcelId": "1234567890"}}'
```

### Unit Testing

(To be implemented)
```bash
yarn test
```

### Manual Testing

Use the Firebase Functions shell:
```bash
yarn shell
```

Then call functions directly:
```javascript
fetchPropertyDetailsByParcelId({parcelId: "1234567890"})
```

## Monitoring & Logs

### View Logs

```bash
# All function logs
yarn logs

# Specific function logs
firebase functions:log --only fetchPropertyDetailsByParcelId

# Follow logs in real-time
firebase functions:log --only fetchPropertyDetailsByParcelId --follow
```

### Firebase Console

View logs, metrics, and errors in the [Firebase Console](https://console.firebase.google.com/):
- Functions → Logs tab
- Functions → Usage tab
- Functions → Health tab

## Development Best Practices

1. **Type Safety**: Use TypeScript types for all function parameters and return values
2. **Error Handling**: Always use try-catch and return standardized responses
3. **Validation**: Validate all inputs before processing
4. **Logging**: Log important operations and errors
5. **Documentation**: Document function purpose, parameters, and return values
6. **Testing**: Test locally with emulators before deploying
7. **Security**: Never expose sensitive data or API keys
8. **Performance**: Monitor function execution time and optimize as needed

## Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clean and rebuild
rm -rf dist/
yarn build
```

**Deploy Fails**
```bash
# Check Firebase CLI version
firebase --version

# Update Firebase CLI
npm install -g firebase-tools@latest

# Check project permissions
firebase projects:list
```

**Function Timeout**
- Increase timeout in function configuration
- Optimize queries and external API calls
- Consider breaking into smaller functions

**Cold Starts**
- Use Gen 2 functions for better performance
- Consider min instances for critical functions
- Optimize imports and dependencies

## Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [EGIS API Documentation](https://gisportal.boston.gov/arcgis/rest/services)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## Contributing

When adding new functions:
1. Create function file in appropriate directory (`callable/`, `https/`, `scheduler/`)
2. Export function from `index.ts`
3. Add comprehensive input validation
4. Use standardized response format
5. Document API in this README
6. Test locally before deploying

