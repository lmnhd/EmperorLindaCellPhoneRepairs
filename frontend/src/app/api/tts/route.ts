import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

interface TTSRequestBody {
  text: string
  voice?: VoiceName
}

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ---------------------------------------------------------------------------
// POST /api/tts — Generate speech audio from text via OpenAI TTS
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TTSRequestBody

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 },
      )
    }

    const voice: VoiceName = body.voice ?? 'onyx'

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: body.text,
      speed: 1.05, // Slightly faster for natural conversation feel
    })

    // Get the audio as an ArrayBuffer and return as audio/mpeg
    const audioBuffer = await mp3Response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: unknown) {
    console.error('TTS API error:', error)
    const message = error instanceof Error ? error.message : 'TTS generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
