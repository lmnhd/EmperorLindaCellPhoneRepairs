import { NextResponse } from 'next/server'
import { getAllChatLogs, deleteAllChatLogs } from '@/lib/dynamodb'

interface ChatLogWriteMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatLogWriteBody {
  sessionId?: string
  source?: string
  messages?: ChatLogWriteMessage[]
}

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
// POST /api/chat-logs  —  persist a conversation transcript
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatLogWriteBody
    const sessionId = body.sessionId?.trim()
    const source = body.source?.trim()
    const incomingMessages = Array.isArray(body.messages) ? body.messages : []

    if (!sessionId || !source || incomingMessages.length === 0) {
      console.warn('[ChatLogsAPI] reject_invalid_payload', {
        hasSessionId: Boolean(sessionId),
        hasSource: Boolean(source),
        incomingCount: incomingMessages.length,
      })
      return NextResponse.json(
        { status: 'error', message: 'sessionId, source, and messages are required' },
        { status: 400 },
      )
    }

    const { saveChatLog } = await import('@/lib/dynamodb')

    const messages = incomingMessages
      .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string' && message.content.trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
        timestamp: Number.isFinite(message.timestamp) && message.timestamp > 0
          ? Math.floor(message.timestamp)
          : Math.floor(Date.now() / 1000),
      }))

    if (messages.length === 0) {
      console.warn('[ChatLogsAPI] reject_no_valid_messages', {
        sessionId,
        source,
        incomingCount: incomingMessages.length,
      })
      return NextResponse.json(
        { status: 'error', message: 'No valid transcript messages provided' },
        { status: 400 },
      )
    }

    console.info('[ChatLogsAPI] persist_start', {
      sessionId,
      source,
      count: messages.length,
      firstRole: messages[0]?.role,
      firstSnippet: messages[0]?.content.slice(0, 80),
    })

    await saveChatLog(sessionId, source, messages)

    console.info('[ChatLogsAPI] persist_success', {
      sessionId,
      source,
      count: messages.length,
    })

    return NextResponse.json({
      status: 'success',
      saved: messages.length,
      sessionId,
      source,
    })
  } catch (error: unknown) {
    console.error('POST /api/chat-logs error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to save chat log transcript' },
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
