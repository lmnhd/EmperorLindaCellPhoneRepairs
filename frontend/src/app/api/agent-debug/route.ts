import { NextResponse } from 'next/server'
import {
  addAgentDebugEvent,
  clearAgentDebugEvents,
  getAgentDebugEvents,
} from '@/lib/agentDebugStore'

interface AgentDebugEventRequest {
  source?: string
  event?: string
  sessionId?: string
  data?: Record<string, unknown>
  timestamp?: number
}

export async function GET() {
  const events = getAgentDebugEvents()
  return NextResponse.json({
    status: 'success',
    count: events.length,
    events,
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgentDebugEventRequest

    if (!body.source || !body.event) {
      return NextResponse.json(
        { status: 'error', message: 'source and event are required' },
        { status: 400 },
      )
    }

    addAgentDebugEvent({
      source: body.source,
      event: body.event,
      sessionId: body.sessionId,
      data: body.data,
      timestamp: body.timestamp ?? Date.now(),
    })

    return NextResponse.json({ status: 'success' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to store debug event'
    return NextResponse.json({ status: 'error', message }, { status: 500 })
  }
}

export async function DELETE() {
  const deleted = clearAgentDebugEvents()
  return NextResponse.json({
    status: 'success',
    deleted,
  })
}
