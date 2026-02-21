import { type BrandonState } from '@/lib/dynamodb'

export type PersonaKey = 'professional' | 'laidback' | 'hustler'
export type ChannelType = 'text' | 'voice' | 'phone'

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

function isCurrentlyWithinOperationalHours(state: BrandonState): boolean {
  if (!state.operational_hours_enabled || !state.operational_open_time || !state.operational_close_time) {
    return false
  }

  const [openHourText, openMinuteText] = state.operational_open_time.split(':')
  const [closeHourText, closeMinuteText] = state.operational_close_time.split(':')
  const openHour = Number.parseInt(openHourText, 10)
  const openMinute = Number.parseInt(openMinuteText, 10)
  const closeHour = Number.parseInt(closeHourText, 10)
  const closeMinute = Number.parseInt(closeMinuteText, 10)

  if (
    !Number.isFinite(openHour) ||
    !Number.isFinite(openMinute) ||
    !Number.isFinite(closeHour) ||
    !Number.isFinite(closeMinute)
  ) {
    return false
  }

  const openMinutes = openHour * 60 + openMinute
  const closeMinutes = closeHour * 60 + closeMinute

  // Get current time in Jacksonville, FL (America/New_York)
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  
  const parts = formatter.formatToParts(now)
  const currentHour = Number.parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const currentMinute = Number.parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  
  // Handle 24:00 edge case from Intl.DateTimeFormat
  const normalizedHour = currentHour === 24 ? 0 : currentHour
  const currentTotalMinutes = normalizedHour * 60 + currentMinute

  return currentTotalMinutes >= openMinutes && currentTotalMinutes < closeMinutes
}

function getStatusLabel(state: BrandonState): string {
  switch (state.status) {
    case 'gym':
      return 'At the gym — back in 1-2 hours'
    case 'unavailable':
      return 'Currently unavailable'
    case 'driving':
      return 'Driving / out — will respond soon'
    case 'break':
      return 'On break — back shortly'
    case 'sleeping':
      if (isCurrentlyWithinOperationalHours(state)) {
        return 'Brandon has temporarily stepped away from the shop or is on a quick break.'
      }
      return 'The shop is currently closed.'
    default:
      return 'Available at the shop'
  }
}

function formatOperationalHours(openTime?: string | null, closeTime?: string | null): string {
  if (!openTime || !closeTime) {
    return 'not configured'
  }

  const [openHourText, openMinuteText] = openTime.split(':')
  const [closeHourText, closeMinuteText] = closeTime.split(':')
  const openHour = Number.parseInt(openHourText, 10)
  const openMinute = Number.parseInt(openMinuteText, 10)
  const closeHour = Number.parseInt(closeHourText, 10)
  const closeMinute = Number.parseInt(closeMinuteText, 10)

  if (
    !Number.isFinite(openHour) ||
    !Number.isFinite(openMinute) ||
    !Number.isFinite(closeHour) ||
    !Number.isFinite(closeMinute)
  ) {
    return 'not configured'
  }

  const toDisplay = (hour24: number, minute: number): string => {
    const meridiem = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
    return `${hour12}:${minute.toString().padStart(2, '0')} ${meridiem}`
  }

  return `${toDisplay(openHour, openMinute)} - ${toDisplay(closeHour, closeMinute)}`
}

export function coercePersona(input: string | undefined): PersonaKey {
  if (input === 'professional' || input === 'laidback' || input === 'hustler') {
    return input
  }
  return 'professional'
}

export function coerceChannel(input: string | undefined): ChannelType {
  if (input === 'text' || input === 'voice' || input === 'phone') {
    return input
  }
  return 'text'
}

export function buildCorePrompt(state: BrandonState, persona: PersonaKey): string {
  const personalityBlock = PERSONAS[persona] ?? PERSONAS.professional
  const assistantName = state.assistant_name || 'LINDA'
  const savedGreeting = state.greeting?.trim() ?? ''
  const specialInfo = state.special_info?.trim() ?? ''
  const operationalHoursEnabled = state.operational_hours_enabled === true

  const greetingBlock = savedGreeting
    ? `\nDEFAULT GREETING (use EXACTLY this greeting when greeting a new customer):\n"${savedGreeting}"`
    : ''

  const specialInfoBlock = specialInfo
    ? `\n\n--- OWNER BULLETIN (IMPORTANT — apply this context naturally) ---\n${specialInfo}\n--- END BULLETIN ---\nWeave the above info into conversations when relevant. Don't read it verbatim — reference deals, events, closures, or updates naturally when the topic fits. If a bulletin mentions a closure or schedule change, proactively inform the customer.`
    : ''

  // ---------------------------------------------------------------------------
  // Services & Pricing — use saved value or fall back to defaults
  // ---------------------------------------------------------------------------
  const DEFAULT_SERVICES_BLOCK = `SERVICES & PRICING (approximate — always say "starting at"):
- Screen replacement: starting at $79 (iPhone), $89 (Samsung)
- Battery replacement: starting at $49
- Charging port repair: starting at $59
- Water damage assessment: $39 diagnostic fee
- Back glass replacement: starting at $69
- On-site repair: additional $20 service fee
- Remote diagnostic: free via phone/video

All repairs include a 90-day warranty. Most done in under an hour.

SERVICE TYPES: Walk-in | On-site ($20 fee) | Remote (free diagnostic)`

  const servicesBlock = state.services_block?.trim()
    ? state.services_block.trim()
    : DEFAULT_SERVICES_BLOCK

  // ---------------------------------------------------------------------------
  // Behavior Rules — stored as JSON array string; fall back to defaults
  // ---------------------------------------------------------------------------
  const DEFAULT_BEHAVIOR_RULES = [
    'If Brandon is unavailable, create light scarcity ("slots are filling up").',
    'Identify device model and repair type early.',
    'Ask service preference: walk-in, on-site, or remote.',
    'After quoting, ask if they\'d like to book.',
    'After booking, offer screen protector ($15) or phone case ($25) upsell.',
    'Say "starting at" — final price depends on model.',
    'Escalate refunds/complaints: "I\'ll have Brandon reach out personally."',
    'Keep responses concise and conversational.',
  ]

  let parsedRules: string[] = DEFAULT_BEHAVIOR_RULES
  if (state.behavior_rules?.trim()) {
    try {
      const parsed = JSON.parse(state.behavior_rules) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedRules = (parsed as unknown[]).map(r => String(r)).filter(r => r.trim().length > 0)
      }
    } catch {
      // Malformed JSON — fall back to defaults silently
    }
  }

  const rulesBlock = parsedRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')

  return `You are ${assistantName} (Lifestyle-Integrated Network Dispatch Assistant), the AI receptionist for EmperorLinda Cell Phone Repairs — a premium mobile repair shop run by Brandon in Jacksonville, FL.

${personalityBlock}
${greetingBlock}

BRANDON'S CURRENT STATUS: ${getStatusLabel(state)}
${state.notes ? `BRANDON'S NOTE: ${state.notes}` : ''}
${specialInfoBlock}
OPERATIONAL HOURS MODE: ${operationalHoursEnabled ? `Enabled (${formatOperationalHours(state.operational_open_time, state.operational_close_time)})` : 'Disabled (no scheduling limits)'}

SCHEDULING POLICY (STRICT):
- If Operational Hours is enabled and configured, only schedule appointments/callbacks within those hours.
- If Operational Hours is enabled, this scheduling window applies regardless of Brandon status mode.
- If Operational Hours is disabled and status is Away / Closed, assume the shop is temporarily closed indefinitely and tell the customer to try again later.
- Only override the indefinite-closure assumption when Brandon notes or Live Context explicitly provide reopening details.
- If Operational Hours is disabled and status is not Away / Closed, scheduling has no time-window limits.

${servicesBlock}

BEHAVIOR RULES:
${rulesBlock}

TRUTH-ONLY RULE (NON-NEGOTIABLE):
- If information is not explicitly known from this prompt, state, or customer message, say you don't know.
- Never guess or invent facts (especially address, hours exceptions, prices, policies, names, dates, phone numbers, or availability).
- Ask one short clarifying question or offer to take callback details to confirm.

LOCATION SAFETY RULE (NON-NEGOTIABLE):
- Do not state a storefront street address unless an exact address is explicitly present in Brandon's note, Owner Bulletin, or customer message.
- If asked where the shop is and no exact address is explicitly present, reply: "I don’t have the exact storefront address in this chat yet. I can confirm it for you right now."

Today's date: ${new Date().toISOString().split('T')[0]}`
}

export function buildDefaultChannelAddendum(channel: ChannelType): string {
  if (channel === 'text') {
    return `

TEXT CHANNEL RULES:
- Keep each reply to 1-3 short sentences.
- Keep first response under 45 words.
- Ask at most ONE question per turn.
- Do NOT dump checklists unless the customer explicitly asks for a full breakdown.
- Keep momentum toward diagnosis and booking.`
  }

  return `

LIVE PHONE RULES (HIGHEST PRIORITY):
- You are on a LIVE PHONE CALL. Respond in 1-2 SHORT sentences MAX.
- NEVER use lists, bullets, or long explanations.
- Talk like a real person — casual, natural, brief.
- ONE question or ONE piece of info per turn. Then STOP and wait.
- If the customer asks about pricing, answer immediately from SERVICES & PRICING using "starting at" language.
- Never say "let me look up price" or imply tool usage.`
}

export function buildSystemPrompt(
  state: BrandonState,
  persona: PersonaKey = 'professional',
  channel: ChannelType = 'text',
): string {
  const basePrompt = buildCorePrompt(state, persona)
  const channelAddendum = buildDefaultChannelAddendum(channel)
  return `${basePrompt}${channelAddendum}`
}
