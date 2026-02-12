import { NextRequest, NextResponse } from 'next/server'
import { getBrandonState } from '@/lib/dynamodb'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatApiResponse {
  reply: string
  sessionId: string
}

type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

// ---------------------------------------------------------------------------
// Twilio Voice Webhook — Handles real phone calls via Twilio Programmable Voice
//
// Flow:
//   1. Caller dials the Twilio number
//   2. Twilio POSTs to this endpoint (initial call)
//   3. We greet the caller using OpenAI TTS (<Play>) and start <Gather>
//   4. Caller speaks → Twilio transcribes → POSTs SpeechResult back here
//   5. We send the transcript to our /api/chat pipeline
//   6. We respond with OpenAI TTS <Play> + another <Gather> to continue
//   7. Repeat until caller hangs up
//
// Both the web voice demo AND phone calls now use the same OpenAI TTS engine
// with the same voice selected in the dashboard — ensuring a consistent
// experience between the demo and production.
// ---------------------------------------------------------------------------

function twiml(content: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${content}</Response>`
  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

/**
 * Build a TwiML block that plays OpenAI TTS audio, then gathers speech input.
 * Falls back to Amazon Polly <Say> if TTS audio URL is not available.
 */
function gatherWithPlay(actionUrl: string, audioUrl: string, callSid: string): string {
  const action = `${actionUrl}?callSid=${encodeURIComponent(callSid)}`
  return `
    <Play>${escapeXml(audioUrl)}</Play>
    <Gather input="speech" action="${action}" method="POST" speechTimeout="auto" language="en-US">
    </Gather>
    <Say voice="Polly.Matthew">I didn't catch that. Feel free to call back anytime!</Say>
  `
}

/** Fallback: Polly-based gather (used if TTS generation fails) */
function gatherWithSay(actionUrl: string, sayText: string, callSid: string): string {
  const action = `${actionUrl}?callSid=${encodeURIComponent(callSid)}`
  return `
    <Say voice="Polly.Matthew" language="en-US">${escapeXml(sayText)}</Say>
    <Gather input="speech" action="${action}" method="POST" speechTimeout="auto" language="en-US">
    </Gather>
    <Say voice="Polly.Matthew">I didn't catch that. Feel free to call back anytime!</Say>
  `
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generate OpenAI TTS audio and return a publicly-accessible data URI
 * that Twilio can <Play>. We encode as base64 and serve from a temporary
 * endpoint, since Twilio needs a URL it can fetch.
 *
 * Instead we use the /api/tts endpoint and return the audio inline via
 * a publicly routable URL that Twilio can reach.
 */
async function generateTTSUrl(
  baseUrl: string,
  text: string,
  voice: VoiceName,
): Promise<string | null> {
  try {
    // Generate a cache-busting key so Twilio fetches fresh audio
    const cacheKey = Date.now().toString(36)
    const params = new URLSearchParams({
      text,
      voice,
      _k: cacheKey,
    })
    // Use a GET-friendly TTS endpoint URL that Twilio can fetch
    return `${baseUrl}/api/tts/stream?${params.toString()}`
  } catch (err) {
    console.error('Failed to build TTS URL:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// POST /api/twilio-voice — handles both initial call and speech results
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const formData = await req.formData()
    const speechResult = formData.get('SpeechResult') as string | null
    const callSid = (formData.get('CallSid') as string) ||
      (req.nextUrl.searchParams.get('callSid') as string) ||
      `twilio-${Date.now()}`

    // Build the action URL for Gather callbacks
    const baseUrl = req.nextUrl.origin
    const actionUrl = `${baseUrl}/api/twilio-voice`

    // Fetch the owner's full preferences from state
    let preferredVoice: VoiceName = 'onyx'
    let savedPersona: string = 'professional'
    let savedGreeting: string = ''
    let savedAssistantName: string = 'LINDA'
    try {
      const state = await getBrandonState()
      preferredVoice = (state.voice as VoiceName) || 'onyx'
      savedPersona = state.persona || 'professional'
      savedGreeting = state.greeting || ''
      savedAssistantName = state.assistant_name || 'LINDA'
    } catch {
      // Defaults above are fine if state fetch fails
    }

    // --- Initial call (no SpeechResult yet) ---
    if (!speechResult) {
      // If the owner saved a custom greeting, use it directly instead of
      // burning an OpenAI call. Otherwise ask the AI to generate one.
      let greeting = ''

      if (savedGreeting) {
        greeting = savedGreeting
      } else {
        const chatRes = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `A customer is calling in right now. Greet them warmly as ${savedAssistantName} and ask what they need help with. Keep it very short — one or two sentences.`,
            sessionId: callSid,
            phone: callSid,
            persona: savedPersona,
          }),
        })

        greeting = `Hey! Thanks for calling EmperorLinda Cell Phone Repairs. This is ${savedAssistantName}. What can I help you with today?`
        if (chatRes.ok) {
          const data = (await chatRes.json()) as ChatApiResponse
          greeting = data.reply
        }
      }

      const ttsUrl = await generateTTSUrl(baseUrl, greeting, preferredVoice)
      if (ttsUrl) {
        return twiml(gatherWithPlay(actionUrl, ttsUrl, callSid))
      }
      return twiml(gatherWithSay(actionUrl, greeting, callSid))
    }

    // --- Subsequent turns (SpeechResult present) ---
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: speechResult,
        sessionId: callSid,
        phone: callSid,
        persona: savedPersona,
      }),
    })

    let reply = "Sorry, I'm having a little trouble right now. Can you try again?"
    if (chatRes.ok) {
      const data = (await chatRes.json()) as ChatApiResponse
      reply = data.reply
    }

    const ttsUrl = await generateTTSUrl(baseUrl, reply, preferredVoice)
    if (ttsUrl) {
      return twiml(gatherWithPlay(actionUrl, ttsUrl, callSid))
    }
    return twiml(gatherWithSay(actionUrl, reply, callSid))
  } catch (error: unknown) {
    console.error('Twilio voice webhook error:', error)
    return twiml(`
      <Say voice="Polly.Matthew">
        Sorry, we're experiencing technical difficulties. Please try again later.
      </Say>
    `)
  }
}

// Also handle GET for Twilio webhook validation
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio Voice webhook is active. Configure your Twilio phone number to POST to this URL.',
  })
}
