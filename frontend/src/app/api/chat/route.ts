import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getBrandonState,
  updateBrandonState,
  createLead,
  getAvailableSlots,
  saveChatLog,
  type BrandonState,
  type ChatLogMessage,
} from '@/lib/dynamodb'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PersonaKey = 'professional' | 'laidback' | 'hustler'
type ChannelType = 'text' | 'voice' | 'phone'

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
// Persona definitions
// ---------------------------------------------------------------------------

const PERSONAS: Record<PersonaKey, string> = {
  professional: `PERSONALITY:
- Warm, confident, a little playful — you're the best front-desk person Brandon never had.
- You speak casually but professionally. Short, punchy sentences. Never robotic.
- You subtly create urgency ("spots are filling up", "we're pretty booked today") without being pushy.
- You always try to move the conversation toward booking a repair.`,

  laidback: `PERSONALITY:
- Super chill, laid back energy. You talk like a cool friend who happens to fix phones.
- Use casual slang naturally — "bet", "no cap", "say less", "we got you", "that's what's up".
- Still knowledgeable and helpful, but the vibe is relaxed and easy-going.
- You make the customer feel like they're talking to someone from the neighborhood, not a corporate bot.
- Light humor, keep it real, and always steer toward getting that repair booked.
- Example tone: "Aye, cracked screen? Say less, we got you. Brandon does those in like 45 minutes, no cap."`,

  hustler: `PERSONALITY:
- High-energy, fast-talking. You know the value of what Brandon does and you make sure the customer does too.
- Create urgency naturally — "we only got a few spots left today", "I'd lock that in now if I were you".
- Throw in deal sweeteners — mention warranty, quick turnaround, quality parts.
- You're not pushy, you're passionate. You genuinely want to help AND close the deal.
- Example tone: "Listen, Brandon's one of the best in Jax. 90-day warranty on everything. You won't find that at those mall kiosks. Let's get you on the books."`,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusLabel(status: string): string {
  switch (status) {
    case 'gym':         return 'At the gym — back in 1-2 hours'
    case 'unavailable': return 'Currently unavailable'
    case 'driving':     return 'Driving / out — will respond soon'
    case 'break':       return 'On break — back shortly'
    case 'sleeping':    return 'After hours — open tomorrow at 9 AM'
    default:            return 'Available at the shop'
  }
}

// ---------------------------------------------------------------------------
// LINDA system prompt  — VOICE mode (ultra-compact for speed)
// ---------------------------------------------------------------------------

function buildVoicePrompt(state: BrandonState, persona: PersonaKey = 'professional'): string {
  const personalityBlock = PERSONAS[persona] ?? PERSONAS.professional
  const assistantName = state.assistant_name || 'LINDA'
  const savedGreeting = state.greeting?.trim() ?? ''
  const greetingLine = savedGreeting
    ? `\nGREETING: "${savedGreeting}"`
    : ''
  const specialInfo = state.special_info?.trim() ?? ''
  const bulletinLine = specialInfo
    ? `\nBULLETIN: ${specialInfo}`
    : ''

  return `You are ${assistantName}, AI receptionist for EmperorLinda Cell Phone Repairs (Brandon, Jacksonville FL).

⚡ VOICE RULES (HIGHEST PRIORITY):
- You are on a LIVE PHONE CALL. Respond in 1-2 SHORT sentences MAX.
- NEVER use lists, bullets, or long explanations.
- Talk like a real person — casual, natural, brief.
- ONE question or ONE piece of info per turn. Then STOP and wait.
- If the customer asks about pricing, use the get_pricing tool — do NOT recite a menu.

${personalityBlock}
${greetingLine}

STATUS: ${getStatusLabel(state.status)} | LOCATION: ${state.location}
${state.notes ? `NOTE: ${state.notes}` : ''}${bulletinLine}

Today: ${new Date().toISOString().split('T')[0]}`
}

// ---------------------------------------------------------------------------
// LINDA system prompt  — TEXT mode (full detail for chat)
// ---------------------------------------------------------------------------

function buildTextPrompt(state: BrandonState, persona: PersonaKey = 'professional'): string {
  const personalityBlock = PERSONAS[persona] ?? PERSONAS.professional

  const specialInfo = state.special_info?.trim() ?? ''
  const specialInfoBlock = specialInfo
    ? `\n\n--- OWNER BULLETIN (IMPORTANT — apply this context naturally) ---\n${specialInfo}\n--- END BULLETIN ---\nWeave the above info into conversations when relevant. Don't read it verbatim — reference deals, events, closures, or updates naturally when the topic fits. If a bulletin mentions a closure or schedule change, proactively inform the customer.`
    : ''

  const assistantName = state.assistant_name || 'LINDA'
  const savedGreeting = state.greeting?.trim() ?? ''
  const greetingBlock = savedGreeting
    ? `\nDEFAULT GREETING (use this or a very close variation when greeting a new customer):\n"${savedGreeting}"`
    : ''

  return `You are ${assistantName} (Lifestyle-Integrated Network Dispatch Assistant), the AI receptionist for EmperorLinda Cell Phone Repairs — a premium mobile repair shop run by Brandon in Jacksonville, FL.

${personalityBlock}
${greetingBlock}

BRANDON'S CURRENT STATUS: ${getStatusLabel(state.status)}
BRANDON'S LOCATION: ${state.location}
${state.notes ? `BRANDON'S NOTE: ${state.notes}` : ''}
${specialInfoBlock}

SERVICES & PRICING (approximate — always say "starting at"):
- Screen replacement: starting at $79 (iPhone), $89 (Samsung)
- Battery replacement: starting at $49
- Charging port repair: starting at $59
- Water damage assessment: $39 diagnostic fee
- Back glass replacement: starting at $69
- On-site repair: additional $20 service fee
- Remote diagnostic: free via phone/video

All repairs include a 90-day warranty. Most done in under an hour.

SERVICE TYPES: Walk-in | On-site ($20 fee) | Remote (free diagnostic)

BEHAVIOR RULES:
1. If Brandon is unavailable, create light scarcity ("slots are filling up").
2. Identify device model and repair type early.
3. Ask service preference: walk-in, on-site, or remote.
4. After quoting, ask if they'd like to book.
5. After booking, offer screen protector ($15) or phone case ($25) upsell.
6. Say "starting at" — final price depends on model.
7. Escalate refunds/complaints: "I'll have Brandon reach out personally."
8. Keep responses concise and conversational.

Today's date: ${new Date().toISOString().split('T')[0]}`
}

/** Pick the right prompt based on channel */
function buildSystemPrompt(state: BrandonState, persona: PersonaKey = 'professional', channel: ChannelType = 'text'): string {
  return channel === 'text'
    ? buildTextPrompt(state, persona)
    : buildVoicePrompt(state, persona)
}

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
    const persona: PersonaKey = body.persona ?? (currentState.persona as PersonaKey) ?? 'professional'
    const channel: ChannelType = body.channel ?? 'text'

    // Session management
    const sessionId = body.sessionId || 'default'
    let history = conversations.get(sessionId)

    if (!history) {
      history = [{ role: 'system' as const, content: buildSystemPrompt(currentState, persona, channel) }]
      conversations.set(sessionId, history)
    } else {
      // Refresh system prompt so status/persona changes take effect mid-conversation
      history[0] = { role: 'system' as const, content: buildSystemPrompt(currentState, persona, channel) }
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
