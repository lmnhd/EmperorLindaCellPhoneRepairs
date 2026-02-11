# Backend Implementation & Testing Plan: LINDA System

**Project**: EmperorLinda "Chief of Staff" System  
**Focus**: Backend Infrastructure with Progressive Testing  
**Approach**: Build → Test → Verify → Advance  
**Estimated Time**: 4-6 hours (with testing)

---

## Overview

This plan implements the LINDA backend in 10 atomic phases, with hands-on testing using your phone and AWS infrastructure at each step. We'll start with local Python testing, then AWS setup, Twilio integration, OpenAI connection, and full end-to-end testing.

**Testing Strategy**:
- **Phase 1-2**: Local Python environment + basic AWS connectivity
- **Phase 3-4**: DynamoDB live testing with real data
- **Phase 5-6**: Twilio SMS/Voice testing with YOUR phone
- **Phase 7-8**: OpenAI integration + function calling testing
- **Phase 9**: Lambda deployment + API Gateway testing
- **Phase 10**: Full end-to-end integration test

---

## Phase Breakdown

### Phase 1: Local Python Environment Setup
**Time**: 15 minutes  
**Goal**: Get Python dependencies installed and verify imports work  

**Tasks**:
1. Install Python 3.11+ (if needed)
2. Install dependencies from `backend/requirements.txt`
3. Create `.env.example` skeleton file
4. Test imports locally (boto3, openai, twilio)

**Testing**:
- Run: `python -c "import boto3, openai, twilio; print('✅ All imports work')"`

**Files**:
- `backend/requirements.txt` (verify/update)
- `backend/.env.example` (create)

---

### Phase 2: AWS Credentials & Basic Connectivity
**Time**: 20 minutes  
**Goal**: Configure AWS credentials and verify DynamoDB access  

**Tasks**:
1. Configure AWS CLI credentials (IAM user or SSO)
2. Create test script `backend/test_aws_connection.py`
3. Test listing DynamoDB tables (should return empty or existing tables)

**Testing**:
- Run: `python backend/test_aws_connection.py`
- Expected: "✅ Connected to AWS - Region: us-east-1"

**Files**:
- `backend/test_aws_connection.py` (create)
- `backend/.env` (create from .env.example)

---

### Phase 3: DynamoDB Tables Creation
**Time**: 25 minutes  
**Goal**: Create both DynamoDB tables and verify structure  

**Tasks**:
1. Create script: `backend/scripts/create_tables.py`
2. Define table schemas:
   - `Repairs_Lead_Log`: PK=`lead_id` (String), SK=`timestamp` (Number)
   - `Brandon_State_Log`: PK=`state_id` (String, fixed as "CURRENT")
3. Run table creation
4. Verify tables exist via AWS Console or CLI

**Testing**:
- Run: `python backend/scripts/create_tables.py`
- Verify: `aws dynamodb list-tables` shows both tables

**Files**:
- `backend/scripts/create_tables.py` (create)

---

### Phase 4: DynamoDB Read/Write Testing
**Time**: 30 minutes  
**Goal**: Test CRUD operations on both tables with real data  

**Tasks**:
1. Create test script: `backend/test_dynamodb_operations.py`
2. Implement test operations:
   - **Brandon State**: Write "CURRENT" state with test data
   - **Lead Log**: Write a mock lead entry
   - Read both back and verify
   - Update state and verify
3. Test query operations

**Testing**:
- Run: `python backend/test_dynamodb_operations.py`
- Expected output:
  ```
  ✅ Wrote Brandon state: {"state_id": "CURRENT", "mode": "WORK", ...}
  ✅ Read Brandon state: {...}
  ✅ Wrote lead: {"lead_id": "test-001", "phone": "+1234567890", ...}
  ✅ Read lead: {...}
  ```

**Files**:
- `backend/test_dynamodb_operations.py` (create)

---

### Phase 5: Twilio Account Setup & Configuration
**Time**: 20 minutes  
**Goal**: Set up Twilio account, buy number, configure credentials  

**Tasks**:
1. Sign up for Twilio (or use existing account)
2. Buy a phone number (local area code recommended)
3. Add credentials to `backend/.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
4. Create test script: `backend/test_twilio_connection.py`

**Testing**:
- Run: `python backend/test_twilio_connection.py`
- Expected: "✅ Twilio account verified - SID: AC..."

**Files**:
- `backend/.env` (update with Twilio creds)
- `backend/test_twilio_connection.py` (create)

---

### Phase 6: Twilio SMS Testing (YOUR PHONE!)
**Time**: 30 minutes  
**Goal**: Send/receive SMS with your actual phone  

**Tasks**:
1. Create script: `backend/test_twilio_sms.py`
2. Implement:
   - **Outbound SMS**: Send test message to YOUR phone
   - **Inbound SMS webhook handler**: Mock webhook receiver using Flask/ngrok
3. Set up ngrok tunnel for local webhook testing
4. Configure Twilio number webhook URL (ngrok URL)

**Testing**:
- Run: `python backend/test_twilio_sms.py send --to=+1XXXXXXXXXX --message="Test from LINDA"`
- **YOU SHOULD RECEIVE SMS** on your phone
- Reply to the SMS
- Run: `python backend/test_twilio_sms.py receive` (starts Flask server with ngrok)
- **YOUR REPLY** should appear in terminal logs

**Files**:
- `backend/test_twilio_sms.py` (create)
- `backend/test_twilio_webhook_server.py` (create - Flask app for testing)

---

### Phase 7: OpenAI Responses API Setup
**Time**: 25 minutes  
**Goal**: Configure OpenAI Responses API with function definitions  

**Tasks**:
1. Add OpenAI API key to `backend/.env`
2. Create script: `backend/test_openai_connection.py`
3. Define function schemas in: `backend/schemas/functions.json`
   - `check_availability`
   - `book_slot`
   - `authorize_discount`
   - `log_upsell`
4. Test basic Responses API call (no functions yet)

**Testing**:
- Run: `python backend/test_openai_connection.py`
- Expected: "✅ OpenAI API connected - Model: gpt-4o"

**Files**:
- `backend/.env` (update with OpenAI key)
- `backend/test_openai_connection.py` (create)
- `backend/schemas/functions.json` (create)

---

### Phase 8: OpenAI Function Calling Testing
**Time**: 40 minutes  
**Goal**: Test Responses API with function calling (simulated booking flow)  

**Tasks**:
1. Create script: `backend/test_openai_functions.py`
2. Implement mock function handlers:
   - `mock_check_availability()` → returns available slots
   - `mock_book_slot()` → confirms booking
   - `mock_authorize_discount()` → approval logic
   - `mock_log_upsell()` → tracks upsell
3. Test conversation flow:
   - User: "Do you have availability tomorrow at 2pm?"
   - AI: Calls `check_availability(date="2026-02-11")`
   - Mock returns: `{"available": true, "slots": ["2:00 PM", "3:00 PM"]}`
   - AI: "Yes, I have 2pm available. Would you like to book?"

**Testing**:
- Run: `python backend/test_openai_functions.py`
- Expected output:
  ```
  User: Do you have availability tomorrow at 2pm?
  AI: [calls check_availability]
  Function Result: {"available": true, ...}
  AI Response: Yes, I have 2pm available. Would you like to book?
  ```

**Files**:
- `backend/test_openai_functions.py` (create)
- `backend/schemas/functions.json` (verify schema format)

---

### Phase 9: Lambda Functions Development & Deployment
**Time**: 60 minutes  
**Goal**: Create Lambda handlers and deploy to AWS  

**Tasks**:
1. Create Lambda functions:
   - `backend/lambda/dispatcher.py` (Twilio webhook → OpenAI)
   - `backend/lambda/state_manager.py` (Admin dashboard API)
   - `backend/lambda/scheduler.py` (Booking logic)
2. Create Lambda deployment package script: `backend/scripts/deploy_lambda.py`
3. Deploy all 3 Lambdas
4. Create API Gateway endpoints (HTTP API)
5. Configure environment variables for each Lambda

**Testing**:
- Deploy: `python backend/scripts/deploy_lambda.py`
- Test each Lambda:
  - `aws lambda invoke --function-name linda-dispatcher response.json`
  - `aws lambda invoke --function-name linda-state-manager response.json`
  - `aws lambda invoke --function-name linda-scheduler response.json`

**Files**:
- `backend/lambda/dispatcher.py` (create)
- `backend/lambda/state_manager.py` (create)
- `backend/lambda/scheduler.py` (create)
- `backend/lambda/utils.py` (create - shared utilities)
- `backend/scripts/deploy_lambda.py` (create)

---

### Phase 10: Full End-to-End Integration Test (THE BIG ONE!)
**Time**: 45 minutes  
**Goal**: Test complete flow from SMS → Lambda → OpenAI → DynamoDB → Response  

**Tasks**:
1. Update Twilio webhook URL to API Gateway endpoint (dispatcher Lambda)
2. Create comprehensive test script: `backend/test_e2e.py`
3. Test scenarios:
   - **Scenario 1**: SMS inquiry about availability (context: Brandon at gym)
   - **Scenario 2**: Book a slot via SMS
   - **Scenario 3**: Voice call simulation (if time permits)
   - **Scenario 4**: Admin dashboard state update + verify AI response changes
4. Verify data flow:
   - Leads logged to DynamoDB
   - State changes reflect in AI responses
   - Function calls work end-to-end

**Testing**:
- **LIVE TEST WITH YOUR PHONE**:
  1. Set Brandon state to "GYM" via state_manager API
  2. Text Twilio number: "Do you do screen repairs?"
  3. **VERIFY**: You receive SMS with scarcity messaging
  4. Text: "Can I book for tomorrow at 3pm?"
  5. **VERIFY**: Booking flow works, slot confirmed
  6. Check DynamoDB: Lead logged with conversation history

**Files**:
- `backend/test_e2e.py` (create)
- Update Twilio console webhook URL

---

## Success Criteria

**After Phase 10, you will have proven:**
- ✅ AWS infrastructure fully operational (DynamoDB, Lambda, API Gateway)
- ✅ Twilio SMS/Voice integration working with YOUR phone
- ✅ OpenAI Responses API with function calling operational
- ✅ State management affects AI behavior (Gym Mode scarcity test)
- ✅ Booking flow captures leads in DynamoDB
- ✅ End-to-end: SMS → AWS → OpenAI → DynamoDB → SMS response

---

## Rollback Points

- **Phase 1-4**: Local-only, no AWS costs yet (safe to iterate)
- **Phase 5-6**: Twilio costs minimal (~$1-2 for number + messages)
- **Phase 7-8**: OpenAI API costs minimal (testing only)
- **Phase 9-10**: Lambda/API Gateway on AWS Free Tier (likely $0-5)

**Total estimated cost for testing**: ~$5-10

---

## Next Steps After Completion

Once all 10 phases pass:
1. Frontend development (Next.js dashboard)
2. QR code generation for shop door
3. Production deployment (Vercel + AWS)
4. Handoff to Brandon with documentation

---

**Plan Version**: 1.0  
**Created**: February 10, 2026  
**Estimated Total Time**: 4-6 hours (with testing breaks)
