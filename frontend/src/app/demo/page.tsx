'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Zap,
  Dumbbell,
  Wrench,
  Coffee,
  Moon,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Shield,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatApiResponse {
  reply: string
  sessionId: string
  brandonState?: { status: string; notes: string }
  error?: string
}

interface StatusPreset {
  key: string
  label: string
  icon: typeof Wrench
  status: string
  notes: string
  color: string
  bg: string
  border: string
}

// ---------------------------------------------------------------------------
// Status presets
// ---------------------------------------------------------------------------

const STATUS_PRESETS: StatusPreset[] = [
  {
    key: 'shop',
    label: 'At Shop',
    icon: Wrench,
    status: 'available',
    notes: 'Walk-ins welcome',
    color: 'text-accent-emerald',
    bg: 'bg-accent-emerald/10',
    border: 'border-accent-emerald/20',
  },
  {
    key: 'gym',
    label: 'At Gym',
    icon: Dumbbell,
    status: 'gym',
    notes: 'Back in 1-2 hours',
    color: 'text-emperor-gold',
    bg: 'bg-emperor-gold/10',
    border: 'border-emperor-gold/20',
  },
  {
    key: 'lunch',
    label: 'On Break',
    icon: Coffee,
    status: 'unavailable',
    notes: 'Quick lunch break, back in 30 min',
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10',
    border: 'border-accent-amber/20',
  },
  {
    key: 'closed',
    label: 'Closed',
    icon: Moon,
    status: 'unavailable',
    notes: 'Shop is closed for the day. Opens 9 AM tomorrow.',
    color: 'text-emperor-cream/40',
    bg: 'bg-emperor-cream/5',
    border: 'border-emperor-cream/10',
  },
]

// ---------------------------------------------------------------------------
// Suggested prompts for first-timers
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  'My iPhone 15 screen is cracked, can you fix it?',
  'How much for a battery replacement?',
  'Do you have any open spots today?',
  'I dropped my phone in water, help!',
  'Can I get a discount if I bring two phones?',
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function LiveDemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeStatus, setActiveStatus] = useState('shop')
  const [sessionId] = useState(() => `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [messageCount, setMessageCount] = useState(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const activePreset = STATUS_PRESETS.find((p) => p.key === activeStatus) || STATUS_PRESETS[0]

  // -------------------------------------------------------------------------
  // Send message to real OpenAI
  // -------------------------------------------------------------------------

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const preset = STATUS_PRESETS.find((p) => p.key === activeStatus) || STATUS_PRESETS[0]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
          phone: 'demo-user',
          brandonStatus: preset.status,
          brandonNotes: preset.notes,
        }),
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const data: ChatApiResponse = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        },
      ])
      setMessageCount((c) => c + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Connection issue: ${msg}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const resetChat = () => {
    setMessages([])
    setMessageCount(0)
  }

  // -------------------------------------------------------------------------
  // Change Brandon's status
  // -------------------------------------------------------------------------

  const switchStatus = async (presetKey: string) => {
    setActiveStatus(presetKey)
    const preset = STATUS_PRESETS.find((p) => p.key === presetKey)
    if (!preset) return

    // Update the server-side state
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: preset.status,
        notes: preset.notes,
      }),
    })

    // Show a system-style message so the user sees the change
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: `[Status changed to "${preset.label}"] — LINDA will now respond with this context. Try messaging again to see the difference!`,
        timestamp: new Date(),
      },
    ])
  }

  return (
    <main className="min-h-screen bg-emperor-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-emperor-black/80 border-b border-emperor-gold/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-lg hover:bg-emperor-cream/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-emperor-cream/50" />
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emperor-gold" />
              <span className="font-display font-semibold text-sm">Live AI Demo</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">
                REAL AI
              </span>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 text-xs text-emperor-cream/40 hover:text-emperor-cream/60 transition-colors font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">
          {/* ---------------------------------------------------------------- */}
          {/* Left sidebar: Controls + context */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-6 lg:sticky lg:top-20">
            {/* Intro card */}
            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emperor-gold" />
                <h3 className="font-display font-semibold text-sm">This is real AI</h3>
              </div>
              <p className="text-xs text-emperor-cream/40 leading-relaxed">
                Every response comes from OpenAI. Go off-script — ask anything.
                LINDA adapts in real-time based on Brandon&apos;s status below.
              </p>
            </div>

            {/* Brandon's Status Toggle */}
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-emperor-cream/30 uppercase tracking-wider">
                  Brandon&apos;s Status
                </p>
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono ${activePreset.bg} ${activePreset.color} ${activePreset.border} border`}
                >
                  <activePreset.icon className="w-3 h-3" />
                  {activePreset.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => switchStatus(preset.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      activeStatus === preset.key
                        ? `${preset.bg} ${preset.color} ${preset.border} ring-1 ring-offset-1 ring-offset-emperor-charcoal ring-emperor-gold/20`
                        : 'border-emperor-gold/5 text-emperor-cream/30 hover:text-emperor-cream/50 hover:bg-emperor-cream/5'
                    }`}
                  >
                    <preset.icon className="w-3.5 h-3.5" />
                    {preset.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-emperor-cream/20 leading-relaxed">
                Change the status and send a message — watch LINDA adapt her tone,
                urgency, and availability info instantly.
              </p>
            </div>

            {/* Stats */}
            <div className="glass-panel p-5">
              <p className="text-xs font-mono text-emperor-cream/30 uppercase tracking-wider mb-3">
                Session
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-emperor-cream/[0.03]">
                  <p className="text-lg font-display font-bold text-emperor-cream">
                    {messageCount}
                  </p>
                  <p className="text-[10px] text-emperor-cream/30 font-mono">AI Replies</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-emperor-cream/[0.03]">
                  <p className="text-lg font-display font-bold text-emperor-gold">
                    {messages.filter((m) => m.role === 'user').length}
                  </p>
                  <p className="text-[10px] text-emperor-cream/30 font-mono">Messages</p>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Right: Chat interface */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 glass-panel rounded-b-none border-b-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emperor-gold to-emperor-gold-dark flex items-center justify-center text-emperor-black font-display font-bold text-lg">
                  L
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent-emerald rounded-full border-2 border-emperor-charcoal" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-emperor-cream text-sm">
                  LINDA
                </h3>
                <p className="text-[11px] text-emperor-cream/40 font-mono">
                  Powered by OpenAI &bull; Real AI Responses
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
                <span className="text-[10px] font-mono text-accent-emerald">LIVE</span>
              </div>
            </div>

            {/* Messages area */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4 glass-panel rounded-none border-t-0 border-b-0"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emperor-gold/20 to-emperor-gold-dark/20 flex items-center justify-center mb-5 border border-emperor-gold/10">
                    <MessageSquare className="w-8 h-8 text-emperor-gold/60" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-emperor-cream/80 mb-2">
                    Talk to LINDA
                  </h3>
                  <p className="text-xs text-emperor-cream/30 mb-6 max-w-sm leading-relaxed">
                    This is a real AI assistant. Ask about repairs, pricing, availability — 
                    or go completely off-script. She can handle it.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        disabled={isLoading}
                        className="px-3 py-2 rounded-xl text-xs text-emperor-cream/50 bg-emperor-cream/[0.04] border border-emperor-gold/5 hover:bg-emperor-gold/10 hover:text-emperor-gold hover:border-emperor-gold/20 transition-all disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emperor-gold text-emperor-black rounded-br-md'
                        : msg.content.startsWith('[Status')
                          ? 'bg-emperor-cream/5 text-emperor-cream/40 rounded-bl-md border border-emperor-gold/5 italic text-xs'
                          : msg.content.startsWith('Connection issue')
                            ? 'bg-accent-red/10 text-accent-red/80 rounded-bl-md border border-accent-red/20'
                            : 'bg-emperor-slate/80 text-emperor-cream/90 rounded-bl-md border border-emperor-gold/10'
                    }`}
                  >
                    {msg.role === 'assistant' && !msg.content.startsWith('[Status') && !msg.content.startsWith('Connection issue') && (
                      <div className="flex items-center gap-1 mb-1.5 opacity-40">
                        <Zap className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-mono font-bold">LINDA</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-fade-up">
                  <div className="bg-emperor-slate/80 rounded-2xl rounded-bl-md px-5 py-4 border border-emperor-gold/10">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emperor-gold/60 animate-bounce [animation-delay:0ms]" />
                        <div className="w-2 h-2 rounded-full bg-emperor-gold/60 animate-bounce [animation-delay:150ms]" />
                        <div className="w-2 h-2 rounded-full bg-emperor-gold/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-[10px] font-mono text-emperor-cream/20 ml-1">
                        thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* End spacer removed - using container scrollTop */}
            </div>

            {/* Input bar */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-4 py-3 glass-panel rounded-t-none border-t-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type anything — this is real AI..."
                className="flex-1 bg-transparent text-emperor-cream placeholder:text-emperor-cream/25 text-sm focus:outline-none py-2 px-1"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-emperor-gold text-emperor-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emperor-gold-light transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
