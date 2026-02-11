#!/bin/bash

# Deploy LINDA Lambda Functions
# This script packages and deploys all 3 Lambda functions to AWS

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
LAMBDA_ROLE_ARN="${LAMBDA_ROLE_ARN}"
LAMBDA_TIMEOUT="60"
LAMBDA_MEMORY="512"

# Function names
DISPATCHER_FUNCTION="dispatcher"
STATE_MANAGER_FUNCTION="state_manager"
SCHEDULER_FUNCTION="scheduler"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LAMBDA_DIR="$PROJECT_DIR/lambda"
DEPLOY_DIR="$PROJECT_DIR/deploy"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== LINDA Lambda Deployment ===${NC}"
echo "AWS Region: $AWS_REGION"
echo "Lambda Directory: $LAMBDA_DIR"
echo ""

# Check prerequisites
if [ -z "$LAMBDA_ROLE_ARN" ]; then
    echo -e "${RED}ERROR: LAMBDA_ROLE_ARN environment variable not set${NC}"
    echo "Please create an IAM role with Lambda execution permissions and set LAMBDA_ROLE_ARN"
    exit 1
fi

if [ ! -d "$LAMBDA_DIR" ]; then
    echo -e "${RED}ERROR: Lambda directory not found: $LAMBDA_DIR${NC}"
    exit 1
fi

# Create deployment directory
mkdir -p "$DEPLOY_DIR"
echo -e "${GREEN}Created deployment directory: $DEPLOY_DIR${NC}"

# Load environment variables from .env if exists
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "Loading environment variables from .env..."
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Function to deploy a Lambda function
deploy_lambda() {
    local function_name=$1
    local handler_file=$2
    local zip_file="$DEPLOY_DIR/${function_name}.zip"
    
    echo ""
    echo -e "${BLUE}Deploying $function_name...${NC}"
    
    # Create temporary deployment directory
    local deploy_temp="$DEPLOY_DIR/temp_$function_name"
    mkdir -p "$deploy_temp"
    
    # Copy Lambda function code
    cp "$LAMBDA_DIR/$handler_file" "$deploy_temp/"
    cp "$LAMBDA_DIR/utils.py" "$deploy_temp/"
    
    # Install dependencies
    echo "Installing dependencies..."
    pip install -r "$PROJECT_DIR/requirements.txt" -t "$deploy_temp/" -q
    
    # Create ZIP package
    echo "Creating ZIP package..."
    cd "$deploy_temp"
    zip -r "$zip_file" . -q
    cd - > /dev/null
    
    # Clean up temp directory
    rm -rf "$deploy_temp"
    
    echo -e "${GREEN}Package created: $zip_file${NC}"
    echo "File size: $(du -h "$zip_file" | cut -f1)"
    
    # Deploy or update Lambda function
    if aws lambda get-function --function-name "$function_name" --region "$AWS_REGION" 2>/dev/null; then
        echo "Updating existing Lambda function..."
        aws lambda update-function-code \
            --function-name "$function_name" \
            --zip-file "fileb://$zip_file" \
            --region "$AWS_REGION" > /dev/null
        
        aws lambda update-function-configuration \
            --function-name "$function_name" \
            --timeout "$LAMBDA_TIMEOUT" \
            --memory-size "$LAMBDA_MEMORY" \
            --region "$AWS_REGION" > /dev/null
    else
        echo "Creating new Lambda function..."
        aws lambda create-function \
            --function-name "$function_name" \
            --runtime "python3.11" \
            --role "$LAMBDA_ROLE_ARN" \
            --handler "$(basename "$handler_file" .py).handler" \
            --zip-file "fileb://$zip_file" \
            --timeout "$LAMBDA_TIMEOUT" \
            --memory-size "$LAMBDA_MEMORY" \
            --region "$AWS_REGION" > /dev/null
    fi
    
    # Set environment variables for Lambda
    echo "Setting environment variables..."
    aws lambda update-function-configuration \
        --function-name "$function_name" \
        --environment "Variables={
            OPENAI_API_KEY=$OPENAI_API_KEY,
            TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN,
            TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER,
            DYNAMODB_REGION=$AWS_REGION,
            REPAIRS_LEAD_LOG_TABLE=$REPAIRS_LEAD_LOG_TABLE,
            BRANDON_STATE_LOG_TABLE=$BRANDON_STATE_LOG_TABLE
        }" \
        --region "$AWS_REGION" > /dev/null
    
    echo -e "${GREEN}✓ $function_name deployed successfully${NC}"
}

# Deploy all functions
deploy_lambda "$DISPATCHER_FUNCTION" "dispatcher.py"
deploy_lambda "$STATE_MANAGER_FUNCTION" "state_manager.py"
deploy_lambda "$SCHEDULER_FUNCTION" "scheduler.py"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Create an HTTP API in API Gateway"
echo "2. Create routes:"
echo "   - POST /dispatcher → dispatcher Lambda"
echo "   - GET/POST/PUT/DELETE /state → state_manager Lambda"
echo "   - GET/POST /scheduler → scheduler Lambda"
echo "3. Update Twilio webhook URL to point to the dispatcher route"
echo "4. Test with: aws lambda invoke --function-name dispatcher --region $AWS_REGION /tmp/response.json && cat /tmp/response.json"
