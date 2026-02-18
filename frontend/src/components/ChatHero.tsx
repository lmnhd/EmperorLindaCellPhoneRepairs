'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import TypewriterText from '@/components/TypewriterText'
import UserMessagePanel from '@/components/UserMessagePanel'
import HeroInputBar from '@/components/HeroInputBar'
import type { ChatApiResponse, ChatMessage } from '@/types/chat'
import heroImage from '@/app/public/image/iphone_broke_hero.png'

const WELCOME_MESSAGE = 'Welcome, need your phone repaired fast?'

const INITIAL_HERO_MESSAGE: ChatMessage = {
  id: 'assistant-initial-hero',
  role: 'assistant',
  content: WELCOME_MESSAGE,
  timestamp: new Date(),
}

const VoiceChat = dynamic(() => import('@/components/VoiceChat'), { ssr: false })

type PersonaKey = 'laidback' | 'professional' | 'hustler'
type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

interface BrandonStatePayload {
  status?: string
  location?: string
  notes?: string
  persona?: string
  voice?: string
}

interface StateApiResponse {
  status: string
  state?: BrandonStatePayload
}

interface VoiceHistoryEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const VALID_PERSONAS: PersonaKey[] = ['laidback', 'professional', 'hustler']
const VALID_VOICES: VoiceName[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

export default function ChatHero() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_HERO_MESSAGE])
  const [heroMessage, setHeroMessage] = useState(WELCOME_MESSAGE)
  const [heroTurn, setHeroTurn] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRequestingMic, setIsRequestingMic] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [brandonStatus, setBrandonStatus] = useState('available')
  const [brandonLocation, setBrandonLocation] = useState('shop')
  const [brandonNotes, setBrandonNotes] = useState('Walk-ins welcome')
  const [persona, setPersona] = useState<PersonaKey>('professional')
  const [voiceOverride, setVoiceOverride] = useState<VoiceName | undefined>(undefined)
  const [sessionId] = useState(() => `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch('/api/state', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as StateApiResponse
        const state = data.state

        if (!state) {
          return
        }

        if (typeof state.status === 'string' && state.status.trim().length > 0) {
          setBrandonStatus(state.status)
        }

        if (typeof state.location === 'string' && state.location.trim().length > 0) {
          setBrandonLocation(state.location)
        }

        if (typeof state.notes === 'string' && state.notes.trim().length > 0) {
          setBrandonNotes(state.notes)
        }

        if (typeof state.persona === 'string' && VALID_PERSONAS.includes(state.persona as PersonaKey)) {
          setPersona(state.persona as PersonaKey)
        }

        if (typeof state.voice === 'string' && VALID_VOICES.includes(state.voice as VoiceName)) {
          setVoiceOverride(state.voice as VoiceName)
        }
      } catch {
        // Keep defaults when state fetch fails.
      }
    }

    void loadState()
  }, [])

  const busy = useMemo(() => isLoading || isRequestingMic, [isLoading, isRequestingMic])
  const hasConversationHistory = messages.some((message) => message.role === 'user')
  const voiceHandoffPrompt = hasConversationHistory
    ? 'We are continuing an active web chat in this same session. Do not re-introduce yourself. Start with one short sentence acknowledging we switched to voice, then continue helping based on prior context.'
    : undefined

  const sendMessage = async (content: string) => {
    setVoiceError(null)

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((previous) => [...previous, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId,
          phone: 'web-chat',
        }),
      })

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({ error: 'Unable to contact the chat service.' })) as {
          error?: string
        }

        throw new Error(errorResponse.error || `Chat request failed with status ${response.status}`)
      }

      const data = await response.json() as ChatApiResponse

      const safeReply = typeof data.reply === 'string' && data.reply.trim().length > 0
        ? data.reply
        : "I'm here — what would you like to do next?"

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: safeReply,
        timestamp: new Date(),
      }

      setMessages((previous) => [...previous, assistantMessage])
      setHeroMessage(safeReply)
      setHeroTurn((current) => current + 1)
    } catch (error: unknown) {
      const fallbackText = error instanceof Error
        ? `Sorry, I hit an issue: ${error.message}`
        : 'Sorry, I hit an issue while trying to answer.'

      const assistantMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: fallbackText,
        timestamp: new Date(),
      }

      setMessages((previous) => [...previous, assistantMessage])
      setHeroMessage(fallbackText)
      setHeroTurn((current) => current + 1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceCallEnd = (history: VoiceHistoryEntry[]) => {
    if (history.length > 0) {
      const voiceMessages: ChatMessage[] = history.map((entry, index) => ({
        id: `voice-${entry.role}-${entry.timestamp}-${index}`,
        role: entry.role,
        content: entry.content,
        timestamp: new Date(entry.timestamp),
      }))

      setMessages((previous) => {
        const existingKeys = new Set(
          previous.map((message) => `${message.role}|${message.content}|${message.timestamp.getTime()}`),
        )

        const uniqueVoiceMessages = voiceMessages.filter(
          (message) => !existingKeys.has(`${message.role}|${message.content}|${message.timestamp.getTime()}`),
        )

        return uniqueVoiceMessages.length > 0
          ? [...previous, ...uniqueVoiceMessages]
          : previous
      })

      const latestAssistantMessage = [...voiceMessages]
        .reverse()
        .find((message) => message.role === 'assistant')

      if (latestAssistantMessage) {
        setHeroMessage(latestAssistantMessage.content)
        setHeroTurn((current) => current + 1)
      }
    }

    setIsVoiceMode(false)
  }

  const handleMicClick = async () => {
    if (busy || isVoiceMode) {
      return
    }

    setVoiceError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Microphone is not supported in this browser. Try Chrome or Edge.')
      return
    }

    try {
      setIsRequestingMic(true)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setIsVoiceMode(true)
    } catch {
      setVoiceError('Microphone access was denied. Please allow access and try again.')
    } finally {
      setIsRequestingMic(false)
    }
  }

  if (isVoiceMode) {
    return (
      <VoiceChat
        persona={persona}
        onEndCall={handleVoiceCallEnd}
        brandonStatus={brandonStatus}
        brandonLocation={brandonLocation}
        brandonNotes={brandonNotes}
        voiceOverride={voiceOverride}
        sessionId={sessionId}
        handoffPrompt={voiceHandoffPrompt}
      />
    )
  }

  return (
    <section className="relative isolate min-h-[calc(100vh-78px)] overflow-hidden">
      <Image
        src={heroImage}
        alt="Cracked iPhone transforming into a like-new iPhone"
        fill
        priority
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-gradient-to-br from-emperor-black/80 via-emperor-black/65 to-emperor-charcoal/80" />
      <div className="absolute inset-0 dot-pattern opacity-35" />
      <div className="absolute inset-0 noise-overlay" />

      <UserMessagePanel messages={messages} />

      <div className="relative z-20 mx-auto flex min-h-[calc(100vh-78px)] w-full max-w-7xl flex-col items-center justify-between px-6 pb-10 pt-20 lg:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-5xl"
        >
          <p className="mb-6 text-center text-[11px] uppercase tracking-[0.28em] text-emperor-gold/75">Agent Messaging Surface</p>
          <TypewriterText
            text={heroMessage}
            responseKey={heroTurn}
            speed={24}
            isLoading={busy}
            className="max-w-4xl mx-auto text-center"
          />
        </motion.div>

        <div className="flex flex-col items-center w-full gap-6 mt-12">
          <HeroInputBar
            isLoading={busy}
            onSend={sendMessage}
            onMicClick={handleMicClick}
          />

          {voiceError && (
            <p className="max-w-2xl px-4 text-xs text-center text-accent-red/85">
              {voiceError}
            </p>
          )}

          <a
            href="#services"
            className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-emperor-cream/55 hover:text-emperor-gold transition"
          >
            Scroll
            <ChevronDown className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 hero-gradient-overlay h-36" />
    </section>
  )
}
