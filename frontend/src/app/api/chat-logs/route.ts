import { NextResponse } from 'next/server'
import { getAllChatLogs, deleteAllChatLogs } from '@/lib/dynamodb'

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

// ---------------------------------------------------------------------------
// DELETE /api/chat-logs  —  delete all chat logs from DynamoDB
// ---------------------------------------------------------------------------

export async function DELETE() {
  try {
    const deletedCount = await deleteAllChatLogs()
    return NextResponse.json({
      status: 'success',
      message: `Deleted ${deletedCount} chat log entries`,
      deleted: deletedCount,
    })
  } catch (error: unknown) {
    console.error('DELETE /api/chat-logs error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete chat logs from DynamoDB' },
      { status: 500 },
    )
  }
}
