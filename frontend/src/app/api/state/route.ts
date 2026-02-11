import { NextRequest, NextResponse } from 'next/server'
import { getBrandonState, updateBrandonState } from '@/lib/dynamodb'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StateUpdateBody {
  status?: string
  location?: string
  notes?: string
  special_info?: string
  voice?: string
  assistant_name?: string
  greeting?: string
  max_discount?: number
  ai_answers_calls?: boolean
  ai_answers_sms?: boolean
  auto_upsell?: boolean
}

// ---------------------------------------------------------------------------
// GET /api/state  —  retrieve Brandon's current state from DynamoDB
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const state = await getBrandonState()
    return NextResponse.json({
      status: 'success',
      state,
    })
  } catch (error: unknown) {
    console.error('GET /api/state error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch state from DynamoDB' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/state  —  update Brandon's state in DynamoDB
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StateUpdateBody

    const updated = await updateBrandonState({
      status: body.status,
      location: body.location,
      notes: body.notes,
      special_info: body.special_info,
      voice: body.voice,
      assistant_name: body.assistant_name,
      greeting: body.greeting,
      max_discount: body.max_discount,
      ai_answers_calls: body.ai_answers_calls,
      ai_answers_sms: body.ai_answers_sms,
      auto_upsell: body.auto_upsell,
    })

    return NextResponse.json({
      status: 'success',
      state: updated,
    })
  } catch (error: unknown) {
    console.error('POST /api/state error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to update state in DynamoDB' },
      { status: 500 },
    )
  }
}
