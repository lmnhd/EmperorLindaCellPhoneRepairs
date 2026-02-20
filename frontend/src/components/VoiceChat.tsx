'use client'

/**
 * VoiceChat — EmperorLinda Repairs in-app voice demo
 *
 * Audio architecture: WebRTC via OpenAI Realtime API
 * - Audio arrives as a live RTCPeerConnection MediaStream
 * - Assigned to audioEl.srcObject — autoplay-exempt on iOS/Android
 * - NO blob fetching, NO TTS HTTP round-trips, NO mobile unlock hacks
 *
 * Old architecture (broken on mobile):
 *   SpeechRecognition → /api/chat → /api/tts → blob URL → audio.play()
 *   ❌  audio.play() on a blob is blocked on mobile after the user gesture times out
 *
 * New architecture:
 *   RTCPeerConnection → OpenAI Realtime API (WebRTC)
 *   ✅  srcObject = MediaStream is always autoplay-exempt
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { useVoiceChat } from '@/hooks/useVoiceChat'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PersonaKey = 'laidback' | 'professional' | 'hustler'
type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
type CallPhase = 'calling' | 'connected' | 'ending'

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
  renderMode?: 'full' | 'hero'
  onAssistantMessage?: (message: string) => void
}

const PERSONA_LABELS: Record<PersonaKey, string> = {
  laidback: 'Chill Mode',
  professional: 'Professional',
  hustler: 'Hustler',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceChat({
  persona,
  onEndCall,
  onAssistantMessage,
}: VoiceChatProps) {
  const {
    status,
    transcripts,
    isSpeaking,
    isUserSpeaking,
    error,
    connect,
    disconnect,
    setMicMuted,
    setSpeakerMuted,
  } = useVoiceChat()

  const [callPhase, setCallPhase] = useState<CallPhase>('calling')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [barHeights, setBarHeights] = useState<number[]>(Array(24).fill(4))

  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const animFrameRef = useRef<number>(0)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)
  const isEndingRef = useRef(false)
  const hasConnectedRef = useRef(false)

  // Kick off the WebRTC connection on mount
  useEffect(() => {
    void connect()
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      cancelAnimationFrame(animFrameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mirror hook status → callPhase
  useEffect(() => {
    if (status === 'connecting') {
      setCallPhase('calling')
    } else if (status === 'connected') {
      if (!hasConnectedRef.current) {
        hasConnectedRef.current = true
        setCallPhase('connected')
        callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000)
      }
    } else if (status === 'error' && !isEndingRef.current) {
      setCallPhase('calling') // stay on calling screen so user can see the error
    }
  }, [status])

  // Notify parent of new assistant messages (text chat handoff)
  useEffect(() => {
    if (transcripts.length === 0) return
    const last = transcripts[transcripts.length - 1]
    if (last.role === 'assistant') {
      onAssistantMessage?.(last.text)
    }
  }, [transcripts, onAssistantMessage])

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight
    }
  }, [transcripts])

  // Waveform animation
  useEffect(() => {
    const animate = () => {
      const bars: number[] = []
      const time = Date.now()
      for (let i = 0; i < 24; i++) {
        if (isSpeaking) {
          const base = 14
          const wave = Math.sin(time / 120 + i * 0.55) * 18
          const noise = Math.sin(time / 80 + i * 1.3) * 8
          bars.push(Math.max(3, base + wave + noise))
        } else if (isUserSpeaking) {
          const base = 8
          const wave = Math.sin(time / 250 + i * 0.4) * 6
          const noise = Math.sin(time / 150 + i * 2.1) * 3
          bars.push(Math.max(3, base + wave + noise))
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
  }, [isSpeaking, isUserSpeaking])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const endCall = useCallback(() => {
    if (isEndingRef.current) return
    isEndingRef.current = true
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    setCallPhase('ending')
    disconnect()

    const history: VoiceHistoryEntry[] = transcripts.map((t) => ({
      role: t.role,
      content: t.text,
      timestamp: t.timestamp,
    }))

    setTimeout(() => onEndCall(history), 1500)
  }, [disconnect, transcripts, onEndCall])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      setMicMuted(!prev)
      return !prev
    })
  }, [setMicMuted])

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      setSpeakerMuted(prev) // if speaker is currently on, mute it
      return !prev
    })
  }, [setSpeakerMuted])

  // ---------------------------------------------------------------------------
  // Render: Calling / Ringing
  // ---------------------------------------------------------------------------

  if (callPhase === 'calling') {
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

        {status === 'error' ? (
          <p className="mt-4 text-sm text-accent-red/80 px-8 text-center">
            {error ?? 'Connection failed'}
          </p>
        ) : (
          <p className="mt-4 text-sm text-emperor-cream/50 animate-pulse">calling...</p>
        )}

        <button
          onClick={endCall}
          className="flex items-center justify-center w-16 h-16 mt-16 transition-all rounded-full shadow-lg bg-accent-red shadow-accent-red/30 hover:bg-accent-red/80 active:scale-95"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Ending
  // ---------------------------------------------------------------------------

  if (callPhase === 'ending') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emperor-black">
        <div className="flex items-center justify-center w-24 h-24 mb-6 rounded-full opacity-50 bg-emperor-slate">
          <PhoneOff className="w-10 h-10 text-emperor-cream/40" />
        </div>
        <p className="font-mono text-sm text-emperor-cream/40">Call ended</p>
        <p className="mt-1 font-mono text-xs text-emperor-cream/20">
          {formatDuration(callDuration)}
        </p>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Connected / Active Call
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-emperor-charcoal via-emperor-black to-emperor-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emperor-gold to-emperor-gold-dark">
              <span className="text-lg font-bold font-display text-emperor-black">L</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-emerald rounded-full border-2 border-emperor-black" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-display text-emperor-cream">LINDA</h3>
            <p className="text-[10px] text-emperor-cream/40 font-mono">{PERSONA_LABELS[persona]}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-emperor-gold tabular-nums">{formatDuration(callDuration)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-[10px] font-mono text-accent-emerald">CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="flex items-center justify-center px-8 py-10">
        <div className="flex items-center justify-center gap-[3px] h-16">
          {barHeights.map((height, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full transition-all duration-75"
              style={{
                height: `${height}px`,
                backgroundColor: isSpeaking
                  ? `rgba(212, 168, 67, ${0.5 + (height / 50) * 0.5})`
                  : isUserSpeaking
                    ? `rgba(45, 212, 160, ${0.4 + (height / 30) * 0.4})`
                    : `rgba(245, 240, 232, ${0.15 + (height / 20) * 0.1})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Status indicator */}
      <div className="mb-4 text-center">
        {isSpeaking && (
          <span className="px-3 py-1 font-mono text-xs border rounded-full text-emperor-gold bg-emperor-gold/10 border-emperor-gold/20">
            LINDA is speaking...
          </span>
        )}
        {isUserSpeaking && !isSpeaking && (
          <span className="px-3 py-1 font-mono text-xs border rounded-full text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20">
            Listening...
          </span>
        )}
        {!isSpeaking && !isUserSpeaking && (
          <span className="px-3 py-1 font-mono text-xs text-emperor-cream/20">
            {isMuted ? 'Muted' : 'Ready'}
          </span>
        )}
      </div>

      {/* Transcript */}
      <div
        ref={transcriptContainerRef}
        className="flex-1 px-6 py-2 space-y-3 overflow-y-auto"
      >
        {transcripts.length === 0 && (
          <p className="text-center text-[11px] text-emperor-cream/20 mb-6 font-mono">
            Say something like &quot;I cracked my iPhone screen&quot;
          </p>
        )}
        {transcripts.map((entry, i) => (
          <div
            key={i}
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

      {/* Call controls */}
      <div className="px-6 pt-4 pb-10">
        <div className="flex items-center justify-center gap-8">
          {/* Mute */}
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

          {/* End call */}
          <button
            onClick={endCall}
            className="flex items-center justify-center p-5 transition-all rounded-full shadow-lg w-18 h-18 bg-accent-red shadow-accent-red/30 hover:bg-accent-red/80 active:scale-95"
          >
            <PhoneOff className="text-white w-7 h-7" />
          </button>

          {/* Speaker */}
          <button
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              !isSpeakerOn
                ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30'
                : 'bg-emperor-slate/60 text-emperor-cream/60 border border-emperor-cream/10 hover:bg-emperor-slate'
            }`}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
