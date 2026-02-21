'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useVoiceChat } from '@/hooks/useVoiceChat'

type PersonaKey = 'laidback' | 'professional' | 'hustler'
type VoiceName = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar' | 'fable' | 'onyx' | 'nova'
type CallState = 'calling' | 'connected' | 'ending'

const AUTO_END_IDLE_MS = 45_000

interface VoiceHistoryEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface VoiceChatProps {
  persona: PersonaKey
  onEndCall: (history: VoiceHistoryEntry[]) => void
  brandonStatus?: string
  brandonLocation?: string
  brandonNotes?: string
  voiceOverride?: VoiceName
  sessionId?: string
  handoffPrompt?: string
  initialAssistantMessage?: string
  renderMode?: 'full' | 'hero'
  onAssistantMessage?: (message: string) => void
  onVoiceStateChange?: (state: 'connecting' | 'speaking' | 'listening' | 'idle' | 'ending') => void
}

const PERSONA_LABELS: Record<PersonaKey, string> = {
  laidback: 'Chill Mode',
  professional: 'Professional',
  hustler: 'Hustler',
}

export default function VoiceChat({
  persona,
  onEndCall,
  brandonStatus,
  brandonLocation,
  brandonNotes,
  voiceOverride,
  sessionId,
  handoffPrompt,
  initialAssistantMessage,
  renderMode = 'full',
  onAssistantMessage,
  onVoiceStateChange,
}: VoiceChatProps) {
  const voice = useVoiceChat()
  const { connect, disconnect, setMicMuted, setSpeakerEnabled } = voice

  const [callState, setCallState] = useState<CallState>('calling')
  const [isConnecting, setIsConnecting] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [barHeights, setBarHeights] = useState<number[]>(Array(24).fill(4))
  const [endNotice, setEndNotice] = useState<string | null>(null)

  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const idleAutoEndTimerRef = useRef<NodeJS.Timeout | null>(null)
  const animFrameRef = useRef<number>(0)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)
  const hasConnectedRef = useRef(false)
  const hasEndedRef = useRef(false)
  const lastAssistantTsRef = useRef(0)
  const sessionIdRef = useRef<string>(sessionId ?? `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const latestTranscriptRef = useRef<VoiceHistoryEntry[]>([])
  const hasPersistedTranscriptRef = useRef(false)

  const transcript = useMemo(
    () => voice.transcripts.map((entry) => ({ role: entry.role, text: entry.text, timestamp: entry.timestamp })),
    [voice.transcripts],
  )

  const isAiSpeaking = voice.isAssistantSpeaking && isSpeakerOn
  const isListening = voice.isUserSpeaking && !isMuted
  const isProcessing = voice.status === 'connecting' || isConnecting
  const error = voice.error

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight
    }
  }, [transcript])

  useEffect(() => {
    const animate = () => {
      const bars: number[] = []
      const time = Date.now()

      for (let i = 0; i < 24; i++) {
        if (isAiSpeaking) {
          const base = 14
          const wave = Math.sin(time / 120 + i * 0.55) * 18
          const noise = Math.sin(time / 80 + i * 1.3) * 8
          bars.push(Math.max(3, base + wave + noise))
        } else if (isListening) {
          const base = 8
          const wave = Math.sin(time / 250 + i * 0.4) * 6
          const noise = Math.sin(time / 150 + i * 2.1) * 3
          bars.push(Math.max(3, base + wave + noise))
        } else if (isProcessing) {
          const base = 6
          const wave = Math.sin(time / 400 + i * 0.3) * 4
          bars.push(Math.max(3, base + wave))
        } else {
          const base = 4
          const wave = Math.sin(time / 800 + i * 0.25) * 2
          bars.push(Math.max(2, base + wave))
        }
      }

      setBarHeights(bars)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isAiSpeaking, isListening, isProcessing])

  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((value) => value + 1)
      }, 1000)
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
        callTimerRef.current = null
      }
    }
  }, [callState])

  const startVoiceSession = useCallback(async () => {
    if (hasConnectedRef.current || isConnecting) {
      return
    }

    hasEndedRef.current = false
    setEndNotice(null)
    setIsConnecting(true)

    try {
      await connect({
        persona,
        sessionId,
        brandonStatus,
        brandonLocation,
        brandonNotes,
        voiceOverride,
        handoffPrompt,
        initialAssistantMessage,
      })
      hasConnectedRef.current = true
      setCallState('connected')
    } catch {
      setCallState('calling')
    } finally {
      setIsConnecting(false)
    }
  }, [
    connect,
    persona,
    sessionId,
    brandonStatus,
    brandonLocation,
    brandonNotes,
    voiceOverride,
    handoffPrompt,
    initialAssistantMessage,
    isConnecting,
  ])

  useEffect(() => {
    const assistantMessages = transcript.filter((entry) => entry.role === 'assistant')
    const latest = assistantMessages[assistantMessages.length - 1]

    if (!latest || latest.timestamp <= lastAssistantTsRef.current) return

    lastAssistantTsRef.current = latest.timestamp
    onAssistantMessage?.(latest.text)
  }, [onAssistantMessage, transcript])

  useEffect(() => {
    latestTranscriptRef.current = transcript.map((entry) => ({
      role: entry.role,
      content: entry.text,
      timestamp: entry.timestamp,
    }))
  }, [transcript])

  const persistTranscript = useCallback((history: VoiceHistoryEntry[]) => {
    if (hasPersistedTranscriptRef.current || history.length === 0) {
      return
    }

    const messages = history
      .filter((entry) => entry.content.trim().length > 0)
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
        timestamp: Math.floor(entry.timestamp / 1000),
      }))

    if (messages.length === 0) {
      return
    }

    hasPersistedTranscriptRef.current = true

    const source = renderMode === 'hero' ? 'voice-web' : 'voice-demo'
    const payload = {
      sessionId: sessionIdRef.current,
      source,
      messages,
    }

    console.info('[VoiceTranscriptPersist] saving', {
      sessionId: sessionIdRef.current,
      source,
      count: messages.length,
    })

    void fetch('/api/chat-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        console.info('[VoiceTranscriptPersist] saved', {
          sessionId: sessionIdRef.current,
          source,
        })
      })
      .catch((error: unknown) => {
        hasPersistedTranscriptRef.current = false
        console.error('[VoiceTranscriptPersist] failed', {
          sessionId: sessionIdRef.current,
          source,
          error,
        })
      })
  }, [renderMode])

  useEffect(() => {
    if (callState === 'ending') {
      onVoiceStateChange?.('ending')
      return
    }

    if (callState === 'calling' || isProcessing) {
      onVoiceStateChange?.('connecting')
      return
    }

    if (isAiSpeaking) {
      onVoiceStateChange?.('speaking')
      return
    }

    if (isListening) {
      onVoiceStateChange?.('listening')
      return
    }

    onVoiceStateChange?.('idle')
  }, [callState, isAiSpeaking, isListening, isProcessing, onVoiceStateChange])

  useEffect(() => {
    return () => {
      persistTranscript(latestTranscriptRef.current)
      disconnect()
    }
  }, [disconnect, persistTranscript])

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const nextMuted = !previous
      setMicMuted(nextMuted)
      return nextMuted
    })
  }, [setMicMuted])

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((previous) => {
      const nextEnabled = !previous
      setSpeakerEnabled(nextEnabled)
      return nextEnabled
    })
  }, [setSpeakerEnabled])

  const endCall = useCallback(() => {
    if (hasEndedRef.current) {
      return
    }

    hasEndedRef.current = true
    setCallState('ending')

    const history: VoiceHistoryEntry[] = transcript.map((entry) => ({
      role: entry.role,
      content: entry.text,
      timestamp: entry.timestamp,
    }))

    persistTranscript(history)

    disconnect()

    setTimeout(() => {
      onEndCall(history)
    }, 700)
  }, [disconnect, onEndCall, persistTranscript, transcript])

  const clearIdleAutoEndTimer = useCallback(() => {
    if (idleAutoEndTimerRef.current) {
      clearTimeout(idleAutoEndTimerRef.current)
      idleAutoEndTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (callState !== 'connected') {
      clearIdleAutoEndTimer()
      return
    }

    if (isAiSpeaking || isListening || isProcessing) {
      clearIdleAutoEndTimer()
      return
    }

    clearIdleAutoEndTimer()
    idleAutoEndTimerRef.current = setTimeout(() => {
      setEndNotice('Call ended due to inactivity')
      endCall()
    }, AUTO_END_IDLE_MS)

    return () => {
      clearIdleAutoEndTimer()
    }
  }, [callState, clearIdleAutoEndTimer, endCall, isAiSpeaking, isListening, isProcessing])

  useEffect(() => {
    return () => {
      clearIdleAutoEndTimer()
    }
  }, [clearIdleAutoEndTimer])

  if (renderMode === 'hero') {
    const statusLabel =
      callState === 'calling'
        ? 'Tap to start voice'
        : callState === 'ending'
          ? 'Ending call…'
          : isAiSpeaking
            ? 'LINDA is speaking…'
            : isListening
              ? 'Listening…'
              : isProcessing
                ? 'Thinking…'
                : isMuted
                  ? 'Voice muted'
                  : 'Voice active'

    const statusTone =
      callState === 'calling'
        ? 'text-emperor-gold'
        : callState === 'ending'
          ? 'text-emperor-cream/50'
          : isAiSpeaking
            ? 'text-emperor-gold'
            : isListening
              ? 'text-accent-emerald'
              : isProcessing
                ? 'text-emperor-cream/60'
                : 'text-emperor-cream/65'

    return (
      <div className="absolute inset-x-0 bottom-6 z-40 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-emperor-black/70 backdrop-blur-xl shadow-2xl shadow-emperor-black/60 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <span className={`font-mono text-xs uppercase tracking-[0.18em] ${statusTone}`}>
              {statusLabel}
            </span>
            <span className="font-mono text-xs tabular-nums text-emperor-cream/45">
              {formatDuration(callDuration)}
            </span>
          </div>

          {error && (
            <p className="mt-2 text-xs text-accent-red/80">{error}</p>
          )}

          {callState === 'calling' ? (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={startVoiceSession}
                disabled={isProcessing}
                className="px-4 h-11 rounded-full flex items-center justify-center font-mono text-xs uppercase tracking-[0.14em] bg-emperor-gold text-emperor-black hover:bg-emperor-gold-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Starting…' : 'Start Voice'}
              </button>

              <button
                onClick={endCall}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-accent-red shadow-lg shadow-accent-red/30 hover:bg-accent-red/80 transition-all"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={toggleMute}
              disabled={callState !== 'connected'}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isMuted
                  ? 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                  : 'bg-emperor-slate/70 text-emperor-cream/65 border border-emperor-cream/10 hover:bg-emperor-slate'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={endCall}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-accent-red shadow-lg shadow-accent-red/30 hover:bg-accent-red/80 transition-all"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={toggleSpeaker}
              disabled={callState !== 'connected'}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                !isSpeakerOn
                  ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30'
                  : 'bg-emperor-slate/70 text-emperor-cream/65 border border-emperor-cream/10 hover:bg-emperor-slate'
              }`}
            >
              {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (callState === 'calling') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-emperor-charcoal via-emperor-black to-emperor-black">
        <div className="relative mb-12">
          <div className="absolute inset-0 rounded-full w-28 h-28 bg-emperor-gold/10 animate-ping" />
          <div
            className="absolute inset-0 rounded-full w-28 h-28 bg-emperor-gold/5"
            style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite 0.5s' }}
          />
          <div className="relative flex items-center justify-center rounded-full shadow-2xl w-28 h-28 bg-gradient-to-br from-emperor-gold to-emperor-gold-dark shadow-emperor-gold/30">
            <span className="text-4xl font-bold font-display text-emperor-black">L</span>
          </div>
        </div>

        <h2 className="mb-2 text-xl font-semibold font-display text-emperor-cream">
          EmperorLinda Repairs
        </h2>
        <p className="mb-1 font-mono text-sm text-emperor-cream/40">
          {PERSONA_LABELS[persona]}
        </p>
        <p className="mt-4 text-sm text-emperor-cream/50">
          {isProcessing ? 'connecting...' : 'tap start to connect'}
        </p>

        {error && (
          <p className="mt-3 px-6 text-center text-xs text-accent-red/80">{error}</p>
        )}

        <button
          onClick={startVoiceSession}
          disabled={isProcessing}
          className="mt-8 px-6 h-11 rounded-full font-mono text-xs uppercase tracking-[0.14em] bg-emperor-gold text-emperor-black hover:bg-emperor-gold-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Starting…' : 'Start Voice'}
        </button>

        <button
          onClick={endCall}
          className="flex items-center justify-center w-16 h-16 mt-16 transition-all rounded-full shadow-lg bg-accent-red shadow-accent-red/30 hover:bg-accent-red/80 active:scale-95"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    )
  }

  if (callState === 'ending') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emperor-black">
        <div className="flex items-center justify-center w-24 h-24 mb-6 rounded-full opacity-50 bg-emperor-slate">
          <PhoneOff className="w-10 h-10 text-emperor-cream/40" />
        </div>
        <p className="font-mono text-sm text-emperor-cream/40">
          {endNotice ?? 'Call ended'}
        </p>
        <p className="mt-1 font-mono text-xs text-emperor-cream/20">
          {formatDuration(callDuration)}
        </p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-emperor-charcoal via-emperor-black to-emperor-black">
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emperor-gold to-emperor-gold-dark">
              <span className="text-lg font-bold font-display text-emperor-black">L</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-emerald rounded-full border-2 border-emperor-black" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-display text-emperor-cream">
              LINDA
            </h3>
            <p className="text-[10px] text-emperor-cream/40 font-mono">
              {PERSONA_LABELS[persona]}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-emperor-gold tabular-nums">
            {formatDuration(callDuration)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-[10px] font-mono text-accent-emerald">CONNECTED</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-10">
        <div className="flex items-center justify-center gap-[3px] h-16">
          {barHeights.map((height, index) => (
            <div
              key={index}
              className="w-[3px] rounded-full transition-all duration-75"
              style={{
                height: `${height}px`,
                backgroundColor: isAiSpeaking
                  ? `rgba(212, 168, 67, ${0.5 + (height / 50) * 0.5})`
                  : isListening
                    ? `rgba(45, 212, 160, ${0.4 + (height / 30) * 0.4})`
                    : `rgba(245, 240, 232, ${0.15 + (height / 20) * 0.1})`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mb-4 text-center">
        {isAiSpeaking && (
          <span className="px-3 py-1 font-mono text-xs border rounded-full text-emperor-gold bg-emperor-gold/10 border-emperor-gold/20">
            LINDA is speaking...
          </span>
        )}
        {isListening && !isAiSpeaking && (
          <span className="px-3 py-1 font-mono text-xs border rounded-full text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20">
            Listening...
          </span>
        )}
        {isProcessing && !isAiSpeaking && (
          <span className="px-3 py-1 font-mono text-xs border rounded-full text-emperor-cream/40 bg-emperor-cream/5 border-emperor-cream/10">
            Processing...
          </span>
        )}
        {!isAiSpeaking && !isListening && !isProcessing && (
          <span className="px-3 py-1 font-mono text-xs text-emperor-cream/20">
            {isMuted ? 'Muted' : 'Ready'}
          </span>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 mx-6 mb-3 border rounded-xl bg-accent-red/10 border-accent-red/20">
          <p className="text-xs text-accent-red/70">{error}</p>
        </div>
      )}

      <div
        ref={transcriptContainerRef}
        className="flex-1 px-6 py-2 space-y-3 overflow-y-auto"
      >
        {transcript.map((entry, index) => (
          <div
            key={`${entry.timestamp}-${index}`}
            className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                entry.role === 'user'
                  ? 'bg-accent-emerald/15 text-accent-emerald/90 rounded-br-md border border-accent-emerald/20'
                  : 'bg-emperor-slate/60 text-emperor-cream/80 rounded-bl-md border border-emperor-gold/10'
              }`}
            >
              <span className="text-[9px] font-mono opacity-40 block mb-1">
                {entry.role === 'user' ? 'YOU' : 'LINDA'}
              </span>
              {entry.text}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pt-4 pb-10">
        {transcript.length === 0 && !isAiSpeaking && !isProcessing && (
          <p className="text-center text-[11px] text-emperor-cream/20 mb-6 font-mono">
            Say something like &quot;I cracked my iPhone screen&quot;
          </p>
        )}

        <div className="flex items-center justify-center gap-8">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                : 'bg-emperor-slate/60 text-emperor-cream/60 border border-emperor-cream/10 hover:bg-emperor-slate'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={endCall}
            className="flex items-center justify-center p-5 transition-all rounded-full shadow-lg w-18 h-18 bg-accent-red shadow-accent-red/30 hover:bg-accent-red/80 active:scale-95"
          >
            <PhoneOff className="text-white w-7 h-7" />
          </button>

          <button
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              !isSpeakerOn
                ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30'
                : 'bg-emperor-slate/60 text-emperor-cream/60 border border-emperor-cream/10 hover:bg-emperor-slate'
            }`}
          >
            {isSpeakerOn ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
