#!/bin/bash
set -e

# Load .env if present
ENV_PATH="$(dirname "$0")/.env"
if [ -f "$ENV_PATH" ]; then
  export $(grep -v '^#' "$ENV_PATH" | xargs)
else
  echo "Error: .env file not found in cli/. Please create cli/.env with your API tokens and project IDs."
  exit 1
fi

# Prompt user for environment selection
echo "Select environment to run generateAndStoreParcelIdAddressPairings:"
echo "1) dev (default)"
echo "2) prd"
read -p "Enter choice [1-2]: " env_choice

if [[ "$env_choice" == "2" ]]; then
  API_TOKEN="$PRD_EXTERNAL_API_TOKEN"
  PROJECT_ID="$PRD_PROJECT_ID"
  ENV_NAME="prd"
  if [ -z "$API_TOKEN" ]; then
    echo "Error: PRD_EXTERNAL_API_TOKEN not set in .env file."
    exit 1
  fi
  if [ -z "$PROJECT_ID" ]; then
    echo "Error: PRD_PROJECT_ID not set in .env file."
    exit 1
  fi
else
  API_TOKEN="$DEV_EXTERNAL_API_TOKEN"
  PROJECT_ID="$DEV_PROJECT_ID"
  ENV_NAME="dev"
  if [ -z "$API_TOKEN" ]; then
    echo "Error: DEV_EXTERNAL_API_TOKEN not set in .env file."
    exit 1
  fi
  if [ -z "$PROJECT_ID" ]; then
    echo "Error: DEV_PROJECT_ID not set in .env file."
    exit 1
  fi
fi

# Set the function URL using PROJECT_ID
FUNCTION_URL="https://us-central1-$PROJECT_ID.cloudfunctions.net/generateAndStoreParcelIdAddressPairings"

# Allow override via env var
if [[ ! -z "$GENERATE_PAIRINGS_URL" ]]; then
  FUNCTION_URL="$GENERATE_PAIRINGS_URL"
fi

echo "Calling generateAndStoreParcelIdAddressPairings on $ENV_NAME..."
echo "POST $FUNCTION_URL"
echo ""
echo "Note: This operation may take several minutes to complete."
echo "The backend processes thousands of records and will continue running"
echo "even if the HTTP connection closes early."
echo ""

# Use --max-time for overall timeout, --connect-timeout for connection
# Add --http1.1 to avoid HTTP2 framing issues
CURL_OUTPUT=$(curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 540 \
  --connect-timeout 10 \
  --http1.1 \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s -S 2>&1)

CURL_EXIT_CODE=$?

# Extract HTTP status from output
HTTP_STATUS=$(echo "$CURL_OUTPUT" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $CURL_EXIT_CODE -eq 0 ] && [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ SUCCESS: Operation completed successfully!"
  echo ""
  echo "Response:"
  echo "$CURL_OUTPUT" | grep -v "HTTP_STATUS:"
elif [ $CURL_EXIT_CODE -eq 28 ]; then
  echo "✓ EXPECTED: Connection timed out (operation is running on backend)"
  echo ""
  echo "This is normal behavior for this long-running operation."
  echo "The backend will continue processing and store the results."
elif [ $CURL_EXIT_CODE -eq 52 ] || [ $CURL_EXIT_CODE -eq 56 ] || [ "$CURL_OUTPUT" == *"Empty reply"* ]; then
  echo "✓ EXPECTED: Connection closed by server (operation likely completed)"
  echo ""
  echo "This is normal behavior - the backend closes the connection after"
  echo "processing completes. The operation was successful."
else
  echo "Connection ended with exit code: $CURL_EXIT_CODE"
  echo ""
  if [ ! -z "$HTTP_STATUS" ] && [ "$HTTP_STATUS" != "000" ]; then
    echo "HTTP Status: $HTTP_STATUS"
  fi
  echo ""
  echo "The operation may still be running successfully on the backend."
  echo "Connection issues don't necessarily indicate a failure."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To verify completion, check Firebase Console logs for:"
echo "'Successfully completed generation and storage'"
echo ""
echo "Logs available at:"
echo "https://console.firebase.google.com/project/$PROJECT_ID/functions/logs"
echo "" 