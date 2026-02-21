'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  MessageSquare,
  RefreshCw,
  Clock,
  User,
  Zap,
  ChevronDown,
  ChevronRight,
  Phone,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatLogMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatLogEntry {
  lead_id: string
  session_id: string
  source: string
  messages: ChatLogMessage[]
  message_count: number
  last_updated: number
  status: string
}

interface ChatLogOverlayProps {
  isOpen: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(unix: number): string {
  if (!unix) return '—'
  const d = new Date(unix * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return `Today ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
}

function sourceLabel(source: string): string {
  if (source === 'web-chat') return 'Landing Page'
  if (source.startsWith('voice')) return 'Voice Call'
  if (source.startsWith('demo')) return 'Live Demo'
  if (source.startsWith('+')) return source
  return source || 'Unknown'
}

function sourceColor(source: string): string {
  if (source === 'web-chat') return 'bg-accent-blue/15 text-accent-blue border-accent-blue/25'
  if (source.startsWith('voice')) return 'bg-purple-400/15 text-purple-400 border-purple-400/25'
  if (source.startsWith('demo')) return 'bg-emperor-gold/15 text-emperor-gold border-emperor-gold/25'
  return 'bg-emperor-cream/10 text-emperor-cream/50 border-emperor-cream/15'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatLogOverlay({ isOpen, onClose }: ChatLogOverlayProps) {
  const [logs, setLogs] = useState<ChatLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/chat-logs')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json() as { status: string; logs: ChatLogEntry[] }
      if (data.status === 'success' && Array.isArray(data.logs)) {
        setLogs(data.logs)
      }
    } catch (err) {
      console.error('Error fetching chat logs:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchLogs()
    }
  }, [isOpen, fetchLogs])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLogs()
  }

  if (!isOpen) return null

  const totalMessages = logs.reduce((sum, l) => sum + (l.message_count || 0), 0)
  const userMessages = logs.reduce(
    (sum, l) => sum + (l.messages?.filter((m) => m.role === 'user').length || 0),
    0
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel — slides in from the right */}
      <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-xl flex flex-col bg-emperor-black/95 border-l border-emperor-gold/10 shadow-2xl shadow-black/50 animate-slide-in-right">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emperor-gold/10 bg-emperor-charcoal/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emperor-gold/20 to-emperor-gold-dark/20 flex items-center justify-center border border-emperor-gold/15">
              <MessageSquare className="w-4.5 h-4.5 text-emperor-gold" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-emperor-cream">Chat Transcripts</h2>
              <p className="text-[10px] font-mono text-emperor-cream/30">
                {logs.length} session{logs.length !== 1 ? 's' : ''} &bull; {totalMessages} messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-emperor-cream/5 transition-colors text-emperor-cream/40 hover:text-emperor-cream/60"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-emperor-cream/5 transition-colors text-emperor-cream/40 hover:text-emperor-cream/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Summary Chips ─── */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-emperor-gold/5 bg-emperor-charcoal/20">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emperor-cream/[0.04] text-[10px] font-mono text-emperor-cream/40">
            <User className="w-3 h-3" />
            {userMessages} from customers
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emperor-cream/[0.04] text-[10px] font-mono text-emperor-cream/40">
            <Zap className="w-3 h-3" />
            {totalMessages - userMessages} AI replies
          </div>
        </div>

        {/* ─── Session List ─── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-6 h-6 border-2 border-emperor-gold/30 border-t-emperor-gold rounded-full animate-spin" />
              <p className="text-xs text-emperor-cream/30 font-mono">Loading transcripts...</p>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emperor-cream/[0.03] border border-emperor-cream/5 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-emperor-cream/15" />
              </div>
              <div>
                <p className="text-sm text-emperor-cream/40 font-medium">No conversations yet</p>
                <p className="text-xs text-emperor-cream/20 mt-1 max-w-xs">
                  Chat transcripts will appear here once customers start talking to LINDA.
                </p>
              </div>
            </div>
          )}

          {!loading && logs.length > 0 && (
            <div className="divide-y divide-emperor-gold/5">
              {logs.map((log) => {
                const isExpanded = expandedSession === log.session_id
                const msgCount = log.messages?.length || 0
                const preview = log.messages?.find((m) => m.role === 'user')?.content || 'No messages'

                return (
                  <div key={log.session_id} className="group">
                    {/* Session Header (clickable) */}
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : log.session_id)}
                      className="w-full text-left px-6 py-4 hover:bg-emperor-cream/[0.02] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-emperor-gold/60" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-emperor-cream/20 group-hover:text-emperor-cream/40 transition-colors" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${sourceColor(log.source)}`}>
                                {log.source?.startsWith('+') && <Phone className="w-2.5 h-2.5" />}
                                {sourceLabel(log.source)}
                              </span>
                              <span className="text-[10px] font-mono text-emperor-cream/20">
                                {msgCount} msg{msgCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-sm text-emperor-cream/60 truncate max-w-[300px]">
                              &ldquo;{preview.length > 80 ? preview.slice(0, 80) + '...' : preview}&rdquo;
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-emperor-cream/20 font-mono whitespace-nowrap mt-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(log.last_updated)}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Transcript */}
                    {isExpanded && log.messages && (
                      <div className="px-6 pb-5">
                        <div className="ml-7 space-y-2.5 border-l-2 border-emperor-gold/10 pl-4">
                          {log.messages.map((msg, i) => (
                            <div
                              key={`${log.session_id}-${i}`}
                              className="relative"
                            >
                              {/* Dot on the timeline */}
                              <div
                                className={`absolute -left-[21px] top-2 w-2 h-2 rounded-full border-2 ${
                                  msg.role === 'user'
                                    ? 'bg-accent-emerald/60 border-accent-emerald/30'
                                    : 'bg-emperor-gold/60 border-emperor-gold/30'
                                }`}
                              />
                              <div
                                className={`rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                                  msg.role === 'user'
                                    ? 'bg-accent-emerald/[0.06] text-emperor-cream/70 border border-accent-emerald/10'
                                    : 'bg-emperor-gold/[0.04] text-emperor-cream/60 border border-emperor-gold/8'
                                }`}
                              >
                                <span className="text-[9px] font-mono opacity-40 block mb-0.5 uppercase tracking-wider">
                                  {msg.role === 'user' ? 'Customer' : 'LINDA'}
                                </span>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Session metadata */}
                        <div className="ml-7 mt-3 flex items-center gap-3">
                          <span className="text-[9px] font-mono text-emperor-cream/15 tracking-wider">
                            SESSION {log.session_id.slice(0, 20)}...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="px-6 py-3 border-t border-emperor-gold/10 bg-emperor-charcoal/20">
          <p className="text-[10px] text-emperor-cream/15 font-mono text-center">
            Transcripts persisted in DynamoDB &bull; Auto-captured from all chat channels
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  )
}
