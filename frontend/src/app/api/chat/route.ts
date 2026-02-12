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

interface ChatRequestBody {
  message: string
  sessionId?: string
  phone?: string
  persona?: PersonaKey
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
// LINDA system prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(state: BrandonState, persona: PersonaKey = 'professional'): string {
  const statusLabel =
    state.status === 'gym'
      ? 'At the gym — will be back in 1-2 hours'
      : state.status === 'unavailable'
        ? 'Currently unavailable'
        : state.status === 'driving'
          ? 'Driving / out — will respond soon'
          : state.status === 'break'
            ? 'On break — back shortly'
            : state.status === 'sleeping'
              ? 'After hours — open tomorrow at 9 AM'
              : 'Available at the shop'

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

BRANDON'S CURRENT STATUS: ${statusLabel}
BRANDON'S LOCATION: ${state.location}
${state.notes ? `BRANDON'S NOTE: ${state.notes}` : ''}
${specialInfoBlock}

SERVICES & PRICING (approximate — always say "starting at"):
- Screen replacement: starting at $79 (iPhone), $89 (Samsung)
- Battery replacement: starting at $49
- Charging port repair: starting at $59
- Water damage assessment: $39 diagnostic fee
- Back glass replacement: starting at $69
- On-site repair: available for an additional $20 service fee
- Remote diagnostic: free via phone/video

All repairs include a 90-day warranty. Most done in under an hour.

SERVICE TYPES:
- Walk-in: Customer comes to the shop
- On-site: Brandon travels to the customer ($20 fee)
- Remote: Diagnostic/consultation via phone or video (free)

BEHAVIOR RULES:
1. If Brandon is at the gym / unavailable, emphasize that slots are limited and create light scarcity.
2. Always try to identify the device model and repair type early.
3. Ask about service preference: walk-in, on-site, or remote diagnostic.
4. After giving a quote, ask if they'd like to book.
5. After booking, offer a screen protector upsell ($15) or phone case ($25).
6. Never promise exact prices — say "starting at" and mention final price depends on the model.
7. If someone asks something you can't handle (refund, complaint), say you'll have Brandon reach out personally.
8. Be concise — this is meant to feel like a real phone call, not reading an essay.
9. IMPORTANT: You are speaking via voice. Keep responses SHORT (1-3 sentences max). No bullet points or lists — speak naturally like a real person on the phone.

AVAILABLE FUNCTIONS:
- check_availability: Check open time slots for a date
- book_slot: Book a repair appointment
- authorize_discount: Request a discount (auto-approve <=15%, escalate >15%)
- log_upsell: Log whether a customer accepted/declined an upsell

Today's date: ${new Date().toISOString().split('T')[0]}`
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

    // Session management
    const sessionId = body.sessionId || 'default'
    let history = conversations.get(sessionId)

    if (!history) {
      history = [{ role: 'system' as const, content: buildSystemPrompt(currentState, persona) }]
      conversations.set(sessionId, history)
    } else {
      // Refresh system prompt so status/persona changes take effect mid-conversation
      history[0] = { role: 'system' as const, content: buildSystemPrompt(currentState, persona) }
    }

    // Add user message
    history.push({ role: 'user' as const, content: body.message })

    // Call OpenAI — loop to handle function calls
    let iterations = 0
    const MAX_ITERATIONS = 5

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: history as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools,
        tool_choice: 'auto',
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
