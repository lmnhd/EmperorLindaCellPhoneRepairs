import { NextResponse } from 'next/server'
import { getBrandonState } from '@/lib/dynamodb'
import { assembleAgentChannelConfig } from '@/lib/agentConfig'

export async function GET() {
  try {
    const state = await getBrandonState()
    const assembled = assembleAgentChannelConfig(state, 'chat')

    return NextResponse.json({
      system_prompt: assembled.systemPrompt,
      temperature: assembled.temperature,
      source: assembled.source,
      persona: assembled.persona,
      voice: assembled.voice,
    })
  } catch (error: unknown) {
    console.error('GET /api/agent-config/chat error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to assemble chat prompt' },
      { status: 500 },
    )
  }
}
