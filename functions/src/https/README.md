# HTTPS Functions

This directory contains HTTP endpoint functions that can be called via standard HTTP requests.

## Available Functions

### 1. `generateAndStoreParcelIdAddressPairings`

**Purpose:** Generates and stores compressed parcel ID/address pairings for search functionality.

**Endpoint:** `POST /generateAndStoreParcelIdAddressPairings`

**Access Level:** Internal (requires API key authentication)

**Usage:**
```bash
curl -X POST "https://your-project.cloudfunctions.net/generateAndStoreParcelIdAddressPairings" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Features:**
- Fetches all properties from EGIS API
- Compresses data with gzip
- Stores in Cloud Storage
- Called by scheduler or manually
- Long-running operation (batch operation)

---

### 2. `downloadPdf`

**Purpose:** Generates and downloads pre-filled PDF forms for property tax applications.

**Endpoint:** `GET /downloadPdf`

**Access Level:** Public (no authentication required)

**Query Parameters:**
- `parcel_id` (required): Property parcel ID (max 20 characters, alphanumeric + `-_.`)
- `form_type` (required): One of `residential`, `personal`, or `abatement`

**Usage Examples:**

#### Browser
Simply navigate to:
```
https://your-project.cloudfunctions.net/downloadPdf?parcel_id=0501234000&form_type=residential
```

#### cURL
```bash
# Download residential exemption form
curl "https://your-project.cloudfunctions.net/downloadPdf?parcel_id=0501234000&form_type=residential" \
  --output residential-form.pdf

# Download personal exemption form
curl "https://your-project.cloudfunctions.net/downloadPdf?parcel_id=0501234000&form_type=personal" \
  --output personal-form.pdf

# Download abatement form (automatically determines short/long form)
curl "https://your-project.cloudfunctions.net/downloadPdf?parcel_id=0501234000&form_type=abatement" \
  --output abatement-form.pdf
```

#### JavaScript/Fetch
```javascript
// Direct download link
const downloadLink = document.createElement('a');
downloadLink.href = `https://your-project.cloudfunctions.net/downloadPdf?parcel_id=${parcelId}&form_type=residential`;
downloadLink.download = 'residential-form.pdf';
downloadLink.click();

// Or fetch and handle
fetch(`https://your-project.cloudfunctions.net/downloadPdf?parcel_id=${parcelId}&form_type=residential`)
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'residential-form.pdf';
    a.click();
  });
```

**Response:**

Success (200):
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="residential-form-0501234000.pdf"`
- Body: PDF binary data

Error Responses:
- 400: Invalid or missing query parameters
- 404: Property not found for the given parcel_id
- 405: Method not allowed (only GET supported)
- 500: PDF generation failed

**Features:**
- **Automatic Date:** Uses current date automatically (no date parameter needed)
- **Smart Form Selection:** For abatements, automatically determines short vs long form based on property type
- **Auto-fill:** Pre-fills form fields with property data from EGIS
- **Caching:** Generated PDFs are cached for reuse
- **Barcode:** Includes tracking barcode on forms
- **Sequence Numbers:** Abatement forms get unique application numbers
- **Current Fiscal Year:** Uses current fiscal year based on today's date

**Implementation Details:**

The function follows these steps:
1. Validates query parameters (parcel_id and form_type)
2. Fetches property details from EGIS API
3. Checks if PDF is already cached
4. If cached: retrieves from cache
5. If not cached:
   - Parses property data (address, owner, values)
   - Generates sequence number (for abatements)
   - Determines specific form type (short/long for abatements)
   - Generates barcode
   - Fills PDF template with property data
   - Caches the generated PDF
6. Returns PDF buffer with download headers

**Comparison with `generatePdf` callable function:**

| Feature | `downloadPdf` (HTTPS) | `generatePdf` (Callable) |
|---------|----------------------|--------------------------|
| Access | HTTP GET, Public | Firebase Callable, Authenticated |
| Date | Current date only | Can specify date parameter |
| Response | PDF binary | JSON with URLs |
| Use Case | Direct download links | Programmatic access with metadata |
| Authentication | None | Firebase Auth |
| Rate Limiting | Via FunctionsClient | Via FunctionsClient |

**Security Considerations:**
- Public endpoint (no authentication)
- Input validation: parcel_id length (max 20), allowed characters
- Rate limiting applied via FunctionsClient
- Prevents injection attacks through validation

**Caching:**
- Generated PDFs are stored in Cloud Storage
- Cache key: `generated-pdfs/{fiscalYear}/{parcelId}/{formType}.pdf`
- Cached PDFs are reused for identical requests
- Cache is fiscal-year specific (new PDFs generated each fiscal year)

---

### 3. `exportFeedback`

**Purpose:** Exports all feedback data from Firestore to a CSV file for analysis and reporting.

**Endpoint:** `POST /exportFeedback`

**Access Level:** Internal (requires API key authentication)

**Usage:**
```bash
curl -X POST "https://your-project.cloudfunctions.net/exportFeedback" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Request Body:** Empty JSON object `{}`

**Response:**

Success (200):
```json
{
  "status": "success",
  "message": "Feedback data exported successfully",
  "data": {
    "recordCount": 42,
    "downloadUrl": "https://storage.googleapis.com/...",
    "timestamp": "2025-01-06T19:30:00.000Z"
  }
}
```

No Data (200):
```json
{
  "status": "success",
  "message": "No feedback data available to export",
  "data": {
    "recordCount": 0,
    "downloadUrl": null,
    "timestamp": "2025-01-06T19:30:00.000Z"
  }
}
```

Error (500):
```json
{
  "status": "error",
  "message": "Failed to export feedback data",
  "data": null
}
```

**Features:**
- Exports all feedback records from Firestore
- Includes all possible columns (document ID, type, timestamps, all fields)
- Converts to CSV format with proper escaping
- Uploads to Cloud Storage with timestamp
- Returns signed download URL (valid for 1 hour)
- Handles both property and general feedback types

**CSV Format:**

The exported CSV uses human-readable column headers for easy analysis:

| Column Header | Technical Field | Description | Values |
|--------------|----------------|-------------|---------|
| Feedback ID | `id` | Firestore document ID | Unique identifier |
| Feedback Type | `type` | Type of feedback | "Property Feedback" or "General Feedback" |
| Submission Date | `createdAt` | When feedback was submitted | ISO 8601 timestamp |
| Issue Category | `issueType` | Type of issue (general feedback only) | "Property Not Found", "Bug Report", or "Feature Suggestion" |
| Property Parcel ID | `parcelId` | Property identifier (property feedback only) | Parcel ID string |
| Positive Feedback | `hasPositiveSentiment` | User sentiment (property feedback only) | "Yes" or "No" |
| Search Query | `searchQuery` | Search term used (general feedback from search) | Text string |
| User Message | `feedbackMessage` | Optional user comment | Text string |

**Features:**
- Column headers are in plain English (e.g., "Submission Date" instead of "createdAt")
- Boolean values are formatted as "Yes"/"No" instead of true/false
- Categorical values are expanded (e.g., "Bug Report" instead of "bug")
- Columns are ordered logically (ID, type, date, then specific fields)
- All text properly escaped for CSV format

**Implementation Details:**

The function follows these steps:
1. Validates HTTP method (POST only)
2. Fetches all documents from Firestore `feedback` collection
3. Converts Firestore Timestamps to ISO strings
4. Collects all unique column names from all records
5. Converts to CSV with proper escaping for commas, quotes, newlines
6. Uploads CSV to Cloud Storage with timestamped filename
7. Generates signed download URL (1 hour expiration)
8. Returns URL and metadata in response

**Security:**
- Internal endpoint (requires API key)
- Rate limiting applied via FunctionsClient
- Signed URLs expire after 1 hour
- Only accessible with valid authentication token

**CLI Integration:**

Use the `export_feedback.sh` CLI script for easy access:
```bash
cd cli
./export_feedback.sh
```

The script automatically:
- Calls the endpoint with proper authentication
- Parses the JSON response
- Downloads the CSV file
- Saves with environment and timestamp in filename

**Storage:**
- Bucket: `FEEDBACK_EXPORT_BUCKET` environment variable
- Filename format: `feedback-export-{ISO_timestamp}.csv`
- Content-Type: `text/csv`
- Disposition: `attachment` (triggers download)
- Metadata includes record count and export timestamp

