'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Phone } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatApiResponse {
  reply: string
  sessionId: string
  error?: string
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hey! I'm LINDA, your assistant at EmperorLinda Cell Phone Repairs. I can help you book a repair, check availability, or answer questions. What can I do for you?",
  timestamp: new Date(),
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Always call real OpenAI via our Next.js API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          phone: 'web-chat',
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Connection failed' })) as { error?: string }
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const data: ChatApiResponse = await response.json()

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Unknown error'
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong: ${errorText}. You can also reach us by calling — tap the phone icon above!`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const twilioPhone = process.env.NEXT_PUBLIC_TWILIO_PHONE || '+18557995436'

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-5 py-4 glass-panel rounded-b-none border-b-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emperor-gold to-emperor-gold-dark flex items-center justify-center text-emperor-black font-display font-bold text-lg">
              L
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent-emerald rounded-full border-2 border-emperor-charcoal" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-emperor-cream text-sm">LINDA</h3>
            <p className="text-[11px] text-emperor-cream/40 font-mono">Online &bull; AI Assistant</p>
          </div>
        </div>
        <a
          href={`tel:${twilioPhone}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald hover:bg-accent-emerald/20 transition-all text-sm font-medium"
        >
          <Phone className="w-4 h-4" />
          Call
        </a>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="h-[400px] overflow-y-auto px-5 py-4 space-y-4 glass-panel rounded-none border-t-0 border-b-0 dot-pattern">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emperor-gold text-emperor-black rounded-br-md'
                  : 'bg-emperor-slate/80 text-emperor-cream/90 rounded-bl-md border border-emperor-gold/10'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start chat-bubble-enter">
            <div className="bg-emperor-slate/80 rounded-2xl rounded-bl-md px-5 py-4 border border-emperor-gold/10">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emperor-gold/60 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-emperor-gold/60 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-emperor-gold/60 typing-dot" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 glass-panel rounded-t-none border-t-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
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
  )
}
