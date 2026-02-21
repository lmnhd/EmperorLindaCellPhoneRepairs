import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import WebSocket from 'ws'
import dotenv from 'dotenv'

dotenv.config()

const PORT = Number(process.env.PORT ?? 5050)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const FRONTEND_URL = process.env.FRONTEND_URL
const AGENT_CONFIG_PHONE_URL = process.env.AGENT_CONFIG_PHONE_URL
const CHAT_LOGS_URL = process.env.CHAT_LOGS_URL
const DEFAULT_VOICE = process.env.VOICE ?? 'alloy'
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview-2024-12-17'

const REALTIME_SUPPORTED_VOICES = new Set([
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

const LEGACY_TO_REALTIME_VOICE_MAP = {
  nova: 'coral',
  onyx: 'cedar',
  fable: 'verse',
}

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY for realtime voice relay')
}

const app = Fastify({ logger: true })
await app.register(fastifyWebsocket)

const CONFIG_TTL_MS = 30 * 1000 // 30 seconds — keeps changes from the dashboard visible quickly
let cachedConfig = null
let cachedConfigAt = 0

function resolveAgentConfigUrl() {
  if (typeof AGENT_CONFIG_PHONE_URL === 'string' && AGENT_CONFIG_PHONE_URL.trim().length > 0) {
    return AGENT_CONFIG_PHONE_URL.trim()
  }

  if (typeof FRONTEND_URL === 'string' && FRONTEND_URL.trim().length > 0) {
    return `${FRONTEND_URL.trim().replace(/\/$/, '')}/api/agent-config/phone`
  }

  return null
}

function buildFallbackConfig() {
  return {
    assistantName: 'LINDA',
    voice: DEFAULT_VOICE,
    greeting: null,
    systemPrompt: [
      'You are LINDA, the phone assistant for EmperorLinda Cell Phone Repairs.',
      'Speak naturally, concise, and friendly.',
      'Help callers with repair questions, booking, pricing context, and store details.',
      'If uncertain, ask one clarifying question and keep the caller engaged.',
    ].join(' '),
    source: 'fallback',
  }
}

function resolveChatLogsUrl() {
  if (typeof CHAT_LOGS_URL === 'string' && CHAT_LOGS_URL.trim().length > 0) {
    return CHAT_LOGS_URL.trim()
  }

  if (typeof FRONTEND_URL === 'string' && FRONTEND_URL.trim().length > 0) {
    return `${FRONTEND_URL.trim().replace(/\/$/, '')}/api/chat-logs`
  }

  return null
}

function normalizeTranscriptText(value) {
  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()
  if (text.length === 0) {
    return null
  }

  return text
}

function appendTranscriptMessage(messages, role, content) {
  const text = normalizeTranscriptText(content)
  if (!text) {
    return false
  }

  const previous = messages[messages.length - 1]
  if (previous && previous.role === role && previous.content === text) {
    return false
  }

  messages.push({
    role,
    content: text,
    timestamp: Math.floor(Date.now() / 1000),
  })

  return true
}

async function persistCallTranscript({ sessionId, source, messages }) {
  const chatLogsUrl = resolveChatLogsUrl()
  if (!chatLogsUrl) {
    app.log.warn({ sessionId, source }, 'No chat logs URL configured; skipping Twilio call transcript persistence')
    return
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    app.log.info({ sessionId, source }, 'No transcript messages captured for Twilio call')
    return
  }

  const payload = {
    sessionId,
    source,
    messages,
  }

  const response = await fetch(chatLogsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Chat log persistence failed (${response.status}): ${body.slice(0, 300)}`)
  }
}

function sanitizeVoice(rawVoice) {
  if (typeof rawVoice !== 'string') {
    return REALTIME_SUPPORTED_VOICES.has(DEFAULT_VOICE) ? DEFAULT_VOICE : 'alloy'
  }

  const normalized = rawVoice.trim().toLowerCase()
  const mapped = LEGACY_TO_REALTIME_VOICE_MAP[normalized] ?? normalized

  if (REALTIME_SUPPORTED_VOICES.has(mapped)) {
    return mapped
  }

  const fallback = REALTIME_SUPPORTED_VOICES.has(DEFAULT_VOICE) ? DEFAULT_VOICE : 'alloy'
  app.log.warn({ rawVoice, mapped, fallback }, 'Unsupported voice from state; falling back to realtime-supported voice')
  return fallback
}

async function loadRuntimeConfig({ forceRefresh = false } = {}) {
  const now = Date.now()
  if (!forceRefresh && cachedConfig && now - cachedConfigAt < CONFIG_TTL_MS) {
    return cachedConfig
  }

  const configUrl = resolveAgentConfigUrl()
  if (!configUrl) {
    const fallback = buildFallbackConfig()
    cachedConfig = fallback
    cachedConfigAt = now
    return fallback
  }

  try {
    const stateRes = await fetch(configUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!stateRes.ok) {
      throw new Error(`State API returned ${stateRes.status}`)
    }

    const payload = await stateRes.json()

    const assistantName = typeof payload?.assistant_name === 'string' && payload.assistant_name.trim().length > 0
      ? payload.assistant_name.trim()
      : 'LINDA'

    const systemPrompt = typeof payload?.system_prompt === 'string' && payload.system_prompt.trim().length > 0
      ? payload.system_prompt
      : buildFallbackConfig().systemPrompt

    const greeting = typeof payload?.greeting === 'string' && payload.greeting.trim().length > 0
      ? payload.greeting.trim()
      : null

    const resolvedConfig = {
      assistantName,
      voice: sanitizeVoice(payload?.voice),
      systemPrompt,
      greeting,
      source: typeof payload?.source === 'string' ? payload.source : 'agent-config-phone',
    }

    cachedConfig = resolvedConfig
    cachedConfigAt = now
    return resolvedConfig
  } catch (error) {
    app.log.error({ error }, 'Failed to load runtime config, using fallback')
    const fallback = buildFallbackConfig()
    cachedConfig = fallback
    cachedConfigAt = now
    return fallback
  }
}

function sendSessionUpdate(openAiWs, config) {
  const sessionUpdate = {
    type: 'session.update',
    session: {
      turn_detection: { type: 'server_vad' },
      input_audio_format: 'g711_ulaw',
      output_audio_format: 'g711_ulaw',
      voice: config.voice,
      instructions: config.systemPrompt,
      modalities: ['text', 'audio'],
      temperature: 0.7,
      input_audio_transcription: { model: 'whisper-1' },
    },
  }

  openAiWs.send(JSON.stringify(sessionUpdate))
}

function sendInitialGreeting(openAiWs, assistantName, greeting) {
  const instructions = typeof greeting === 'string' && greeting.trim().length > 0
    ? `Say EXACTLY this greeting, word for word: "${greeting.trim()}"`
    : `Greet the caller as ${assistantName} in one short, friendly sentence and ask how you can help.`

  const greetingRequest = {
    type: 'response.create',
    response: {
      modalities: ['audio', 'text'],
      instructions,
    },
  }

  openAiWs.send(JSON.stringify(greetingRequest))
}

app.get('/', async () => {
  return { status: 'ok', service: 'linda-realtime-voice-relay' }
})

app.get('/health/store-status', async (_request, reply) => {
  const configUrl = resolveAgentConfigUrl()
  if (!configUrl) {
    return reply.send({
      status: 'ok',
      source: 'fallback',
      note: 'No AGENT_CONFIG_PHONE_URL or FRONTEND_URL configured; using fallback relay config only.',
      timestamp: new Date().toISOString(),
    })
  }

  const startedAt = Date.now()
  try {
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    const latencyMs = Date.now() - startedAt
    if (!response.ok) {
      return reply.code(502).send({
        status: 'error',
        latency_ms: latencyMs,
        frontend_status: response.status,
        timestamp: new Date().toISOString(),
      })
    }

    const payload = await response.json()
    return reply.send({
      status: 'ok',
      source: payload?.source ?? 'agent-config-phone',
      latency_ms: latencyMs,
      voice: sanitizeVoice(payload?.voice),
      persona: payload?.persona ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return reply.code(500).send({
      status: 'error',
      message: error instanceof Error ? error.message : 'unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})

app.register(async (fastify) => {
  fastify.get('/media-stream', { websocket: true }, (twilioSocket) => {
    let streamSid = null
    let callSid = null
    let transcriptSource = 'voice-call'
    let transcriptSessionId = `twilio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const transcriptMessages = []
    const userTranscriptItemIds = new Set()
    const assistantResponseIds = new Set()
    let transcriptPersisted = false
    let latestMediaTimestamp = 0
    let responseStartTimestamp = null
    let lastAssistantItemId = null
    let sessionReady = false
    let pendingGreetingAssistantName = null
    let pendingGreeting = null

    const persistTranscriptOnce = async (reason) => {
      if (transcriptPersisted) {
        return
      }

      transcriptPersisted = true
      try {
        await persistCallTranscript({
          sessionId: transcriptSessionId,
          source: transcriptSource,
          messages: transcriptMessages,
        })
        app.log.info(
          {
            reason,
            streamSid,
            callSid,
            sessionId: transcriptSessionId,
            source: transcriptSource,
            messageCount: transcriptMessages.length,
          },
          'Twilio call transcript persisted',
        )
      } catch (error) {
        app.log.error(
          {
            error,
            reason,
            streamSid,
            callSid,
            sessionId: transcriptSessionId,
            source: transcriptSource,
            messageCount: transcriptMessages.length,
          },
          'Failed to persist Twilio call transcript',
        )
      }
    }

    const openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(OPENAI_REALTIME_MODEL)}`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    })

    openAiWs.on('open', async () => {
      const config = await loadRuntimeConfig({ forceRefresh: true })
      app.log.info({ source: config.source, voice: config.voice }, 'OpenAI realtime connected')
      pendingGreetingAssistantName = config.assistantName
      pendingGreeting = config.greeting ?? null
      sendSessionUpdate(openAiWs, config)
    })

    openAiWs.on('message', (raw) => {
      try {
        const event = JSON.parse(raw.toString())

        if (event.type === 'session.updated') {
          sessionReady = true
          app.log.info({ streamSid }, 'OpenAI session updated and ready')
          if (pendingGreetingAssistantName) {
            sendInitialGreeting(openAiWs, pendingGreetingAssistantName, pendingGreeting)
            pendingGreetingAssistantName = null
            pendingGreeting = null
          }
          return
        }

        if (event.type === 'error') {
          app.log.error({ event }, 'OpenAI realtime error event')
          return
        }

        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = normalizeTranscriptText(event.transcript)
          if (!transcript) {
            return
          }

          const itemId = typeof event.item_id === 'string' ? event.item_id : null
          if (itemId && userTranscriptItemIds.has(itemId)) {
            return
          }
          if (itemId) {
            userTranscriptItemIds.add(itemId)
          }

          const appended = appendTranscriptMessage(transcriptMessages, 'user', transcript)
          if (appended) {
            app.log.info({ streamSid, callSid, transcript }, '[TwilioVoiceTranscript] user')
          }
          return
        }

        if (event.type === 'response.audio_transcript.done') {
          const transcript = normalizeTranscriptText(event.transcript)
          if (!transcript) {
            return
          }

          const responseId = typeof event.response_id === 'string' ? event.response_id : null
          if (responseId && assistantResponseIds.has(responseId)) {
            return
          }
          if (responseId) {
            assistantResponseIds.add(responseId)
          }

          const appended = appendTranscriptMessage(transcriptMessages, 'assistant', transcript)
          if (appended) {
            app.log.info({ streamSid, callSid, transcript }, '[TwilioVoiceTranscript] assistant')
          }
          return
        }

        if (event.type === 'response.audio.delta' && event.delta && streamSid) {
          if (responseStartTimestamp === null) {
            responseStartTimestamp = latestMediaTimestamp
          }

          if (event.item_id) {
            lastAssistantItemId = event.item_id
          }

          twilioSocket.send(
            JSON.stringify({
              event: 'media',
              streamSid,
              media: { payload: event.delta },
            }),
          )
        }

        if (event.type === 'response.done') {
          if (event.response?.status === 'failed') {
            app.log.error({ event }, 'OpenAI response failed')
          }
          // Response finished (completed or failed) — clear tracking so a stale
          // lastAssistantItemId doesn't trigger a response.cancel on the next utterance.
          responseStartTimestamp = null
          lastAssistantItemId = null
        }

        if (event.type === 'input_audio_buffer.speech_started' && responseStartTimestamp !== null) {
          // responseStartTimestamp is only non-null while a response is still streaming,
          // so this cancel is always against an active response.
          if (lastAssistantItemId) {
            openAiWs.send(JSON.stringify({ type: 'response.cancel' }))
          }

          twilioSocket.send(JSON.stringify({ event: 'clear', streamSid }))
          responseStartTimestamp = null
          lastAssistantItemId = null
        }
      } catch (error) {
        app.log.error({ error }, 'Error processing OpenAI event')
      }
    })

    openAiWs.on('close', () => {
      app.log.info('OpenAI realtime socket closed')
    })

    openAiWs.on('error', (error) => {
      app.log.error({ error }, 'OpenAI realtime socket error')
    })

    twilioSocket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString())

        if (message.event === 'start') {
          streamSid = message.start?.streamSid ?? null
          callSid = message.start?.callSid ?? message.start?.customParameters?.callSid ?? null
          const fromPhone = normalizeTranscriptText(message.start?.customParameters?.from)
          transcriptSource = fromPhone ?? (callSid ? `voice-call:${callSid}` : 'voice-call')
          transcriptSessionId = callSid
            ? `twilio-${callSid}`
            : streamSid
              ? `twilio-${streamSid}`
              : transcriptSessionId
          latestMediaTimestamp = 0
          responseStartTimestamp = null
          lastAssistantItemId = null
          app.log.info(
            {
              streamSid,
              callSid,
              source: transcriptSource,
              sessionId: transcriptSessionId,
            },
            'Twilio stream started',
          )
          return
        }

        if (message.event === 'media') {
          if (!sessionReady) {
            return
          }

          latestMediaTimestamp = Number(message.media?.timestamp ?? latestMediaTimestamp)
          const payload = message.media?.payload

          if (payload && openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.send(
              JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: payload,
              }),
            )
          }
          return
        }

        if (message.event === 'stop') {
          void persistTranscriptOnce('twilio-stop')
          if (openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.close()
          }
        }
      } catch (error) {
        app.log.error({ error }, 'Error processing Twilio media event')
      }
    })

    twilioSocket.on('close', () => {
      void persistTranscriptOnce('twilio-socket-close')
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close()
      }
      app.log.info('Twilio media socket closed')
    })
  })
})

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`Realtime voice relay listening on ${PORT}`)
  })
  .catch((error) => {
    app.log.error({ error }, 'Failed to start realtime voice relay')
    process.exit(1)
  })
