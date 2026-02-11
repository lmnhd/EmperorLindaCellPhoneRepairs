# Lambda Deployment Notes

## Overview
This document provides manual setup instructions for deploying the LINDA Lambda functions to AWS.

Three Lambda functions are included:
1. **dispatcher.py** - Twilio webhook handler for customer SMS/voice
2. **state_manager.py** - Admin API for managing Brandon's state
3. **scheduler.py** - Booking API for reservation management

---

## Prerequisites

### AWS Setup
1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured with credentials
3. **IAM Role** for Lambda execution (see below)
4. **DynamoDB Tables** created (from Phase 8)
   - `Repairs_Lead_Log` (PK: `lead_id`, SK: `timestamp`)
   - `Brandon_State_Log` (PK: `state_id`)

### Environment Variables
All Lambda functions require these environment variables to be set via AWS Lambda Console or deployment script:

#### OpenAI Integration
- `OPENAI_API_KEY` - From console.openai.com
- (Note: `OPENAI_ASSISTANT_ID` no longer needed; using Responses API)

#### Twilio Integration
- `TWILIO_ACCOUNT_SID` - From twilio.com console
- `TWILIO_AUTH_TOKEN` - From twilio.com console
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (e.g., "+12025551234")

#### AWS Integration
- `DYNAMODB_REGION` - AWS region (default: us-east-1)
- `REPAIRS_LEAD_LOG_TABLE` - Table name (default: "Repairs_Lead_Log")
- `BRANDON_STATE_LOG_TABLE` - Table name (default: "Brandon_State_Log")

---

## IAM Role Setup

Create an IAM role with the following permissions:

### 1. Create Execution Role
```bash
aws iam create-role \
  --role-name LINDALambdaExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

### 2. Attach CloudWatch Logs Permission
```bash
aws iam attach-role-policy \
  --role-name LINDALambdaExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 3. Attach DynamoDB Permission
Create a custom policy file `dynamodb-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/Repairs_Lead_Log",
        "arn:aws:dynamodb:*:*:table/Brandon_State_Log"
      ]
    }
  ]
}
```

Attach the policy:
```bash
aws iam put-role-policy \
  --role-name LINDALambdaExecutionRole \
  --policy-name DynamoDBAccess \
  --policy-document file://dynamodb-policy.json
```

Get the role ARN:
```bash
aws iam get-role --role-name LINDALambdaExecutionRole --query 'Role.Arn'
```

---

## Lambda Function Deployment

### Option A: Using Deployment Script (Recommended)

1. **Set environment variables:**
```bash
export AWS_REGION="us-east-1"
export LAMBDA_ROLE_ARN="arn:aws:iam::123456789012:role/LINDALambdaExecutionRole"
export OPENAI_API_KEY="sk-proj-..."
export TWILIO_ACCOUNT_SID="AC..."
export TWILIO_AUTH_TOKEN="..."
export TWILIO_PHONE_NUMBER="+12025551234"
export DYNAMODB_REGION="us-east-1"
export REPAIRS_LEAD_LOG_TABLE="Repairs_Lead_Log"
export BRANDON_STATE_LOG_TABLE="Brandon_State_Log"
```

2. **Run deployment script:**
```bash
cd backend
bash scripts/deploy_lambda.sh
```

The script will:
- Install dependencies
- Create ZIP packages (~50MB each)
- Create or update Lambda functions
- Configure environment variables
- Set timeout and memory limits

### Option B: Manual Deployment via AWS Console

1. **Create dispatcher Lambda:**
   - Function name: `dispatcher`
   - Runtime: Python 3.11
   - Handler: `dispatcher.handler`
   - Role: LINDALambdaExecutionRole
   - Timeout: 60 seconds
   - Memory: 512 MB
   - Upload ZIP file: `backend/deploy/dispatcher.zip`

2. **Repeat for state_manager and scheduler functions**

3. **Set Environment Variables in Console:**
   - Configuration → Environment variables
   - Add all variables from Prerequisites section

---

## API Gateway Setup

### Create HTTP API

1. **In AWS Console → API Gateway:**
   ```
   Create API → HTTP → Build
   ```

2. **Create Routes:**

   **Route 1: Dispatcher (Twilio Webhook)**
   - Method: POST
   - Path: `/dispatcher`
   - Integration Target: dispatcher Lambda
   - Integration Type: Lambda
   - Payload Format: 1.0

   **Route 2: State Manager**
   - Method: ANY
   - Path: `/state`
   - Integration Target: state_manager Lambda
   - Payload Format: 1.0

   **Route 3: Scheduler**
   - Method: ANY
   - Path: `/scheduler`
   - Integration Target: scheduler Lambda
   - Payload Format: 1.0

3. **Deploy API:**
   - Create stage: `prod`
   - Note the API endpoint URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com`)

### API Gateway Permissions

Update dispatcher Lambda to allow API Gateway invocation:
```bash
aws lambda add-permission \
  --function-name dispatcher \
  --statement-id AllowAPIGateway \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com
```

Repeat for state_manager and scheduler:
```bash
aws lambda add-permission \
  --function-name state_manager \
  --statement-id AllowAPIGateway \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com

aws lambda add-permission \
  --function-name scheduler \
  --statement-id AllowAPIGateway \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com
```

---

## Twilio Webhook Configuration

1. **Update Twilio Webhook URL:**
   - Go to Twilio Console → Phone Numbers → Your Number
   - Messaging → When a message comes in
   - Enter: `https://your-api-gateway-url/dispatcher` (POST)

2. **Test webhook:**
   ```bash
   curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/dispatcher \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "From=%2B19042520927&Body=Hello&MessageSid=SM123"
   ```

---

## Testing

### Test dispatcher Lambda:
```bash
aws lambda invoke \
  --function-name dispatcher \
  --region us-east-1 \
  --payload '{"httpMethod": "POST", "body": "From=%2B19042520927&Body=Hello"}' \
  /tmp/response.json

cat /tmp/response.json
```

### Test state_manager Lambda:
```bash
# Get state
aws lambda invoke \
  --function-name state_manager \
  --region us-east-1 \
  --payload '{"httpMethod": "GET"}' \
  /tmp/response.json

# Update state
aws lambda invoke \
  --function-name state_manager \
  --region us-east-1 \
  --payload '{"httpMethod": "POST", "body": "{\"status\": \"working\", \"location\": \"gym\"}"}' \
  /tmp/response.json
```

### Test scheduler Lambda:
```bash
# Check availability
aws lambda invoke \
  --function-name scheduler \
  --region us-east-1 \
  --payload '{"httpMethod": "GET", "queryStringParameters": {"date": "2026-02-12"}}' \
  /tmp/response.json

# Book appointment
aws lambda invoke \
  --function-name scheduler \
  --region us-east-1 \
  --payload '{"httpMethod": "POST", "body": "{\"phone\": \"+19042520927\", \"date\": \"2026-02-12\", \"time\": \"2:00 PM\", \"repair_type\": \"screen\"}"}' \
  /tmp/response.json
```

---

## Environment Configuration for Frontend

Update `.env.local` in the frontend directory:
```
NEXT_PUBLIC_API_URL=https://your-api-gateway-url
NEXT_PUBLIC_BOOKING_ENDPOINT=https://your-api-gateway-url/scheduler
NEXT_PUBLIC_STATE_ENDPOINT=https://your-api-gateway-url/state
```

---

## Monitoring & Logs

### CloudWatch Logs
Lambda functions log to CloudWatch automatically:
```bash
aws logs tail /aws/lambda/dispatcher --follow
aws logs tail /aws/lambda/state_manager --follow
aws logs tail /aws/lambda/scheduler --follow
```

### View Lambda Errors
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/dispatcher \
  --error-code ERROR \
  --region us-east-1
```

---

## Cost Optimization

### Lambda Pricing Notes
- **Duration**: Billed in 1ms increments (usually 200-500ms per request)
- **Memory**: 512 MB chosen for balance (adjust if needed)
- **Free Tier**: 1M requests/month, 400k GB-seconds/month
- **Estimated Cost**: ~$0.50-1.00/month at 1k requests/day

### Reduce Costs
1. Decrease memory if not needed (128-256 MB might be sufficient)
2. Use Lambda Layers for shared dependencies instead of bundling
3. Monitor function durations in CloudWatch

---

## Troubleshooting

### Lambda Timeout
- Increase timeout in Lambda Configuration (currently 60s)
- Check OpenAI API response times in CloudWatch logs

### DynamoDB Access Denied
- Verify IAM role has `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:Query` permissions
- Check table names match environment variables

### Twilio Webhook Not Responding
- Verify dispatcher Lambda URL in Twilio console
- Check API Gateway route is correctly configured
- Test with curl command above

### OpenAI Connection Error
- Verify `OPENAI_API_KEY` is set in Lambda environment
- Check API key validity in console.openai.com
- Monitor request quotas

---

## Next Steps

After successful deployment:
1. Test all Lambda functions via AWS Console
2. Configure API Gateway webhook for Twilio
3. Update frontend environment variables
4. Run E2E tests (Phase 10)
5. Configure CloudWatch alarms for failures
