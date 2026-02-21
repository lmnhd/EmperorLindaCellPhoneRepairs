# Copilot Instructions: EmperorLinda "Chief of Staff" System

## Project Overview
**Codename**: LINDA (Lifestyle-Integrated Network Dispatch Assistant)  
**Target**: EmperorLinda Cell Phone Repairs  
**Goal**: AI-powered "Chief of Staff" system that handles customer communications, booking, and context-aware responses based on Brandon's current state (gym, work, etc.)

> **🚨 CRITICAL RULES (Read "Strict Coding Standards" section below):**
> 1. **NO `any` TYPES** - Always use explicit TypeScript types
> 2. **NO MOCK DATA** - Always integrate with real APIs/DynamoDB
> 3. **USE `frontend-design` SKILL** - Mandatory for all Next.js UI components
> **🚨 DO NOT BUILD UNLESS EXPLICITLY ASKED**
> - This is a planning and design document
> - Only proceed with implementation when you receive a direct build instruction
> - Use this to inform all code generation decisions, but do not execute until authorized

## Architecture
This is a serverless AWS + Next.js system with three core components:

### Backend (AWS Lambda + DynamoDB)
- **Lambda functions** in `backend/lambda/`:
  - `dispatcher.py`: Twilio webhook handler → routes SMS/voice to OpenAI via Responses API
  - `state_manager.py`: API for admin dashboard to update Brandon's status
  - `scheduler.py`: Booking logic with simple constraint checking
- **DynamoDB Tables**:
  - `Repairs_Lead_Log`: PK `lead_id` (String), SK `timestamp` (Number)
  - `Brandon_State_Log`: PK `state_id` (String, fixed as "CURRENT")
- **OpenAI Integration**: Responses API with function calling for:
  - `check_availability(date)`, `book_slot(...)`, `authorize_discount(...)`, `log_upsell(...)`
  - See **⚠️ OpenAI API Migration** section below
- **Communication**: Twilio for SMS/Voice with webhooks → API Gateway → Lambda

### Frontend (Next.js + Tailwind)
- **Customer Landing**: Hero section, booking widget → communicates with `scheduler.py`
- **Brandon's Cockpit**: Admin dashboard with:
  - Toggle: "Working" vs "Living" state
  - Voice note input → Whisper API → state updates
  - Real-time lead feed from DynamoDB

### Integration Flow
```
Customer SMS → Twilio Webhook → API Gateway → dispatcher.py → 
  ├─ Fetch Brandon_State from DynamoDB
  ├─ Send to OpenAI Responses API (with context)
  └─ Return AI response → Twilio → Customer

Booking Form → API Gateway → scheduler.py → DynamoDB
```

## Development Workflow

### Phase-Based Development (CRITICAL)
This project uses a **Plan Delegator Agent system** for orchestrated multi-phase development:

1. **Plan Delegator Agent** (`Plan Delegator.agent.md`):
   - Breaks complex plans into atomic phases
   - Writes phase instructions to `.plan-delegator/current-phase.md`
   - **STOPS and waits** for Execute Phase agent invocation
   - Reads results, updates progress, plans next phase

2. **Execute Phase Agent** (`Execute Phase.agent.md`):
   - **ONLY reads**: `.plan-delegator/current-phase.md`
   - **ONLY writes**: `.plan-delegator/phase-result.md`
   - **NEVER touches**: `master-plan.md`, `progress.md`, other plan files
   - Executes ONE phase, writes results, STOPS

3. **Verify Phase Agent** (`Verify Phase.agent.md`):
   - Verifies execution against phase requirements
   - Writes to `.plan-delegator/verification-result.md`

**File Naming Convention (MANDATORY)**:
```
.plan-delegator/
├── master-plan.md          # DO NOT RENAME
├── progress.md             # DO NOT RENAME
├── current-phase.md        # Execute Phase reads this
├── phase-result.md         # Execute Phase writes this
└── verification-result.md  # Verify Phase writes this
```

### Commands & Tasks

**Backend (Python):**
```powershell
# Install dependencies
cd backend
pip install -r requirements.txt

# Deploy Lambda (via AWS CLI or SAM - TBD in implementation)
# Testing requires AWS credentials configured
```

**Frontend (Next.js):**
```powershell
cd frontend
npm install
npm run dev       # Local development (http://localhost:3000)
npm run build     # Production build
npm run start     # Production server
```

**Deployment:**
- Frontend: Vercel (Next.js automatic deployment)
- Backend: AWS Lambda via API Gateway
- Assets: QR codes with UTM parameters (`utm_source=shop_door`)

## Environment Variables

**Quick Start**: Use the skeleton files to set up your environment:
- `backend/.env.example` — Copy to `backend/.env` for Lambda and local development
- `frontend/.env.local.example` — Copy to `frontend/.env.local` for Next.js development

Fill in actual credentials from your AWS, OpenAI, and Twilio consoles.

### Lambda Environment (backend/lambda/)
All Lambda functions require these variables set via AWS Lambda Console or CloudFormation/SAM:

**OpenAI Integration:**
- `OPENAI_API_KEY`: OpenAI API key from console.openai.com
- ~~`OPENAI_ASSISTANT_ID`~~ **DEPRECATED**: Assistants API sunsets August 26, 2026
- See **⚠️ OpenAI API Migration** section for Responses API setup

**Twilio Integration:**
- `TWILIO_ACCOUNT_SID`: Account SID from twilio.com console
- `TWILIO_AUTH_TOKEN`: Auth token from twilio.com console
- `TWILIO_PHONE_NUMBER`: Twilio phone number (e.g., "+12025551234")

**DynamoDB Tables:**
- `DYNAMODB_REGION`: AWS region (e.g., "us-east-1")
- `REPAIRS_LEAD_LOG_TABLE`: Table name (default: "Repairs_Lead_Log")
- `BRANDON_STATE_LOG_TABLE`: Table name (default: "Brandon_State_Log")

**API Gateway:**
- `API_BASE_URL`: API Gateway URL for frontend booking requests (e.g., "https://abc123.execute-api.us-east-1.amazonaws.com")

### Frontend Environment (.env.local for Next.js)
Local development and frontend build:
- `NEXT_PUBLIC_API_URL`: API Gateway URL for scheduler/state endpoints
- `NEXT_PUBLIC_BOOKING_ENDPOINT`: Full URL to scheduler.py Lambda (e.g., `{API_BASE_URL}/scheduler`)

### Local Development (.env or .env.local)
For testing with AWS credentials:
- `AWS_REGION`: Region to use (e.g., "us-east-1")
- `AWS_ACCESS_KEY_ID`: IAM user credentials (if not using AWS SSO)
- `AWS_SECRET_ACCESS_KEY`: IAM user credentials (if not using AWS SSO)

## Project-Specific Conventions

### 🚨 STRICT CODING STANDARDS (NON-NEGOTIABLE)

#### 1. TypeScript: ZERO TOLERANCE FOR `any` TYPES
- **NEVER use `any` type** - always provide explicit types
- Use `unknown` if type is truly unknown, then narrow with type guards
- Use generics (`<T>`) for reusable type-safe functions
- **Violation examples to AVOID:**
  - ❌ `const data: any = ...`
  - ❌ `function handler(event: any) { ... }`
  - ❌ `Promise<any>`
- **Correct alternatives:**
  - ✅ `const data: BookingData = ...`
  - ✅ `function handler(event: APIGatewayProxyEvent) { ... }`
  - ✅ `Promise<BookingResponse>`

#### 2. NO MOCK DATA OR PLACEHOLDER IMPLEMENTATIONS
- **NEVER generate mock/placeholder/dummy data** - always integrate with real data sources
- All data must come from actual APIs, DynamoDB tables, or environment variables
- **Violation examples to AVOID:**
  - ❌ `const mockLeads = [{ id: 1, name: "Test" }]`
  - ❌ `// TODO: Replace with real API call`
  - ❌ `return { success: true } // Mock response`
- **Correct approach:**
  - ✅ `const leads = await dynamodb.query({ TableName: REPAIRS_LEAD_LOG_TABLE })`
  - ✅ `const response = await fetch(process.env.NEXT_PUBLIC_API_URL)`
  - ✅ Real AWS SDK calls with proper error handling

#### 3. ALWAYS USE `frontend-design` SKILL FOR UI COMPONENTS
- **MANDATORY**: When creating any Next.js UI component, page, or layout:
  1. Read the `frontend-design` skill instructions: `.github/skills/frontend-design/SKILL.md`
  2. Apply creative, distinctive design patterns (avoid generic AI aesthetics)
  3. Use Tailwind CSS with custom color schemes and typography
  4. Follow the skill's guidance on spacing, animations, and visual hierarchy
- **This applies to:**
  - Hero sections, landing pages, booking forms
  - Admin dashboards, control panels
  - Modal dialogs, notification toasts
  - Any customer-facing or admin-facing UI
- **If you're tempted to skip the skill, STOP and read it first**

### State Management Pattern
- Brandon's state is a **single-row table** (`state_id='CURRENT'`) - always overwrite, never append
- State affects AI behavior (e.g., "Gym Mode" triggers scarcity messaging)
- Voice notes transcribed via Whisper API before state updates

### OpenAI Integration (Responses API)
- **Migration Required** ⚠️: Assistants API deprecated as of August 26, 2025; sunset August 26, 2026
- Use OpenAI Responses API for all new integrations (see **OpenAI API Migration** section)
- Function schemas defined separately from Lambda handlers
- Responses API is agentic by default—supports function calling, tool use, and stateful context
- Context injection: Always include Brandon's current state in prompts for context-aware responses

### DynamoDB Access
- Use `boto3` with Lambda Powertools for structured logging
- Partition key design: `lead_id` for leads, fixed `state_id` for state
- All timestamps in Unix epoch (Number type)

### Twilio Integration
- Incoming webhooks provide `From`, `Body`, `MessageSid`
- Response must be TwiML XML format
- Test with ngrok locally before deploying

## ⚠️ OpenAI API Migration (Assistants → Responses API)

### Background
The OpenAI **Assistants API is deprecated** as of August 26, 2025, with a **sunset date of August 26, 2026**. The **Responses API** is OpenAI's new recommended approach for all new projects.

### Benefits of Responses API
- **Better Performance**: 3% improvement in reasoning tasks (vs. Chat Completions)
- **Agentic by Default**: Built-in tool use and function calling—no manual state management
- **Lower Costs**: 40-80% improvement in cache utilization
- **Stateful Context**: Use `store: true` to maintain reasoning and tool context turn-to-turn
- **Future-Proof**: Designed for upcoming models like GPT-5

### Migration for LINDA

**Current (Deprecated) Approach:**
```python
# Old Assistants API
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
assistant = client.beta.assistants.retrieve(assistant_id=OPENAI_ASSISTANT_ID)
message = client.beta.threads.messages.create(thread_id, role="user", content=user_input)
# ... manual state management
```

**New Approach (Responses API):**
```python
# New Responses API
from openai import OpenAI
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

response = client.responses.create(
    model="gpt-5",
    input="Customer inquiry with context",
    tools=[
        {
            "type": "function",
            "name": "check_availability",
            "description": "Check if a repair slot is available",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "YYYY-MM-DD format"}
                },
                "required": ["date"],
                "additionalProperties": false
            }
        }
        # ... other function definitions
    ]
)

# Access output directly
print(response.output_text)
```

### Key Differences

| Aspect | Assistants API | Responses API |
|--------|---|---|
| Function Defs | Externally-tagged (wrapped in `{"type":"function","function":{...}}`) | Internally-tagged (flat structure with `"type":"function"`) |
| Strict Mode | Non-strict by default | Strict by default |
| Tool Calling | Manual tool management | Native tool calling with automatic correlation |
| State | Thread-based (manual persistence) | Built-in state with `store: true` or encrypted reasoning |
| Multi-turn | Must manually manage message history | Pass `previous_response_id` or use Conversations API |

### Function Schema Changes

**Old (Assistants API - externally tagged):**
```json
{
  "type": "function",
  "function": {
    "name": "check_availability",
    "description": "Check if a repair slot is available",
    "strict": true,
    "parameters": { ... }
  }
}
```

**New (Responses API - internally tagged, strict by default):**
```json
{
  "type": "function",
  "name": "check_availability",
  "description": "Check if a repair slot is available",
  "parameters": { ... }
}
```

### Implementation Steps for LINDA
1. **Update `dispatcher.py`**: Replace Assistants API with `client.responses.create()`
2. **Update function schemas** in `backend/schemas/`: Convert to internally-tagged format
3. **Remove thread management**: Responses API handles state automatically (or use `store: false` for ZDR compliance)
4. **Update context injection**: Pass Brandon's state in the `input` string or as part of request context
5. **Update `.env`**: Remove `OPENAI_ASSISTANT_ID` if no longer needed (use function definitions instead)

### Cost Optimization
With Responses API, LINDA benefits from:
- 40-80% cache hit improvement → reduced token costs
- Stateful context for multi-turn conversations → no re-prompt overhead
- Native function calling → fewer round-trips to OpenAI

### Compliance Note
For organizations with **Zero Data Retention (ZDR)** requirements, use:
```python
response = client.responses.create(
    model="gpt-5",
    input="...",
    store=False,  # Disable storage
    include=["reasoning.encrypted_content"],  # Get encrypted reasoning
    # ... tools and other params
)
```
This keeps the workflow stateless while still using Responses API benefits.

## Testing Strategy
Critical test cases from [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#L84-L88):
1. **"Gym Mock"**: Set state to "Gym", call from test number, verify scarcity response
2. **"Upsell"**: Book slot, confirm screen protector upsell prompt appears

## File Structure Reference
```
backend/
  lambda/           # Lambda function handlers
  schemas/          # OpenAI function schemas (JSON)
  requirements.txt  # Python dependencies

frontend/
  package.json      # Next.js app (latest + Tailwind + lucide-react)
  
docs/               # Additional documentation

.github/
  agents/           # Custom agent definitions (Plan Delegator, Execute, Verify)
  skills/           # Reusable skill definitions
```

## Dependencies
- **Backend**: boto3, openai, twilio, aws-lambda-powertools
- **Frontend**: Next.js (latest), React, Tailwind CSS, lucide-react, TypeScript

## Critical Context
- This is a **24-hour PoC build** - prioritize speed over perfection
- Target: Mobile repair shop owner with solo operation
- Value proposition: AI handles customer comms while Brandon is unavailable
- Brandon's "state" is the core differentiator - context-aware responses vs. generic chatbot
