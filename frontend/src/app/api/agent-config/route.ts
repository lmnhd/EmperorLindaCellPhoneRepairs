import { NextRequest, NextResponse } from 'next/server'
import { getBrandonState, updateBrandonState, type BrandonState } from '@/lib/dynamodb'
import { KNOWN_AGENT_CONFIG_DEFAULTS, type AgentConfigKey } from '@/lib/agentConfig'

interface AgentConfigUpdateBody {
  updates?: Record<string, string | number | boolean>
}

function coerceToString(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return value
  }
  return String(value)
}

export async function GET() {
  try {
    const state = await getBrandonState()
    const stateRecord = state as unknown as Record<string, unknown>

    const values = Object.fromEntries(
      Object.entries(KNOWN_AGENT_CONFIG_DEFAULTS).map(([key, fallback]) => {
        const current = stateRecord[key]
        if (typeof current === 'string') {
          return [key, current]
        }
        if (typeof current === 'number' || typeof current === 'boolean') {
          return [key, String(current)]
        }
        return [key, fallback]
      }),
    )

    return NextResponse.json({
      status: 'success',
      values,
      defaults: KNOWN_AGENT_CONFIG_DEFAULTS,
    })
  } catch (error: unknown) {
    console.error('GET /api/agent-config error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch agent config' },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as AgentConfigUpdateBody
    const updates = body.updates ?? {}

    const validEntries = Object.entries(updates).filter(([key]) =>
      Object.prototype.hasOwnProperty.call(KNOWN_AGENT_CONFIG_DEFAULTS, key),
    ) as Array<[AgentConfigKey, string | number | boolean]>

    if (validEntries.length === 0) {
      return NextResponse.json({
        status: 'success',
        updated_keys: [],
        message: 'No valid keys to update',
      })
    }

    const stateUpdates: Partial<BrandonState> = {}
    for (const [key, value] of validEntries) {
      stateUpdates[key] = coerceToString(value) as never
    }

    await updateBrandonState(stateUpdates)

    return NextResponse.json({
      status: 'success',
      updated_keys: validEntries.map(([key]) => key),
    })
  } catch (error: unknown) {
    console.error('PUT /api/agent-config error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to update agent config' },
      { status: 500 },
    )
  }
}
