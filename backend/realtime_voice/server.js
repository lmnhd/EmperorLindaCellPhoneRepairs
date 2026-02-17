import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import WebSocket from 'ws'
import dotenv from 'dotenv'

dotenv.config()

const PORT = Number(process.env.PORT ?? 5050)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const FRONTEND_URL = process.env.FRONTEND_URL
const DEFAULT_VOICE = process.env.VOICE ?? 'alloy'
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview-2024-12-17'

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY for realtime voice relay')
}

const app = Fastify({ logger: true })
await app.register(fastifyWebsocket)

const CONFIG_TTL_MS = 5 * 60 * 1000
let cachedConfig = null
let cachedConfigAt = 0

function buildFallbackConfig() {
  return {
    assistantName: 'LINDA',
    voice: DEFAULT_VOICE,
    systemPrompt: [
      'You are LINDA, the phone assistant for EmperorLinda Cell Phone Repairs.',
      'Speak naturally, concise, and friendly.',
      'Help callers with repair questions, booking, pricing context, and store details.',
      'If uncertain, ask one clarifying question and keep the caller engaged.',
    ].join(' '),
    source: 'fallback',
  }
}

function sanitizeVoice(rawVoice) {
  const validVoices = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
  if (typeof rawVoice !== 'string') {
    return DEFAULT_VOICE
  }
  return validVoices.has(rawVoice) ? rawVoice : DEFAULT_VOICE
}

async function loadRuntimeConfig() {
  const now = Date.now()
  if (cachedConfig && now - cachedConfigAt < CONFIG_TTL_MS) {
    return cachedConfig
  }

  if (!FRONTEND_URL) {
    const fallback = buildFallbackConfig()
    cachedConfig = fallback
    cachedConfigAt = now
    return fallback
  }

  try {
    const stateRes = await fetch(`${FRONTEND_URL}/api/state`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!stateRes.ok) {
      throw new Error(`State API returned ${stateRes.status}`)
    }

    const payload = await stateRes.json()
    const state = payload?.state ?? {}

    const assistantName = typeof state.assistant_name === 'string' && state.assistant_name.trim().length > 0
      ? state.assistant_name.trim()
      : 'LINDA'

    const persona = typeof state.persona === 'string' ? state.persona : 'professional'
    const notes = typeof state.notes === 'string' ? state.notes : ''
    const specialInfo = typeof state.special_info === 'string' ? state.special_info : ''

    const systemPrompt = [
      `You are ${assistantName}, the live phone assistant for EmperorLinda Cell Phone Repairs.`,
      `Persona: ${persona}.`,
      notes ? `Owner notes: ${notes}` : '',
      specialInfo ? `Current special info: ${specialInfo}` : '',
      'Keep responses brief and helpful in live phone format.',
      'If you need missing information, ask one direct question.',
      'Never mention internal systems or implementation details.',
    ]
      .filter(Boolean)
      .join(' ')

    const resolvedConfig = {
      assistantName,
      voice: sanitizeVoice(state.voice),
      systemPrompt,
      source: 'state-api',
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

function sendInitialGreeting(openAiWs, assistantName) {
  const greetingRequest = {
    type: 'response.create',
    response: {
      modalities: ['audio', 'text'],
      instructions: `Greet the caller as ${assistantName} in one short sentence and ask how you can help.`,
    },
  }

  openAiWs.send(JSON.stringify(greetingRequest))
}

app.get('/', async () => {
  return { status: 'ok', service: 'linda-realtime-voice-relay' }
})

app.get('/health/store-status', async (_request, reply) => {
  if (!FRONTEND_URL) {
    return reply.send({
      status: 'ok',
      source: 'fallback',
      note: 'FRONTEND_URL not set; using fallback relay config only.',
      timestamp: new Date().toISOString(),
    })
  }

  const startedAt = Date.now()
  try {
    const response = await fetch(`${FRONTEND_URL}/api/state`, {
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
      latency_ms: latencyMs,
      state_status: payload?.state?.status ?? null,
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
    let latestMediaTimestamp = 0
    let responseStartTimestamp = null
    let lastAssistantItemId = null
    let sessionReady = false
    let pendingGreetingAssistantName = null

    const openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(OPENAI_REALTIME_MODEL)}`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    })

    openAiWs.on('open', async () => {
      const config = await loadRuntimeConfig()
      app.log.info({ source: config.source, voice: config.voice }, 'OpenAI realtime connected')
      pendingGreetingAssistantName = config.assistantName
      sendSessionUpdate(openAiWs, config)
    })

    openAiWs.on('message', (raw) => {
      try {
        const event = JSON.parse(raw.toString())

        if (event.type === 'session.updated') {
          sessionReady = true
          app.log.info({ streamSid }, 'OpenAI session updated and ready')
          if (pendingGreetingAssistantName) {
            sendInitialGreeting(openAiWs, pendingGreetingAssistantName)
            pendingGreetingAssistantName = null
          }
          return
        }

        if (event.type === 'error') {
          app.log.error({ event }, 'OpenAI realtime error event')
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

        if (event.type === 'response.done' && event.response?.status === 'failed') {
          app.log.error({ event }, 'OpenAI response failed')
        }

        if (event.type === 'input_audio_buffer.speech_started' && responseStartTimestamp !== null) {
          if (lastAssistantItemId) {
            const elapsedMs = latestMediaTimestamp - responseStartTimestamp
            openAiWs.send(
              JSON.stringify({
                type: 'conversation.item.truncate',
                item_id: lastAssistantItemId,
                content_index: 0,
                audio_end_ms: Math.max(0, elapsedMs),
              }),
            )
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
          latestMediaTimestamp = 0
          responseStartTimestamp = null
          lastAssistantItemId = null
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
          if (openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.close()
          }
        }
      } catch (error) {
        app.log.error({ error }, 'Error processing Twilio media event')
      }
    })

    twilioSocket.on('close', () => {
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
