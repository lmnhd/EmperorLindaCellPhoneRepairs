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
  DeleteCommand,
  UpdateCommand,
  type GetCommandOutput,
  type PutCommandOutput,
  type ScanCommandOutput,
  type UpdateCommandOutput,
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
  assistant_name?: string
  persona?: string
  greeting?: string
  max_discount?: number
  ai_answers_calls?: boolean
  ai_answers_sms?: boolean
  auto_upsell?: boolean
  agent_shared_tone?: string
  agent_shared_response_length?: string
  agent_shared_escalation_threshold?: string
  agent_chat_channel_instructions?: string
  agent_chat_full_override?: string
  agent_chat_temperature?: string
  agent_phone_channel_instructions?: string
  agent_phone_full_override?: string
  agent_phone_temperature?: string
  // Dynamic knowledge base — editable from the dashboard
  services_block?: string      // Full services & pricing text block
  behavior_rules?: string      // JSON array of rule strings e.g. '["Rule 1","Rule 2"]'
  updated_at: number
}

export interface RepairLead {
  lead_id: string
  timestamp: number
  phone: string
  customer_name?: string
  repair_type: string
  device: string
  appointment_date: string
  appointment_time: string
  status: string
  lead_type: 'appointment' | 'callback' | 'on_site'   // type of scheduled event
  source?: string
  notes?: string                                       // optional context / callback reason
  created_at: number
}

export interface ChatLogMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatLogEntry {
  lead_id: string          // PK — uses "CHATLOG-{sessionId}" prefix
  timestamp: number        // SK — session start time
  session_id: string
  source: string           // 'web-chat' | 'voice-demo' | 'demo' | phone number
  messages: ChatLogMessage[]
  message_count: number
  last_updated: number
  status: string           // 'active' | 'completed'
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
  updates: Partial<Pick<BrandonState,
    | 'status'
    | 'location'
    | 'notes'
    | 'special_info'
    | 'voice'
    | 'assistant_name'
    | 'persona'
    | 'greeting'
    | 'max_discount'
    | 'ai_answers_calls'
    | 'ai_answers_sms'
    | 'auto_upsell'
    | 'agent_shared_tone'
    | 'agent_shared_response_length'
    | 'agent_shared_escalation_threshold'
    | 'agent_chat_channel_instructions'
    | 'agent_chat_full_override'
    | 'agent_chat_temperature'
    | 'agent_phone_channel_instructions'
    | 'agent_phone_full_override'
    | 'agent_phone_temperature'
    | 'services_block'
    | 'behavior_rules'
  >>
): Promise<BrandonState> {
  const updatedAt = Math.floor(Date.now() / 1000)

  const updateEntries = Object.entries(updates).filter(([, value]) => value !== undefined)

  const expressionAttributeNames: Record<string, string> = {
    '#updated_at': 'updated_at',
  }
  const expressionAttributeValues: Record<string, unknown> = {
    ':updated_at': updatedAt,
  }
  const setExpressions: string[] = ['#updated_at = :updated_at']

  for (const [key, value] of updateEntries) {
    const nameKey = `#${key}`
    const valueKey = `:${key}`
    expressionAttributeNames[nameKey] = key
    expressionAttributeValues[valueKey] = value
    setExpressions.push(`${nameKey} = ${valueKey}`)
  }

  const result: UpdateCommandOutput = await docClient.send(
    new UpdateCommand({
      TableName: STATE_TABLE,
      Key: { state_id: 'CURRENT' },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  )

  if (result.Attributes) {
    return result.Attributes as BrandonState
  }

  return getBrandonState()
}

// ---------------------------------------------------------------------------
// Lead / Booking Operations
// ---------------------------------------------------------------------------

export async function createLead(
  phone: string,
  repairType: string,
  device: string,
  date: string,
  time: string,
  leadType: 'appointment' | 'callback' | 'on_site' = 'appointment',
  notes?: string,
  customerName?: string,
  source = 'web-chat',
): Promise<string> {
  const now = new Date()
  const unixNow = Math.floor(now.getTime() / 1000)
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15)
  const random = Math.random().toString(36).substring(2, 8)
  const prefix = leadType === 'callback' ? 'CALLBACK' : leadType === 'on_site' ? 'ONSITE' : 'LEAD'
  const leadId = `${prefix}-${timestamp}-${random}`

  const lead: RepairLead = {
    lead_id: leadId,
    timestamp: unixNow,
    phone,
    customer_name: customerName?.trim() || undefined,
    repair_type: repairType,
    device,
    appointment_date: date,
    appointment_time: time,
    status: 'booked',
    lead_type: leadType,
    source,
    notes,
    created_at: unixNow,
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
  // Exclude chat logs (which have CHATLOG- prefix)
      FilterExpression: 'NOT begins_with(lead_id, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'CHATLOG-' },
    })
  )

  const allLeads = (result.Items ?? []) as RepairLead[]
  
  // Deduplicate by lead_id, keeping only the most recent (highest timestamp)
  const leadMap = new Map<string, RepairLead>()
  for (const lead of allLeads) {
    const existing = leadMap.get(lead.lead_id)
    if (!existing || lead.timestamp > existing.timestamp) {
      leadMap.set(lead.lead_id, lead)
    }
  }
  
  // Convert back to array and sort by timestamp descending (newest first)
  const uniqueLeads = Array.from(leadMap.values())
  return uniqueLeads.sort((a, b) => b.timestamp - a.timestamp)
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

// ---------------------------------------------------------------------------
// Chat Log Operations
// ---------------------------------------------------------------------------

/**
 * Save or update a chat log session. Uses REPAIRS_TABLE with "CHATLOG-" prefix
 * to avoid needing a separate DynamoDB table.
 */
export async function saveChatLog(
  sessionId: string,
  source: string,
  messages: ChatLogMessage[]
): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  const logKey = `CHATLOG-${sessionId}`

  // Try to get existing entry to preserve original timestamp
  let originalTimestamp = now
  try {
    const existing = await docClient.send(
      new GetCommand({
        TableName: REPAIRS_TABLE,
        Key: { lead_id: logKey, timestamp: 0 },  // We use 0 as fixed SK for chat logs
      })
    )
    if (existing.Item) {
      originalTimestamp = (existing.Item as ChatLogEntry).timestamp || now
    }
  } catch {
    // First save for this session
  }

  const entry: ChatLogEntry = {
    lead_id: logKey,
    timestamp: 0,  // Fixed SK — we update in-place per session
    session_id: sessionId,
    source,
    messages,
    message_count: messages.length,
    last_updated: now,
    status: 'active',
  }

  // Preserve original creation timestamp on first write
  if (originalTimestamp !== now) {
    entry.timestamp = 0
  }

  await docClient.send(
    new PutCommand({
      TableName: REPAIRS_TABLE,
      Item: entry,
    })
  )
}

/**
 * Retrieve all chat logs, sorted by most recently updated.
 */
export async function getAllChatLogs(): Promise<ChatLogEntry[]> {
  const result: ScanCommandOutput = await docClient.send(
    new ScanCommand({
      TableName: REPAIRS_TABLE,
      FilterExpression: 'begins_with(lead_id, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'CHATLOG-' },
    })
  )

  const logs = (result.Items ?? []) as ChatLogEntry[]
  return logs.sort((a, b) => b.last_updated - a.last_updated)
}

export async function deleteAllChatLogs(): Promise<number> {
  // Fetch all chat logs
  const logs = await getAllChatLogs()
  
  // Delete each log entry
  for (const log of logs) {
    await docClient.send(
      new DeleteCommand({
        TableName: REPAIRS_TABLE,
        Key: { lead_id: log.lead_id, timestamp: log.timestamp },
      })
    )
  }
  
  return logs.length
}

export async function deleteAllLeads(): Promise<number> {
  // Fetch all leads
  const leads = await getAllLeads()
  
  // Delete each lead entry
  for (const lead of leads) {
    await docClient.send(
      new DeleteCommand({
        TableName: REPAIRS_TABLE,
        Key: { lead_id: lead.lead_id, timestamp: lead.timestamp },
      })
    )
  }
  
  return leads.length
}
