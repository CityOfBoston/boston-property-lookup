# CLI Tools

Command-line utilities for managing the Boston Property Lookup application.

## Overview

This directory contains shell scripts for administrative tasks that need to be run manually or outside of normal automated workflows.

## Scripts

### `generate_and_store_pairings.sh`

Manually triggers the Firebase Cloud Function that generates and stores compressed parcel ID/address pairings for the search functionality.

#### Purpose

This script calls the `generateAndStoreParcelIdAddressPairings` HTTPS cloud function, which:
1. Fetches all property records from the EGIS API
2. Extracts parcel IDs and addresses
3. Compresses the data using pako (gzip)
4. Stores the compressed data in Firestore

This data is used by the frontend for client-side fuzzy search functionality.

#### When to Use

- **Initial Setup**: When setting up a new environment for the first time
- **Data Updates**: After significant property data changes in EGIS
- **Manual Refresh**: When the scheduled update fails or needs to be run outside the normal schedule
- **Testing**: To test the pairings generation process

> **Note**: Under normal operation, this runs automatically on a yearly schedule via `runYearlyParcelIdAddressPairingsUpdate` cloud function. Manual runs are typically only needed for setup or troubleshooting.

---

### `export_feedback.sh`

Exports all feedback data from Firestore to a CSV file for analysis and reporting.

#### Purpose

This script calls the `exportFeedback` HTTPS cloud function, which:
1. Fetches all feedback records from the Firestore `feedback` collection
2. Converts the data to CSV format with all columns
3. Uploads the CSV to Cloud Storage
4. Returns a signed download URL
5. Downloads the CSV file locally

The exported CSV includes all feedback fields:
- Document ID
- Feedback type (property/general)
- Timestamps
- Property-specific fields (parcelId, sentiment)
- General feedback fields (issueType, searchQuery)
- User messages

**CSV Features**:
- Human-readable column headers (e.g., "Submission Date" instead of "createdAt")
- Values formatted for easy reading ("Yes"/"No" for booleans, full descriptions for categories)
- Proper escaping for special characters
- Logical column ordering

#### When to Use

- **Weekly/Monthly Reports**: Export feedback for regular analysis
- **Data Analysis**: Download data for external processing
- **Issue Tracking**: Review user-reported bugs and suggestions
- **Product Insights**: Analyze user sentiment and feedback trends
- **Backup**: Create periodic backups of feedback data

#### Usage

```bash
cd cli
./export_feedback.sh
```

The script will:
1. Prompt for environment selection (dev/prd)
2. Call the export endpoint
3. Automatically download the CSV
4. Save it as `feedback-export-{env}-{timestamp}.csv`

#### Example Output

```bash
$ ./export_feedback.sh
Select environment to export feedback from:
1) dev (default)
2) prd
Enter choice [1-2]: 1

✓ SUCCESS: Export completed successfully!

Exported 42 feedback record(s)

Downloading CSV to: feedback-export-dev-2025-01-06_14-30-00.csv

✓ Downloaded successfully!
  File: feedback-export-dev-2025-01-06_14-30-00.csv
  Size: 8234 bytes
```

## Setup

### Prerequisites

- **curl** - Command-line HTTP client (usually pre-installed on macOS/Linux)
- **bash** - Shell interpreter
- **Firebase Access** - API tokens for dev and/or production environments

### Environment Configuration

1. **Create `.env` file** in the `cli/` directory:

```bash
cd cli
touch .env
```

2. **Add environment variables** to `.env`:

```bash
# Development Environment
DEV_PROJECT_ID=your-dev-project-id
DEV_EXTERNAL_API_TOKEN=your-dev-api-token

# Production Environment
PRD_PROJECT_ID=your-prod-project-id
PRD_EXTERNAL_API_TOKEN=your-prod-api-token
```

3. **Keep `.env` secure**:
   - The `.env` file is gitignored and should never be committed
   - Store tokens securely (e.g., password manager)
   - Rotate tokens regularly
   - Use different tokens for dev and production

### Getting API Tokens

To obtain Firebase API tokens for authenticated function calls:

#### Option 1: Using Firebase CLI (Recommended)
```bash
firebase login
firebase projects:list
firebase functions:config:get
```

#### Option 2: Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Generate a new private key
5. Use the token from the service account

#### Option 3: OAuth Token
```bash
firebase login:ci
```
This generates a CI token you can use for authentication.

## Usage

### Run the Script

```bash
cd cli
./generate_and_store_pairings.sh
```

### Interactive Environment Selection

The script will prompt you to select an environment:

```
Select environment to run generateAndStoreParcelIdAddressPairings:
1) dev (default)
2) prd
Enter choice [1-2]:
```

- **Option 1 (dev)**: Runs against development environment
- **Option 2 (prd)**: Runs against production environment

### Example Output

```bash
$ ./generate_and_store_pairings.sh
Select environment to run generateAndStoreParcelIdAddressPairings:
1) dev (default)
2) prd
Enter choice [1-2]: 1
Calling generateAndStoreParcelIdAddressPairings on dev...
POST https://us-central1-dev-project-id.cloudfunctions.net/generateAndStoreParcelIdAddressPairings
{"status":"success","message":"Parcel pairings generated and stored successfully"}
```

### Advanced Usage

#### Override Function URL

You can override the function URL using an environment variable:

```bash
export GENERATE_PAIRINGS_URL="https://custom-url.cloudfunctions.net/generateAndStoreParcelIdAddressPairings"
./generate_and_store_pairings.sh
```

This is useful for:
- Testing against a custom deployment
- Using a different region
- Local emulator testing

#### Run Without Interaction

To run non-interactively (e.g., in automation):

```bash
# Run against dev (default)
echo "1" | ./generate_and_store_pairings.sh

# Run against production
echo "2" | ./generate_and_store_pairings.sh
```

## Troubleshooting

### Error: .env file not found

**Problem**: The script can't find the `.env` file.

**Solution**: Create `.env` in the `cli/` directory with required variables:
```bash
cd cli
touch .env
# Add your tokens and project IDs
```

---

### Error: DEV_EXTERNAL_API_TOKEN not set

**Problem**: The `.env` file exists but is missing required variables.

**Solution**: Add the missing environment variable to `.env`:
```bash
DEV_EXTERNAL_API_TOKEN=your-token-here
```

---

### Error: 401 Unauthorized

**Problem**: The API token is invalid or expired.

**Solutions**:
- Verify the token in `.env` is correct
- Generate a new token using `firebase login:ci`
- Check that the token has the correct permissions
- Ensure you're using the right token for the environment

---

### Error: 403 Forbidden

**Problem**: The token doesn't have permission to call the function.

**Solutions**:
- Verify the service account has the correct IAM roles
- Check function deployment permissions
- Ensure the function allows authenticated calls

---

### Error: 404 Not Found

**Problem**: The function doesn't exist or the URL is incorrect.

**Solutions**:
- Verify the `PROJECT_ID` in `.env` is correct
- Check that the function is deployed: `firebase functions:list`
- Confirm the function name matches: `generateAndStoreParcelIdAddressPairings`
- Verify the region is correct (default: `us-central1`)

---

### Function Times Out

**Problem**: The function takes too long and times out.

**Solutions**:
- Check function logs: `firebase functions:log`
- Verify EGIS API is responding
- Increase function timeout in Firebase config
- Check for rate limiting on EGIS API

---

### Network Error / Connection Refused

**Problem**: Can't reach the function endpoint.

**Solutions**:
- Check your internet connection
- Verify the function URL is correct
- Ensure the function is deployed and running
- Check for firewall or proxy issues

## Script Details

### How It Works

1. **Load Environment**: Sources variables from `cli/.env`
2. **Validate Configuration**: Ensures required tokens and project IDs are set
3. **Prompt User**: Asks which environment to target (dev/prd)
4. **Build URL**: Constructs the function URL from project ID
5. **Make Request**: Sends POST request with authorization header
6. **Return Response**: Displays the function's response

### Security Features

- **Bearer Token Authentication**: Uses secure token-based auth
- **Environment Isolation**: Separate tokens for dev/prod
- **Error Handling**: Exits on missing configuration
- **HTTPS Only**: All requests over secure connection

### Script Configuration

The script respects the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DEV_PROJECT_ID` | Firebase project ID for dev | For dev |
| `DEV_EXTERNAL_API_TOKEN` | API token for dev | For dev |
| `PRD_PROJECT_ID` | Firebase project ID for production | For prod |
| `PRD_EXTERNAL_API_TOKEN` | API token for production | For prod |
| `GENERATE_PAIRINGS_URL` | Override function URL for pairings | Optional |
| `EXPORT_FEEDBACK_URL` | Override function URL for feedback export | Optional |

## Best Practices

### Security

1. **Never commit `.env`**: Always keep tokens out of version control
2. **Use environment-specific tokens**: Different tokens for dev/prod
3. **Rotate tokens regularly**: Update tokens periodically
4. **Limit token scope**: Use tokens with minimal required permissions
5. **Audit token usage**: Monitor and log when tokens are used

### Operations

1. **Test in dev first**: Always test against dev before production
2. **Check function logs**: Review logs after running the script
3. **Verify data**: Confirm pairings are stored correctly in Firestore
4. **Monitor performance**: Track execution time and resource usage
5. **Schedule wisely**: Run during off-peak hours for production

### Maintenance

1. **Keep tokens updated**: Refresh expired tokens promptly
2. **Update project IDs**: Keep `.env` in sync with Firebase projects
3. **Document changes**: Note when and why manual runs are needed
4. **Version control**: Keep scripts in sync with function implementations

## Integration with Firebase Functions

This script calls the [`generateAndStoreParcelIdAddressPairings`](../functions/src/https/GenerateAndStoreParcelIdAddressPairings.ts) HTTPS cloud function.

### Related Functions

- **Manual Trigger (Pairings)**: `generate_and_store_pairings.sh`
- **Scheduled Trigger**: `runYearlyParcelIdAddressPairingsUpdate` (Cloud Scheduler)
- **Data Consumer**: `getCurrentParcelIdAddressPairings` (callable function)
- **Manual Trigger (Feedback)**: `export_feedback.sh`

### Data Flow

```
CLI Script
    ↓
generateAndStoreParcelIdAddressPairings (HTTPS Function)
    ↓
Fetch all properties from EGIS API
    ↓
Compress with pako (gzip)
    ↓
Store in Firestore
    ↓
getCurrentParcelIdAddressPairings (called by frontend)
    ↓
Frontend uses for search autocomplete
```

## Example `.env` Template

Create your `.env` file based on this template:

```bash
# Development Environment
DEV_PROJECT_ID=assessing-dev-12345
DEV_EXTERNAL_API_TOKEN=ya29.xxx...

# Production Environment  
PRD_PROJECT_ID=assessing-prod-67890
PRD_EXTERNAL_API_TOKEN=ya29.yyy...

# Optional: Override function URL
# GENERATE_PAIRINGS_URL=https://custom-url.cloudfunctions.net/generateAndStoreParcelIdAddressPairings
```

## Additional Resources

- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [curl Documentation](https://curl.se/docs/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Firebase function logs
3. Verify `.env` configuration
4. Check EGIS API status

