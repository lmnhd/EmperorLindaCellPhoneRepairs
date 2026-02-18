import { type BrandonState } from '@/lib/dynamodb'
import {
  buildCorePrompt,
  buildDefaultChannelAddendum,
  coercePersona,
  type ChannelType,
} from '@/lib/promptBuilder'

export type AgentChannel = 'chat' | 'phone'
export type PromptSource = 'assembled' | 'full_override' | 'fallback'

export const KNOWN_AGENT_CONFIG_DEFAULTS = {
  agent_shared_tone: 'professional',
  agent_shared_response_length: 'medium',
  agent_shared_escalation_threshold: '500',

  agent_chat_channel_instructions: '',
  agent_chat_full_override: '',
  agent_chat_temperature: '0.7',

  agent_phone_channel_instructions: '',
  agent_phone_full_override: '',
  agent_phone_temperature: '0.7',
} as const

export type AgentConfigKey = keyof typeof KNOWN_AGENT_CONFIG_DEFAULTS
export type AgentConfigRecord = Record<AgentConfigKey, string>

function toChannelType(channel: AgentChannel): ChannelType {
  return channel === 'chat' ? 'text' : 'phone'
}

function normalizeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

export function getAgentConfigRecordFromState(state: BrandonState): AgentConfigRecord {
  const record = {} as AgentConfigRecord
  const stateRecord = state as unknown as Record<string, unknown>

  for (const key of Object.keys(KNOWN_AGENT_CONFIG_DEFAULTS) as AgentConfigKey[]) {
    const fallback = KNOWN_AGENT_CONFIG_DEFAULTS[key]
    const rawValue = stateRecord[key]
    record[key] = rawValue === undefined ? fallback : normalizeValue(rawValue)
  }

  return record
}

function getToneDirective(tone: string): string {
  if (tone === 'laidback') {
    return 'TONE DIRECTIVE: Speak in a laid-back, neighborhood style while staying clear and professional.'
  }
  if (tone === 'hustler') {
    return 'TONE DIRECTIVE: Speak with high energy and sales urgency, but never pushy or aggressive.'
  }
  return ''
}

function getLengthDirective(length: string, channel: AgentChannel): string {
  if (channel === 'phone') {
    if (length === 'detailed') {
      return 'RESPONSE LENGTH: Keep phone responses to at most 2 short sentences.'
    }
    if (length === 'short') {
      return 'RESPONSE LENGTH: Keep phone responses to exactly one short sentence when possible.'
    }
    return 'RESPONSE LENGTH: Keep phone responses to 1-2 short sentences.'
  }

  if (length === 'short') {
    return 'RESPONSE LENGTH: Keep replies concise and direct.'
  }
  if (length === 'detailed') {
    return 'RESPONSE LENGTH: Provide complete guidance while staying conversational.'
  }
  return 'RESPONSE LENGTH: Keep replies concise but complete.'
}

function parseTemperature(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    return 0.7
  }
  return Math.min(2, Math.max(0, parsed))
}

export function assembleAgentChannelConfig(state: BrandonState, channel: AgentChannel): {
  systemPrompt: string
  temperature: number
  source: PromptSource
  voice: string
  persona: string
} {
  const config = getAgentConfigRecordFromState(state)

  const channelFullOverride = channel === 'chat'
    ? config.agent_chat_full_override.trim()
    : config.agent_phone_full_override.trim()

  if (channelFullOverride.length > 0) {
    return {
      systemPrompt: channelFullOverride,
      temperature: parseTemperature(channel === 'chat' ? config.agent_chat_temperature : config.agent_phone_temperature),
      source: 'full_override',
      voice: state.voice ?? 'alloy',
      persona: coercePersona(state.persona),
    }
  }

  const persona = coercePersona(state.persona)
  const basePrompt = buildCorePrompt(state, persona)
  const defaultChannelAddendum = buildDefaultChannelAddendum(toChannelType(channel))
  const channelInstructions = channel === 'chat'
    ? config.agent_chat_channel_instructions.trim()
    : config.agent_phone_channel_instructions.trim()

  const pieces: string[] = [basePrompt, defaultChannelAddendum]

  const toneDirective = getToneDirective(config.agent_shared_tone)
  if (toneDirective) {
    pieces.push(`\n${toneDirective}`)
  }

  pieces.push(`\n${getLengthDirective(config.agent_shared_response_length, channel)}`)

  if (channelInstructions.length > 0) {
    pieces.push(`\nCHANNEL INSTRUCTIONS:\n${channelInstructions}`)
  }

  pieces.push(`\nESCALATION THRESHOLD: ${config.agent_shared_escalation_threshold} (high-value or sensitive issues should be escalated).`)

  return {
    systemPrompt: pieces.join('\n'),
    temperature: parseTemperature(channel === 'chat' ? config.agent_chat_temperature : config.agent_phone_temperature),
    source: 'assembled',
    voice: state.voice ?? 'alloy',
    persona,
  }
}
