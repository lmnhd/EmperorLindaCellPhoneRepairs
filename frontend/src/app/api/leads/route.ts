import { NextResponse } from 'next/server'
import { getAllLeads, deleteAllLeads } from '@/lib/dynamodb'

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
