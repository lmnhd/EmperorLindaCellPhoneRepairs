import { NextResponse } from 'next/server'
import { getAllLeads } from '@/lib/dynamodb'

// ---------------------------------------------------------------------------
// GET /api/leads  —  retrieve all bookings from DynamoDB (newest first)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const leads = await getAllLeads()
    return NextResponse.json({
      status: 'success',
      leads,
      count: leads.length,
    })
  } catch (error: unknown) {
    console.error('GET /api/leads error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch leads from DynamoDB' },
      { status: 500 },
    )
  }
}
