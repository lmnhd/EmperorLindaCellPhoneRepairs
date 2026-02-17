import { NextResponse } from 'next/server'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function twiml(content: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${content}</Response>`
  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

function resolveStreamUrl(): string | null {
  const voiceServerUrl = process.env.VOICE_SERVER_URL
  if (!voiceServerUrl) {
    return null
  }

  const trimmed = voiceServerUrl.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (trimmed.startsWith('wss://')) {
    return `${trimmed.replace(/\/$/, '')}/media-stream`
  }

  if (trimmed.startsWith('https://')) {
    return `${trimmed.replace(/^https:\/\//, 'wss://').replace(/\/$/, '')}/media-stream`
  }

  if (trimmed.startsWith('http://')) {
    return `${trimmed.replace(/^http:\/\//, 'ws://').replace(/\/$/, '')}/media-stream`
  }

  return null
}

export async function POST() {
  const streamUrl = resolveStreamUrl()

  if (!streamUrl) {
    return twiml(`
      <Say voice="Polly.Matthew">
        Sorry, our voice system is temporarily unavailable. Please text us and we can help right away.
      </Say>
    `)
  }

  return twiml(`
    <Connect>
      <Stream url="${escapeXml(streamUrl)}" />
    </Connect>
  `)
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio voice webhook is active and configured for Media Streams relay.',
    stream_target: resolveStreamUrl() ?? null,
  })
}
