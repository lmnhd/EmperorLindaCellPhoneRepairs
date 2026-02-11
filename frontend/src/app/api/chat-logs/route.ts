import { NextResponse } from 'next/server'
import { getAllChatLogs } from '@/lib/dynamodb'

// ---------------------------------------------------------------------------
// GET /api/chat-logs  —  retrieve all chat conversation logs from DynamoDB
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const logs = await getAllChatLogs()
    return NextResponse.json({
      status: 'success',
      logs,
      count: logs.length,
    })
  } catch (error: unknown) {
    console.error('GET /api/chat-logs error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch chat logs from DynamoDB' },
      { status: 500 },
    )
  }
}
