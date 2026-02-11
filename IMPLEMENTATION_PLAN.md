# Implementation Plan: EmperorLinda "Chief of Staff" System
> **Target**: EmperorLinda Cell Phone Repairs
> **Codename**: LINDA (Lifestyle-Integrated Network Dispatch Assistant)
> **Goal**: 24-Hour PoC Build

---

## 📅 Phase 1: Infrastructure Setup (Hours 0-2)

### 1.1. Core Backends (AWS)
- [ ] **DynamoDB Tables Creation**:
    - `Repairs_Lead_Log`: Partition Key `lead_id` (String), Sort Key `timestamp` (Number).
    - `Brandon_State_Log`: Partition Key `state_id` (String - fixed as "CURRENT"). 
- [ ] **IAM Roles**: Create `LindaLambdaRole` with read/write access to DynamoDB and CloudWatch Logs.

### 1.2. AI & Comm Channels
- [ ] **OpenAI Console**:
    - Create Assistant ID for "LINDA" with the System Prompt defined in the Blueprint.
    - Generate API Keys.
- [ ] **Twilio Console**:
    - Buy a local number (Area Code matching Target).
    - Configure Webhook URL (pointing to API Gateway/Lambda).

---

## 🛠️ Phase 2: The Logic Core (Hours 2-8)

### 2.1. Lambda Development (`backend/lambda/`)
- [ ] **`dispatcher.py`** (Twilio Webhook Handler):
    - Receives incoming SMS/Voice metadata.
    - Fetches `Brandon_State` from DynamoDB.
    - Routes to OpenAI Assistant.
- [ ] **`state_manager.py`**:
    - API endpoint for the Admin Dashboard to update status (e.g., "Gym Mode", "Work Mode").
- [ ] **`scheduler.py`**:
    - Simple slot booking logic (checks simple constraints, doesn't need full CalDAV yet).

### 2.2. OpenAI Tool Definitions
- [ ] Define function schemas:
    - `check_availability(date)`
    - `book_slot(name, phone, time, service_type)`
    - `authorize_discount(amount)`
    - `log_upsell(item, price)`

---

## 💻 Phase 3: The Frontend Experience (Hours 8-16)

### 3.1. Customer Landing Page (`frontend/`)
- [ ] **Stack**: Next.js (Latest) + Tailwind CSS.
- [ ] **Hero Section**: "Mobile Repair: We Come To You." (Dynamic visual).
- [ ] **Booking Widget**: Simplified form communicating with `scheduler.py`.
- [ ] **SEO Injection**: Hardcode JSON-LD schemas for "Screen Repair" pricing.

### 3.2. "Brandon's Cockpit" (Admin View)
- [ ] **Simple Dashboard**:
    - **Big Toggle Switch**: "Working" vs. "Living".
    - **Voice Note Input**: Button to record audio -> POST to Whisper -> Update State.
    - **Lead Feed**: List of recent conversations handled by LINDA.

---

## 🚀 Phase 4: Integration & Deployment (Hours 16-20)

### 4.1. Wiring
- [ ] Connect Twilio Webhook -> AWS API Gateway -> `dispatcher` Lambda.
- [ ] Connect Frontend Booking Form -> AWS API Gateway -> `scheduler` Lambda.

### 4.2. Physical Assets
- [ ] Generate QR Codes with UTM parameters (`utm_source=shop_door`).
- [ ] Design printable PDF for Shop Door using the QR code.

### 4.3. Testing
- [ ] **Test 1**: The "Gym Mock". Set state to "Gym", call from a personal cell, verify "Scarcity" response.
- [ ] **Test 2**: The "Upsell". Book a slot, await the screen protector upsell prompt.

---

## 📦 Phase 5: Delivery (Hour 24)
- [ ] Deploy Frontend to Vercel.
- [ ] Print the "Revenue Proposal" and "Command Sheet".
- [ ] Deliver to Target.
