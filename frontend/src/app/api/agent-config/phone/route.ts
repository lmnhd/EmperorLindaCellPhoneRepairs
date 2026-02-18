import { NextResponse } from 'next/server'
import { getBrandonState } from '@/lib/dynamodb'
import { assembleAgentChannelConfig } from '@/lib/agentConfig'

export async function GET() {
  try {
    const state = await getBrandonState()
    const assembled = assembleAgentChannelConfig(state, 'phone')

    return NextResponse.json({
      system_prompt: assembled.systemPrompt,
      voice: assembled.voice,
      assistant_name: state.assistant_name ?? 'LINDA',
      temperature: assembled.temperature,
      source: assembled.source,
      persona: assembled.persona,
      greeting: state.greeting ?? '',
    })
  } catch (error: unknown) {
    console.error('GET /api/agent-config/phone error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to assemble phone prompt' },
      { status: 500 },
    )
  }
}
