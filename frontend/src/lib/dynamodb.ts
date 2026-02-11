/**
 * DynamoDB client for LINDA system.
 * Used by Next.js API routes to read/write directly to AWS DynamoDB.
 * Shares tables with the Lambda functions (dispatcher, scheduler, state_manager).
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  type GetCommandOutput,
  type PutCommandOutput,
  type ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION ?? process.env.DYNAMODB_REGION ?? 'us-east-1'
const REPAIRS_TABLE = process.env.REPAIRS_LEAD_LOG_TABLE ?? 'Repairs_Lead_Log'
const STATE_TABLE = process.env.BRANDON_STATE_LOG_TABLE ?? 'Brandon_State_Log'

// ---------------------------------------------------------------------------
// Client Setup
// ---------------------------------------------------------------------------

const ddbClient = new DynamoDBClient({
  region: REGION,
  // Uses credentials from:
  // 1. Environment vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
  // 2. ~/.aws/credentials (default profile)
  // 3. IAM role (if running on AWS infra like ECS/Lambda)
})

const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandonState {
  state_id: string
  status: string
  location: string
  notes: string
  special_info?: string
  voice?: string
  greeting?: string
  max_discount?: number
  ai_answers_calls?: boolean
  ai_answers_sms?: boolean
  auto_upsell?: boolean
  updated_at: number
}

export interface RepairLead {
  lead_id: string
  timestamp: number
  phone: string
  repair_type: string
  device: string
  appointment_date: string
  appointment_time: string
  status: string
  created_at: number
}

// ---------------------------------------------------------------------------
// State Operations
// ---------------------------------------------------------------------------

export async function getBrandonState(): Promise<BrandonState> {
  try {
    const result: GetCommandOutput = await docClient.send(
      new GetCommand({
        TableName: STATE_TABLE,
        Key: { state_id: 'CURRENT' },
      })
    )

    if (result.Item) {
      return result.Item as BrandonState
    }

    // Return default if no state exists
    return {
      state_id: 'CURRENT',
      status: 'available',
      location: 'shop',
      notes: 'Default state',
      updated_at: Math.floor(Date.now() / 1000),
    }
  } catch (error) {
    console.error('Error fetching Brandon state:', error)
    return {
      state_id: 'CURRENT',
      status: 'available',
      location: 'shop',
      notes: 'Error fetching state',
      updated_at: Math.floor(Date.now() / 1000),
    }
  }
}

export async function updateBrandonState(
  updates: Partial<Pick<BrandonState, 'status' | 'location' | 'notes' | 'special_info' | 'voice' | 'greeting' | 'max_discount' | 'ai_answers_calls' | 'ai_answers_sms' | 'auto_upsell'>>
): Promise<BrandonState> {
  // Fetch current state first (merge approach)
  const current = await getBrandonState()

  const newState: BrandonState = {
    state_id: 'CURRENT',
    status: updates.status ?? current.status,
    location: updates.location ?? current.location,
    notes: updates.notes ?? current.notes,
    special_info: updates.special_info ?? current.special_info,
    voice: updates.voice ?? current.voice,
    greeting: updates.greeting ?? current.greeting,
    max_discount: updates.max_discount ?? current.max_discount,
    ai_answers_calls: updates.ai_answers_calls ?? current.ai_answers_calls,
    ai_answers_sms: updates.ai_answers_sms ?? current.ai_answers_sms,
    auto_upsell: updates.auto_upsell ?? current.auto_upsell,
    updated_at: Math.floor(Date.now() / 1000),
  }

  await docClient.send(
    new PutCommand({
      TableName: STATE_TABLE,
      Item: newState,
    })
  )

  return newState
}

// ---------------------------------------------------------------------------
// Lead / Booking Operations
// ---------------------------------------------------------------------------

export async function createLead(
  phone: string,
  repairType: string,
  device: string,
  date: string,
  time: string
): Promise<string> {
  const now = new Date()
  const leadId = `LEAD-${now.toISOString().replace(/[-:T]/g, '').slice(0, 15)}`

  const lead: RepairLead = {
    lead_id: leadId,
    timestamp: Math.floor(now.getTime() / 1000),
    phone,
    repair_type: repairType,
    device,
    appointment_date: date,
    appointment_time: time,
    status: 'booked',
    created_at: Math.floor(now.getTime() / 1000),
  }

  await docClient.send(
    new PutCommand({
      TableName: REPAIRS_TABLE,
      Item: lead,
    })
  )

  console.log(`Created lead: ${leadId}`)
  return leadId
}

export async function queryLeadsForDate(date: string): Promise<RepairLead[]> {
  const result: ScanCommandOutput = await docClient.send(
    new ScanCommand({
      TableName: REPAIRS_TABLE,
      FilterExpression: 'appointment_date = :date',
      ExpressionAttributeValues: { ':date': date },
    })
  )

  return (result.Items ?? []) as RepairLead[]
}

export async function getAllLeads(): Promise<RepairLead[]> {
  const result: ScanCommandOutput = await docClient.send(
    new ScanCommand({
      TableName: REPAIRS_TABLE,
    })
  )

  // Sort by timestamp descending (newest first)
  const leads = (result.Items ?? []) as RepairLead[]
  return leads.sort((a, b) => b.timestamp - a.timestamp)
}

export async function getAvailableSlots(date: string): Promise<string[]> {
  const allSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  ]

  try {
    const bookedLeads = await queryLeadsForDate(date)
    const bookedTimes = bookedLeads.map((lead) => lead.appointment_time)
    return allSlots.filter((slot) => !bookedTimes.includes(slot))
  } catch (error) {
    console.error('Error getting available slots:', error)
    return allSlots
  }
}
