import { NextResponse } from 'next/server'
import { getBrandonState, type BrandonState } from '@/lib/dynamodb'
import { assembleAgentChannelConfig } from '@/lib/agentConfig'
import { addAgentDebugEvent } from '@/lib/agentDebugStore'

type VoiceName =
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'sage'
  | 'verse'
  | 'marin'
  | 'cedar'
type SupportedRealtimeVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse'
  | 'marin'
  | 'cedar'
type PersonaKey = 'laidback' | 'professional' | 'hustler'

interface RealtimeSessionRequest {
  sessionId?: string
  persona?: PersonaKey
  brandonStatus?: string
  brandonLocation?: string
  brandonNotes?: string
  voiceOverride?: VoiceName
  handoffPrompt?: string
}

interface OpenAIRealtimeErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

const BROWSER_VOICE_ADDENDUM = `
BROWSER VOICE CHAT INSTRUCTIONS:
- This is a live browser voice conversation.
- Keep replies concise: 1-2 short sentences unless the user asks for detail.
- Speak naturally and conversationally, like a real receptionist.
- Stay aligned with EmperorLinda Cell Phone Repairs brand voice.
- If this session started after active web chat, continue seamlessly without re-introducing yourself.
- Confirm important booking details before finalizing.
`

const SUPPORTED_REALTIME_VOICES: Set<SupportedRealtimeVoice> = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
])

const LEGACY_VOICE_MAP: Record<string, SupportedRealtimeVoice> = {
  nova: 'coral',
  onyx: 'cedar',
  fable: 'verse',
}

function normalizeRealtimeVoice(input: VoiceName | string | undefined): SupportedRealtimeVoice {
  if (!input) return 'alloy'

  const normalized = input.trim().toLowerCase()
  if (SUPPORTED_REALTIME_VOICES.has(normalized as SupportedRealtimeVoice)) {
    return normalized as SupportedRealtimeVoice
  }

  return LEGACY_VOICE_MAP[normalized] ?? 'alloy'
}

function applyOverrides(state: BrandonState, request: RealtimeSessionRequest): BrandonState {
  return {
    ...state,
    status: request.brandonStatus ?? state.status,
    location: request.brandonLocation ?? state.location,
    notes: request.brandonNotes ?? state.notes,
    persona: request.persona ?? state.persona,
    voice: request.voiceOverride ?? state.voice,
  }
}

function buildSystemPrompt(basePrompt: string, request: RealtimeSessionRequest): string {
  const parts: string[] = [basePrompt, BROWSER_VOICE_ADDENDUM]

  if (request.handoffPrompt?.trim()) {
    parts.push(`\nHANDOFF CONTEXT:\n${request.handoffPrompt.trim()}`)
  }

  if (request.sessionId?.trim()) {
    parts.push(`\nSESSION ID: ${request.sessionId.trim()}`)
  }

  return parts.join('\n')
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RealtimeSessionRequest
    const sessionId = body.sessionId?.trim() || 'voice-session'
    const currentState = await getBrandonState()
    const effectiveState = applyOverrides(currentState, body)

    const assembled = assembleAgentChannelConfig(effectiveState, 'phone')
    const instructions = buildSystemPrompt(assembled.systemPrompt, body)
    const chosenVoice = normalizeRealtimeVoice((body.voiceOverride ?? assembled.voice ?? 'alloy') as VoiceName)

    addAgentDebugEvent({
      source: 'realtime-session-api',
      event: 'session_request_received',
      sessionId,
      data: {
        persona: effectiveState.persona,
        voiceRequested: body.voiceOverride ?? assembled.voice,
        voiceNormalized: chosenVoice,
        status: effectiveState.status,
        location: effectiveState.location,
        hasHandoffPrompt: Boolean(body.handoffPrompt?.trim()),
      },
      timestamp: Date.now(),
    })

    const primaryModel = process.env.OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime'
    const legacyFallbackModel = 'gpt-4o-realtime-preview-2024-12-17'

    const createSession = async (model: string) =>
      fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          voice: chosenVoice,
          instructions,
          modalities: ['text', 'audio'],
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 700,
          },
          temperature: assembled.temperature,
        }),
      })

    let modelUsed = primaryModel
    let response = await createSession(modelUsed)

    if (!response.ok && response.status === 400 && modelUsed !== legacyFallbackModel) {
      modelUsed = legacyFallbackModel
      response = await createSession(modelUsed)
    }

    if (!response.ok) {
      const detailText = await response.text()
      let detailMessage = detailText

      try {
        const parsed = JSON.parse(detailText) as OpenAIRealtimeErrorResponse
        detailMessage = parsed.error?.message ?? detailText
      } catch {
        // Keep raw detail text when not JSON.
      }

      addAgentDebugEvent({
        source: 'realtime-session-api',
        event: 'session_request_failed',
        sessionId,
        data: {
          status: response.status,
          model: modelUsed,
          detail: detailMessage,
        },
        timestamp: Date.now(),
      })

      return NextResponse.json(
        {
          error: 'Failed to create realtime session',
          detail: detailMessage,
          model: modelUsed,
        },
        { status: response.status },
      )
    }

    const session = (await response.json()) as {
      id?: string
      client_secret?: { value?: string; expires_at?: number }
    }

    return NextResponse.json({
      client_secret: session.client_secret?.value,
      session_id: session.id,
      expires_at: session.client_secret?.expires_at,
      model: modelUsed,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create realtime session'

    addAgentDebugEvent({
      source: 'realtime-session-api',
      event: 'session_request_error',
      data: {
        error: message,
      },
      timestamp: Date.now(),
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
