# Phase 9 of 10: Lambda Functions Development & Deployment

## Objective
Create three Lambda function handlers (dispatcher, state_manager, scheduler), package dependencies, deploy to AWS, and configure API Gateway endpoints for the LINDA system.

---

## Estimated Time
60 minutes

---

## Prerequisites
- Phase 8 completed (OpenAI function calling working)
- AWS credentials configured with Lambda permissions
- `backend/schemas/functions.json` with 4 function definitions
- All environment variables in `backend/.env`
- boto3, openai, twilio packages in requirements.txt

---

## Files to Create

1. `backend/lambda/dispatcher.py` - Twilio webhook handler → processes SMS/voice → calls OpenAI
2. `backend/lambda/state_manager.py` - Admin API for updating Brandon's state
3. `backend/lambda/scheduler.py` - Booking logic with availability checking
4. `backend/lambda/utils.py` - Shared utilities (DynamoDB helpers, logging)
5. `backend/scripts/deploy_lambda.sh` - Deployment script for all 3 Lambdas

---

## CRITICAL CONTEXT: Lambda Architecture

**Flow Overview:**
```
Customer SMS → Twilio → API Gateway → dispatcher.py → OpenAI (with functions) → Response
Admin Dashboard → API Gateway → state_manager.py → DynamoDB → Update Brandon state
Booking Request → API Gateway → scheduler.py → check availability → DynamoDB
```

**Lambda Function Roles:**
- **dispatcher.py**: Main entry point for customer interactions (SMS/voice)
- **state_manager.py**: CRUD operations for Brandon_State_Log table
- **scheduler.py**: Booking logic (calls check_availability, book_slot functions)

---

## Exact Steps

### Step 1: Create Shared Utilities Module

**File: `backend/lambda/utils.py`**

Shared code for all Lambda functions with DynamoDB helpers and logging.

**Verification Criteria for Step 1:**
- [ ] File created with no syntax errors
- [ ] Imports valid (boto3, Decimal, datetime)
- [ ] All helper functions defined

---

### Step 2: Create Dispatcher Lambda (Twilio Webhook Handler)

**File: `backend/lambda/dispatcher.py`**

Main entry point for customer SMS/voice interactions.

**Requirements:**
- Parse Twilio webhook data (From, Body parameters)
- Fetch Brandon's current state from DynamoDB
- Call OpenAI with function calling (load schemas inline or from file)
- Execute functions (check_availability, book_slot, etc.)
- Return TwiML response for Twilio

**Verification Criteria for Step 2:**
- [ ] File created with no syntax errors
- [ ] OpenAI integration code matches Phase 8 test script
- [ ] Function execution logic includes DynamoDB writes for bookings
- [ ] TwiML response format correct

---

### Step 3: Create State Manager Lambda (Admin API)

**File: `backend/lambda/state_manager.py`**

CRUD API for Brandon's state (used by admin dashboard).

**Methods:**
- GET: Retrieve current state (state_id='CURRENT')
- POST/PUT: Update state with new mode/location/notes
- DELETE: Reset state to default

**Verification Criteria for Step 3:**
- [ ] File created with no syntax errors
- [ ] GET, POST/PUT, DELETE methods implemented
- [ ] DynamoDB write operations use fixed state_id='CURRENT'
- [ ] CORS headers included in responses

---

### Step 4: Create Scheduler Lambda (Booking Logic)

**File: `backend/lambda/scheduler.py`**

Handles booking requests from the customer landing page.

**Methods:**
- GET: Check availability for a date (return mock slots)
- POST: Create new booking, write to Repairs_Lead_Log

**Verification Criteria for Step 4:**
- [ ] File created with no syntax errors
- [ ] GET method returns availability data
- [ ] POST method validates required fields and writes to DynamoDB
- [ ] Lead ID generation follows format: LEAD-YYYYMMDD-HHMMSS

---

### Step 5: Create Deployment Script

**File: `backend/scripts/deploy_lambda.sh`**

Bash script to package and deploy all 3 Lambdas.

**Requirements:**
- Install dependencies to deployment directory
- Copy Lambda Python files
- Create ZIP package
- Deploy/update all 3 functions with AWS CLI
- Set environment variables for each Lambda

**Verification Criteria for Step 5:**
- [ ] Script created with proper bash syntax
- [ ] Includes all 3 Lambda deployments
- [ ] Environment variables configured for each Lambda

---

### Step 6: Python Syntax Verification

Run syntax checks on all Lambda files:

```powershell
python -m py_compile backend/lambda/utils.py
python -m py_compile backend/lambda/dispatcher.py
python -m py_compile backend/lambda/state_manager.py
python -m py_compile backend/lambda/scheduler.py
```

Expected: No output (success) or error messages if syntax issues exist.

---

### Step 7: Document Manual Steps Required

Create a file documenting the manual AWS Console steps:

**File: `backend/DEPLOYMENT_NOTES.md`**

Contents should include:
- IAM role requirements (Lambda execution role + DynamoDB access)
- API Gateway HTTP API creation steps
- Route configuration (5 routes for all endpoints)
- Twilio webhook URL update instructions
- Testing commands for each Lambda

---

## Verification Criteria (All Must Pass)

- [ ] **utils.py** created with DynamoDB helpers
- [ ] **dispatcher.py** created with OpenAI + Twilio integration
- [ ] **state_manager.py** created with GET/POST/DELETE methods
- [ ] **scheduler.py** created with availability + booking logic
- [ ] **deploy_lambda.sh** created with all 3 Lambda deployments
- [ ] **DEPLOYMENT_NOTES.md** created with manual setup instructions
- [ ] All Python files have no syntax errors (`python -m py_compile backend/lambda/*.py`)

---

## Expected Files Created

1. **backend/lambda/utils.py** - NEW FILE (shared utilities)
2. **backend/lambda/dispatcher.py** - NEW FILE (Twilio webhook handler)
3. **backend/lambda/state_manager.py** - NEW FILE (admin API)
4. **backend/lambda/scheduler.py** - NEW FILE (booking API)
5. **backend/scripts/deploy_lambda.sh** - NEW FILE (deployment script)
6. **backend/DEPLOYMENT_NOTES.md** - NEW FILE (manual setup documentation)

---

## Notes

- **Lambda Role**: User will need to create an IAM role with:
  - `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)
  - `AmazonDynamoDBFullAccess` (or custom policy for Repairs_Lead_Log + Brandon_State_Log)

- **Dependencies**: Lambda package will be ~50MB (openai, twilio, boto3)

- **Deployment**: Phase 9 creates the code; actual AWS deployment and API Gateway setup may be done manually or in Phase 10

- **Function Schemas**: dispatcher.py should load schemas inline (copy from backend/schemas/functions.json) since Lambda deployment package needs all code bundled

---

## Implementation Guidance

For each Lambda file, structure should follow this pattern:

```python
"""
Docstring explaining Lambda purpose
"""

import os
import json
import logging
# ... other imports

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """Main Lambda handler"""
    logger.info(f"Event: {json.dumps(event)}")
    
    try:
        # Parse event
        # Execute logic
        # Return response
        pass
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

---

## Result File Location

**YOU MUST WRITE YOUR RESULTS TO:** `.plan-delegator/phase-result.md`

## STOP CONDITIONS

⛔ DO NOT proceed to Phase 10 (E2E testing)
⛔ DO NOT actually deploy to AWS yet (files creation only)
⛔ DO NOT configure API Gateway (manual step documented in DEPLOYMENT_NOTES.md)
⛔ If syntax errors in any Python file, write "BLOCKED: syntax errors in [filename]" to phase-result.md and STOP

---

**Phase 9 Complete When:**
- All 6 files created (4 Lambda .py files + 1 deployment script + 1 documentation file)
- Python syntax verified (no errors)
- All verification criteria checked
