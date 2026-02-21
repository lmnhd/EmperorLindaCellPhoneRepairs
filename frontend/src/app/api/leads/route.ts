import { NextResponse } from 'next/server'
import { createLead, getAllLeads, deleteAllLeads } from '@/lib/dynamodb'

interface LeadIntakeBody {
  phone?: string
  customer_name?: string
  source?: string
  notes?: string
  repair_type?: string
  device?: string
}

// ---------------------------------------------------------------------------
// GET /api/leads  —  retrieve all bookings from DynamoDB (newest first)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const leads = await getAllLeads()
    return NextResponse.json(
      {
        status: 'success',
        leads,
        count: leads.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    )
  } catch (error: unknown) {
    console.error('GET /api/leads error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch leads from DynamoDB' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/leads  —  delete all leads from DynamoDB
// ---------------------------------------------------------------------------

export async function DELETE() {
  try {
    const deletedCount = await deleteAllLeads()
    return NextResponse.json({
      status: 'success',
      message: `Deleted ${deletedCount} lead entries`,
      deleted: deletedCount,
    })
  } catch (error: unknown) {
    console.error('DELETE /api/leads error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete leads from DynamoDB' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/leads  —  create a lead from channel intake (e.g. Twilio voice)
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LeadIntakeBody
    const phone = typeof body.phone === 'string' ? body.phone.trim() : 'unknown'
    const customerName = typeof body.customer_name === 'string' ? body.customer_name.trim() : ''
    const source = typeof body.source === 'string' && body.source.trim().length > 0
      ? body.source.trim()
      : 'twilio-voice'
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
    const repairType = typeof body.repair_type === 'string' && body.repair_type.trim().length > 0
      ? body.repair_type.trim()
      : 'phone_inquiry'
    const device = typeof body.device === 'string' && body.device.trim().length > 0
      ? body.device.trim()
      : 'Unknown Device'

    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const leadId = await createLead(
      phone || 'unknown',
      repairType,
      device,
      date,
      time,
      'callback',
      notes || 'Inbound phone call',
      customerName || undefined,
      source,
    )

    return NextResponse.json({
      status: 'success',
      lead_id: leadId,
      source,
      phone,
    })
  } catch (error: unknown) {
    console.error('POST /api/leads error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to create lead' },
      { status: 500 },
    )
  }
}
