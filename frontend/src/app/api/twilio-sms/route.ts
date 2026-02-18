/**
 * POST /api/twilio-sms
 *
 * Twilio SMS webhook handler.
 * Receives inbound SMS, runs the LINDA AI agent, and returns TwiML <Message>.
 * Set this URL in Twilio → Phone Number → Messaging → "A message comes in".
 *
 * Twilio posts: From, To, Body, MessageSid (application/x-www-form-urlencoded)
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getBrandonState,
  createLead,
  getAvailableSlots,
  saveChatLog,
  type ChatLogMessage,
} from '@/lib/dynamodb'
import { assembleAgentChannelConfig } from '@/lib/agentConfig'
import type { PersonaKey } from '@/lib/promptBuilder'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FunctionResult {
  success: boolean
  [key: string]: unknown
}

interface ConversationEntry {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
}

// ---------------------------------------------------------------------------
// TwiML helpers
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function smsResponse(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escapeXml(message)}</Message></Response>`
  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ---------------------------------------------------------------------------
// Per-phone conversation history (in-memory, auto-clears every 30 min)
// ---------------------------------------------------------------------------

const conversations = new Map<string, ConversationEntry[]>()

setInterval(() => {
  conversations.clear()
}, 30 * 60 * 1000)

// ---------------------------------------------------------------------------
// OpenAI tool definitions (mirrors /api/chat)
// ---------------------------------------------------------------------------

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check available repair time slots for a given date.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: "Date in YYYY-MM-DD format" },
        },
        required: ['date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_slot',
      description: 'Book a repair appointment or on-site visit for a customer.',
      parameters: {
        type: 'object',
        properties: {
          lead_type: {
            type: 'string',
            enum: ['appointment', 'on_site'],
            description: "'appointment' = walk-in. 'on_site' = Brandon travels to customer.",
          },
          date: { type: 'string', description: 'Appointment date YYYY-MM-DD' },
          time: { type: 'string', description: "Appointment time e.g. '2:00 PM'" },
          phone: { type: 'string', description: 'Customer phone number' },
          repair_type: { type: 'string', description: "e.g. 'screen', 'battery', 'charging_port'" },
          device: { type: 'string', description: "Device model e.g. 'iPhone 15 Pro'" },
        },
        required: ['lead_type', 'date', 'time', 'repair_type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_callback',
      description: 'Schedule a callback from Brandon.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Callback date YYYY-MM-DD' },
          time: { type: 'string', description: "Preferred callback time e.g. '3:00 PM'" },
          phone: { type: 'string', description: 'Customer phone number' },
          reason: { type: 'string', description: 'Brief reason for callback' },
        },
        required: ['date', 'time', 'reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'authorize_discount',
      description: 'Authorize a customer discount. Auto-approved if ≤15%.',
      parameters: {
        type: 'object',
        properties: {
          discount_percent: { type: 'number', description: 'Discount percentage' },
          reason: { type: 'string', description: 'Reason for the discount' },
          phone: { type: 'string', description: 'Customer phone' },
        },
        required: ['discount_percent', 'reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_upsell',
      description: 'Log an upsell attempt (screen protector, case, warranty).',
      parameters: {
        type: 'object',
        properties: {
          upsell_item: { type: 'string', description: "'screen_protector', 'phone_case', 'warranty_extension'" },
          accepted: { type: 'boolean', description: 'Whether customer accepted' },
          phone: { type: 'string', description: 'Customer phone' },
        },
        required: ['upsell_item', 'accepted'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pricing',
      description: 'Look up repair pricing. Call when customer asks about prices or services.',
      parameters: {
        type: 'object',
        properties: {
          repair_type: {
            type: 'string',
            description: "Optional filter: 'screen', 'battery', 'charging_port', 'water_damage', 'back_glass', 'on_site', or 'all'",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Function execution — REAL DynamoDB operations
// ---------------------------------------------------------------------------

async function executeFunction(
  name: string,
  args: Record<string, unknown>,
): Promise<FunctionResult> {
  switch (name) {
    case 'check_availability': {
      const date = args.date as string
      const available = await getAvailableSlots(date)
      return {
        success: true,
        date,
        available_slots: available,
        message: available.length
          ? `Available slots on ${date}: ${available.join(', ')}`
          : `No slots available on ${date}`,
      }
    }

    case 'book_slot': {
      const leadType = (args.lead_type as 'appointment' | 'on_site') || 'appointment'
      const date = args.date as string
      const time = args.time as string
      const phone = (args.phone as string) || 'unknown'
      const repairType = args.repair_type as string
      const device = (args.device as string) || 'Unknown Device'
      const leadId = await createLead(phone, repairType, device, date, time, leadType)
      const typeLabel = leadType === 'on_site' ? 'On-site visit' : 'Appointment'
      return {
        success: true,
        lead_id: leadId,
        lead_type: leadType,
        date,
        time,
        device,
        repair_type: repairType,
        message: `${typeLabel} confirmed! Ref: ${leadId}. ${date} at ${time}`,
      }
    }

    case 'schedule_callback': {
      const date = args.date as string
      const time = args.time as string
      const phone = (args.phone as string) || 'unknown'
      const reason = (args.reason as string) || 'General inquiry'
      const leadId = await createLead(phone, reason, 'N/A', date, time, 'callback', reason)
      return {
        success: true,
        lead_id: leadId,
        lead_type: 'callback',
        date,
        time,
        reason,
        message: `Callback scheduled for ${date} at ${time}. Brandon will call${phone !== 'unknown' ? ` ${phone}` : ''} about: ${reason}. Ref: ${leadId}`,
      }
    }

    case 'authorize_discount': {
      const pct = args.discount_percent as number
      const reason = args.reason as string
      if (pct <= 15) {
        return { success: true, approved: true, discount_percent: pct, message: `Discount of ${pct}% approved (${reason})` }
      }
      return { success: true, approved: false, discount_percent: pct, message: `Discount of ${pct}% requires Brandon's approval. He'll follow up shortly.` }
    }

    case 'log_upsell': {
      const item = args.upsell_item as string
      const accepted = args.accepted as boolean
      return { success: true, upsell_item: item, accepted, message: `Upsell logged: ${item} (${accepted ? 'accepted' : 'declined'})` }
    }

    case 'get_pricing': {
      const filter = (args.repair_type as string) || 'all'
      const pricing: Record<string, string> = {
        screen: 'Screen replacement: starting at $79 (iPhone), $89 (Samsung)',
        battery: 'Battery replacement: starting at $49',
        charging_port: 'Charging port repair: starting at $59',
        water_damage: 'Water damage assessment: $39 diagnostic fee',
        back_glass: 'Back glass replacement: starting at $69',
        on_site: 'On-site repair: additional $20 service fee',
      }
      const items = filter === 'all'
        ? Object.values(pricing)
        : [pricing[filter] ?? `No specific pricing for '${filter}' — ask Brandon`]
      return {
        success: true,
        pricing: items,
        note: 'All prices are "starting at". 90-day warranty included. Most repairs under 1 hour.',
        upsells: 'Screen protector $15 | Phone case $25',
      }
    }

    default:
      return { success: false, message: `Unknown function: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// Extract text from OpenAI response message
// ---------------------------------------------------------------------------

function extractText(message: OpenAI.Chat.Completions.ChatCompletionMessage): string {
  if (typeof message.content === 'string') return message.content.trim()
  const content = (message as unknown as { content?: unknown }).content
  if (!Array.isArray(content)) return ''
  return content
    .map((p) => {
      const part = p as { type?: unknown; text?: unknown }
      return part.type === 'text' && typeof part.text === 'string' ? part.text : ''
    })
    .join(' ')
    .trim()
}

// ---------------------------------------------------------------------------
// POST /api/twilio-sms  — Twilio webhook
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Twilio sends form-encoded body
    const text = await req.text()
    const params = new URLSearchParams(text)

    const fromPhone = params.get('From') ?? 'unknown'
    const body = params.get('Body')?.trim() ?? ''

    if (!body) {
      return smsResponse("Hey! Didn't catch that — what repair do you need?")
    }

    if (!process.env.OPENAI_API_KEY) {
      return smsResponse("We're experiencing a technical issue. Please call or text back shortly.")
    }

    // Fetch Brandon's current state from DynamoDB
    const currentState = await getBrandonState()

    // Check if AI SMS answering is enabled
    if (currentState.ai_answers_sms === false) {
      const name = currentState.assistant_name || 'LINDA'
      return smsResponse(
        `Thanks for texting EmperorLinda Cell Phone Repairs! ${name} is offline right now — Brandon will reply shortly. For urgent repairs, please call us.`
      )
    }

    // Build system prompt via shared config (uses 'chat' channel → concise text rules)
    const assembledConfig = assembleAgentChannelConfig(currentState, 'chat')
    const persona = assembledConfig.persona as PersonaKey

    // Per-phone conversation history
    const sessionId = `sms:${fromPhone}`
    let history = conversations.get(sessionId)

    if (!history) {
      history = [{ role: 'system' as const, content: assembledConfig.systemPrompt }]
      conversations.set(sessionId, history)
    } else {
      // Refresh system prompt so state changes take effect
      history[0] = { role: 'system' as const, content: assembledConfig.systemPrompt }
    }

    history.push({ role: 'user' as const, content: body })

    // OpenAI tool-calling loop
    let iterations = 0
    const MAX_ITERATIONS = 5

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: history as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools,
        tool_choice: 'auto',
        max_tokens: 200, // SMS-friendly length
        temperature: assembledConfig.temperature,
      })

      const choice = completion.choices[0]
      const msg = choice.message

      // Handle tool calls
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        history.push({
          role: 'assistant' as const,
          content: msg.content || '',
          tool_calls: msg.tool_calls,
        })

        for (const tc of msg.tool_calls) {
          if (!('function' in tc)) continue
          const fnCall = tc as { id: string; type: string; function: { name: string; arguments: string } }
          const fnArgs = JSON.parse(fnCall.function.arguments) as Record<string, unknown>
          // Inject caller's phone if the function accepts it and it wasn't provided
          if (!fnArgs.phone) fnArgs.phone = fromPhone
          const result = await executeFunction(fnCall.function.name, fnArgs)
          history.push({
            role: 'tool' as const,
            tool_call_id: fnCall.id,
            content: JSON.stringify(result),
          })
        }
        continue
      }

      // Final text reply
      let reply = extractText(msg)

      if (!reply) {
        reply = "Got your message! What phone model and what needs fixing?"
      }

      history.push({ role: 'assistant' as const, content: reply })

      // Trim history to avoid token bloat
      if (history.length > 42) {
        const system = history[0]
        history = [system, ...history.slice(-40)]
        conversations.set(sessionId, history)
      }

      // Persist chat log to DynamoDB (fire-and-forget)
      const chatMessages: ChatLogMessage[] = history
        .filter((h) => h.role === 'user' || h.role === 'assistant')
        .filter((h) => h.content?.trim().length > 0)
        .map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
          timestamp: Math.floor(Date.now() / 1000),
        }))

      saveChatLog(sessionId, fromPhone, chatMessages).catch((err) =>
        console.error('[twilio-sms] Failed to persist chat log:', err)
      )

      void persona // used for logging if needed later

      return smsResponse(reply)
    }

    return smsResponse("I got a bit mixed up there — could you send that again?")
  } catch (error: unknown) {
    console.error('[twilio-sms] Error:', error)
    return smsResponse("We hit a snag on our end. Please try again in a moment!")
  }
}

// ---------------------------------------------------------------------------
// GET /api/twilio-sms  — health check
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'LINDA SMS webhook is active.',
    endpoint: 'POST /api/twilio-sms',
  })
}
