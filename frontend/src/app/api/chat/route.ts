import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getBrandonState,
  updateBrandonState,
  createLead,
  getAvailableSlots,
  saveChatLog,
  type ChatLogMessage,
} from '@/lib/dynamodb'
import {
  coerceChannel,
  type ChannelType,
  type PersonaKey,
} from '@/lib/promptBuilder'
import { assembleAgentChannelConfig } from '@/lib/agentConfig'

interface ChatRequestBody {
  message: string
  sessionId?: string
  phone?: string
  persona?: PersonaKey
  channel?: ChannelType
  brandonStatus?: string
  brandonLocation?: string
  brandonNotes?: string
}

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
// OpenAI client (server-side only — API key never exposed to browser)
// ---------------------------------------------------------------------------

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ---------------------------------------------------------------------------
// Conversation history (in-memory per session — DynamoDB stores business data)
// ---------------------------------------------------------------------------

const conversations = new Map<string, ConversationEntry[]>()

// Auto-clean old conversations after 30 min
setInterval(() => {
  conversations.clear()
}, 30 * 60 * 1000)

// ---------------------------------------------------------------------------
// OpenAI function/tool definitions
// ---------------------------------------------------------------------------

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        'Check available repair time slots for a given date. Returns a list of open slots.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: "Date in YYYY-MM-DD format (e.g. '2026-02-11')",
          },
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
      description: 'Book a repair appointment slot for a customer.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Appointment date YYYY-MM-DD' },
          time: { type: 'string', description: "Appointment time e.g. '2:00 PM'" },
          phone: { type: 'string', description: 'Customer phone number' },
          repair_type: {
            type: 'string',
            description: "e.g. 'screen', 'battery', 'charging_port', 'water_damage', 'back_glass', 'other'",
          },
          device: { type: 'string', description: "Device model e.g. 'iPhone 15 Pro'" },
        },
        required: ['date', 'time', 'repair_type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'authorize_discount',
      description:
        'Authorize a customer discount. Auto-approved if ≤15%, otherwise needs Brandon.',
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
          upsell_item: {
            type: 'string',
            description: "'screen_protector', 'phone_case', 'warranty_extension'",
          },
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
      description:
        'Look up repair pricing and services. Call this when a customer asks about prices, services, or what repairs are available. Returns the full price list.',
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
  args: Record<string, unknown>
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
      const date = args.date as string
      const time = args.time as string
      const phone = (args.phone as string) || 'voice-demo'
      const repairType = args.repair_type as string
      const device = (args.device as string) || 'Unknown Device'

      const leadId = await createLead(phone, repairType, device, date, time)
      return {
        success: true,
        lead_id: leadId,
        date,
        time,
        device,
        repair_type: repairType,
        message: `Booking confirmed! Lead ID: ${leadId}. Appointment: ${date} at ${time}`,
      }
    }

    case 'authorize_discount': {
      const pct = args.discount_percent as number
      const reason = args.reason as string
      if (pct <= 15) {
        return {
          success: true,
          approved: true,
          discount_percent: pct,
          message: `Discount of ${pct}% approved (${reason})`,
        }
      }
      return {
        success: true,
        approved: false,
        discount_percent: pct,
        message: `Discount of ${pct}% requires Brandon's approval (${reason}). He'll follow up shortly.`,
      }
    }

    case 'log_upsell': {
      const item = args.upsell_item as string
      const accepted = args.accepted as boolean
      return {
        success: true,
        upsell_item: item,
        accepted,
        message: `Upsell logged: ${item} (${accepted ? 'accepted' : 'declined'})`,
      }
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
        note: 'All prices are "starting at" — final price depends on device model. 90-day warranty included. Most repairs under 1 hour.',
        services: 'Walk-in | On-site (+$20) | Remote diagnostic (free)',
        upsells: 'Screen protector $15 | Phone case $25',
      }
    }

    default:
      return { success: false, message: `Unknown function: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// POST /api/chat  —  production-ready with DynamoDB
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured. Add it to frontend/.env.local' },
        { status: 500 },
      )
    }

    // Override state in DynamoDB if request provides overrides
    if (body.brandonStatus || body.brandonLocation || body.brandonNotes !== undefined) {
      await updateBrandonState({
        status: body.brandonStatus,
        location: body.brandonLocation,
        notes: body.brandonNotes,
      })
    }

    // Fetch real state from DynamoDB
    const currentState = await getBrandonState()
    const channel = coerceChannel(typeof body.channel === 'string' ? body.channel : undefined)
    const promptChannel = channel === 'text' ? 'chat' : 'phone'
    const assembledConfig = assembleAgentChannelConfig(currentState, promptChannel)
    const persona = assembledConfig.persona as PersonaKey

    // Session management
    const sessionId = body.sessionId || 'default'
    let history = conversations.get(sessionId)

    if (!history) {
      history = [{ role: 'system' as const, content: assembledConfig.systemPrompt }]
      conversations.set(sessionId, history)
    } else {
      // Refresh system prompt so status/persona changes take effect mid-conversation
      history[0] = { role: 'system' as const, content: assembledConfig.systemPrompt }
    }

    // Add user message
    history.push({ role: 'user' as const, content: body.message })

    // Call OpenAI — loop to handle function calls
    let iterations = 0
    const MAX_ITERATIONS = 5

    while (iterations < MAX_ITERATIONS) {
      iterations++

      // Use faster model for voice channels to reduce latency
      const model = channel === 'text' ? 'gpt-5-mini' : 'gpt-4o-mini'
      const maxTokens = channel === 'text' ? undefined : 150

      const completion = await openai.chat.completions.create({
        model,
        messages: history as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools,
        tool_choice: 'auto',
        temperature: assembledConfig.temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      })

      const choice = completion.choices[0]
      const msg = choice.message

      // If the model wants to call functions
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        history.push({
          role: 'assistant' as const,
          content: msg.content || '',
          tool_calls: msg.tool_calls,
        })

        // Execute each function and add results
        for (const tc of msg.tool_calls) {
          if (!('function' in tc)) continue
          const fnCall = tc as {
            id: string
            type: string
            function: { name: string; arguments: string }
          }
          const args = JSON.parse(fnCall.function.arguments) as Record<string, unknown>
          const result = await executeFunction(fnCall.function.name, args)

          history.push({
            role: 'tool' as const,
            tool_call_id: fnCall.id,
            content: JSON.stringify(result),
          })
        }

        continue
      }

      // No tool calls — final text response
      const reply = msg.content || "I'm here! What can I help you with?"

      history.push({ role: 'assistant' as const, content: reply })

      // Trim conversation if it gets too long
      if (history.length > 42) {
        const system = history[0]
        history = [system, ...history.slice(-40)]
        conversations.set(sessionId, history)
      }

      // Persist chat log to DynamoDB (fire-and-forget to avoid slowing response)
      const chatMessages: ChatLogMessage[] = history
        .filter((h) => h.role === 'user' || h.role === 'assistant')
        .filter((h) => h.content && h.content.trim().length > 0)
        .map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
          timestamp: Math.floor(Date.now() / 1000),
        }))

      saveChatLog(sessionId, body.phone || 'unknown', chatMessages).catch((err) =>
        console.error('Failed to persist chat log:', err)
      )

      return NextResponse.json({
        reply,
        sessionId,
        persona,
        brandonState: {
          status: currentState.status,
          location: currentState.location,
          notes: currentState.notes,
        },
      })
    }

    return NextResponse.json({
      reply: "I got a bit tangled up there! Could you rephrase that for me?",
      sessionId,
      persona,
      brandonState: {
        status: currentState.status,
        location: currentState.location,
        notes: currentState.notes,
      },
    })
  } catch (error: unknown) {
    console.error('Chat API error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key. Check your .env.local file.' },
        { status: 401 },
      )
    }

    return NextResponse.json(
      { error: `AI service error: ${errorMessage}` },
      { status: 500 },
    )
  }
}
