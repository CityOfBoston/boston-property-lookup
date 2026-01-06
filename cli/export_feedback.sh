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
echo "Select environment to export feedback from:"
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
FUNCTION_URL="https://us-central1-$PROJECT_ID.cloudfunctions.net/exportFeedback"

# Allow override via env var
if [[ ! -z "$EXPORT_FEEDBACK_URL" ]]; then
  FUNCTION_URL="$EXPORT_FEEDBACK_URL"
fi

echo "Calling exportFeedback on $ENV_NAME..."
echo "POST $FUNCTION_URL"
echo ""

# Call the function and capture the response
RESPONSE=$(curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 300 \
  --connect-timeout 10 \
  --http1.1 \
  -s -S 2>&1)

CURL_EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $CURL_EXIT_CODE -eq 0 ]; then
  echo "✓ SUCCESS: Export completed successfully!"
  echo ""
  
  # Parse the JSON response to extract the download URL
  DOWNLOAD_URL=$(echo "$RESPONSE" | grep -o '"downloadUrl":"[^"]*"' | sed 's/"downloadUrl":"\(.*\)"/\1/')
  RECORD_COUNT=$(echo "$RESPONSE" | grep -o '"recordCount":[0-9]*' | sed 's/"recordCount"://')
  
  if [ ! -z "$RECORD_COUNT" ]; then
    echo "Exported $RECORD_COUNT feedback record(s)"
  fi
  
  if [ ! -z "$DOWNLOAD_URL" ] && [ "$DOWNLOAD_URL" != "null" ]; then
    # Generate a filename with timestamp
    TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
    OUTPUT_FILE="feedback-export-${ENV_NAME}-${TIMESTAMP}.csv"
    
    echo ""
    echo "Downloading CSV to: $OUTPUT_FILE"
    
    # Download the file
    curl -L "$DOWNLOAD_URL" -o "$OUTPUT_FILE" --silent --show-error
    
    if [ -f "$OUTPUT_FILE" ]; then
      FILE_SIZE=$(wc -c < "$OUTPUT_FILE" | xargs)
      echo ""
      echo "✓ Downloaded successfully!"
      echo "  File: $OUTPUT_FILE"
      echo "  Size: $FILE_SIZE bytes"
    else
      echo ""
      echo "⚠ Download may have failed. File not found."
    fi
  else
    echo ""
    echo "No feedback data available to export."
  fi
else
  echo "⚠ Request failed with exit code: $CURL_EXIT_CODE"
  echo ""
  echo "Response:"
  echo "$RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
