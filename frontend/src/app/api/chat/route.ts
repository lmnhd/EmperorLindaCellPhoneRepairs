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
import { addAgentDebugEvent } from '@/lib/agentDebugStore'

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

function extractAssistantContent(message: OpenAI.Chat.Completions.ChatCompletionMessage): string {
  if (typeof message.content === 'string') {
    return message.content.trim()
  }

  const unknownMessage = message as unknown as { content?: unknown }
  const content = unknownMessage.content

  if (!Array.isArray(content)) {
    return ''
  }

  const text = content
    .map((part) => {
      if (typeof part !== 'object' || part === null) {
        return ''
      }

      const maybePart = part as { type?: unknown; text?: unknown }
      if (maybePart.type === 'text' && typeof maybePart.text === 'string') {
        return maybePart.text
      }

      return ''
    })
    .join(' ')
    .trim()

  return text
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

const HERO_CHAT_OPENING_MESSAGE = 'Welcome, need your phone repaired fast?'

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
      description: 'Book a repair appointment, on-site visit, or any scheduled event for a customer.',
      parameters: {
        type: 'object',
        properties: {
          lead_type: {
            type: 'string',
            enum: ['appointment', 'on_site'],
            description: "'appointment' = walk-in to the shop. 'on_site' = Brandon travels to the customer.",
          },
          date: { type: 'string', description: 'Appointment date YYYY-MM-DD' },
          time: { type: 'string', description: "Appointment time e.g. '2:00 PM'" },
          phone: { type: 'string', description: 'Customer phone number' },
          repair_type: {
            type: 'string',
            description: "e.g. 'screen', 'battery', 'charging_port', 'water_damage', 'back_glass', 'other'",
          },
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
      description: 'Schedule a callback from Brandon for a customer who cannot come in now or needs a follow-up call.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Callback date YYYY-MM-DD' },
          time: { type: 'string', description: "Preferred callback time e.g. '3:00 PM'" },
          phone: { type: 'string', description: 'Customer phone number' },
          reason: { type: 'string', description: 'Brief reason for callback e.g. "quote for screen repair" or "discuss water damage options"' },
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
    addAgentDebugEvent({
      source: 'chat-api',
      event: 'request_received',
      sessionId,
      data: {
        channel,
        promptChannel,
        persona,
        phone: body.phone,
        message: body.message,
      },
      timestamp: Date.now(),
    })

    let history = conversations.get(sessionId)

    if (!history) {
      history = [{ role: 'system' as const, content: assembledConfig.systemPrompt }]

      const isHeroWebChat = channel === 'text' && body.phone === 'web-chat'
      if (isHeroWebChat) {
        history.push({
          role: 'assistant' as const,
          content: HERO_CHAT_OPENING_MESSAGE,
        })
      }

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
      const maxTokens = channel === 'text' ? 260 : 150
      const tokenLimitParam = model.startsWith('gpt-5')
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens }
      const shouldSendTemperature = !model.startsWith('gpt-5')

      const completionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model,
        messages: history as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools,
        tool_choice: 'auto',
        ...(maxTokens ? tokenLimitParam : {}),
        ...(shouldSendTemperature ? { temperature: assembledConfig.temperature } : {}),
      }

      const completion = await openai.chat.completions.create(completionParams)

      const choice = completion.choices[0]
      const msg = choice.message

      // If the model wants to call functions
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        addAgentDebugEvent({
          source: 'chat-api',
          event: 'tool_calls_requested',
          sessionId,
          data: {
            toolCalls: msg.tool_calls.map((tc) => {
              if ('function' in tc) {
                return {
                  id: tc.id,
                  name: tc.function.name,
                  args: tc.function.arguments,
                }
              }

              return {
                id: tc.id,
                name: tc.type,
                args: '',
              }
            }),
          },
          timestamp: Date.now(),
        })

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

          addAgentDebugEvent({
            source: 'chat-api',
            event: 'tool_call_result',
            sessionId,
            data: {
              toolName: fnCall.function.name,
              args,
              result,
            },
            timestamp: Date.now(),
          })

          history.push({
            role: 'tool' as const,
            tool_call_id: fnCall.id,
            content: JSON.stringify(result),
          })
        }

        continue
      }

      // No tool calls — final text response
      let reply = extractAssistantContent(msg)

      if (!reply) {
        console.warn('Primary model returned empty text; attempting rescue completion', {
          model,
          channel,
          finishReason: choice.finish_reason,
          hasToolCalls: Boolean(msg.tool_calls?.length),
        })

        const rescueCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: history as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          max_tokens: 120,
          temperature: 0.6,
        })

        reply = extractAssistantContent(rescueCompletion.choices[0].message)
      }

      if (!reply) {
        reply = "I can help right now—what phone model and repair do you need?"
      }

      history.push({ role: 'assistant' as const, content: reply })

      addAgentDebugEvent({
        source: 'chat-api',
        event: 'assistant_reply',
        sessionId,
        data: {
          model,
          reply,
        },
        timestamp: Date.now(),
      })

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
