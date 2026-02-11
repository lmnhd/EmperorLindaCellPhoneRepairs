import { NextRequest } from 'next/server'
import OpenAI from 'openai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

const VALID_VOICES: VoiceName[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ---------------------------------------------------------------------------
// GET /api/tts/stream?text=...&voice=...
//
// A GET-accessible TTS endpoint so Twilio <Play> can fetch audio by URL.
// This ensures phone calls use the SAME OpenAI TTS engine as the web demo,
// giving customers a consistent voice experience across both channels.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const text = req.nextUrl.searchParams.get('text')
    const voiceParam = req.nextUrl.searchParams.get('voice') as VoiceName | null

    if (!text?.trim()) {
      return new Response('Missing text parameter', { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response('OPENAI_API_KEY not configured', { status: 500 })
    }

    const voice: VoiceName = voiceParam && VALID_VOICES.includes(voiceParam) ? voiceParam : 'onyx'

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed: 1.05, // Slightly faster for natural conversation feel
    })

    const audioBuffer = await mp3Response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error: unknown) {
    console.error('TTS stream error:', error)
    return new Response('TTS generation failed', { status: 500 })
  }
}
