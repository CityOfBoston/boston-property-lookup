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

