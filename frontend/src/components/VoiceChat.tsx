'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Web Speech API type declarations (webkit prefix)
// ---------------------------------------------------------------------------

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: Event & { error: string }) => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PersonaKey = 'laidback' | 'professional' | 'hustler'
type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
type CallState = 'calling' | 'connected' | 'ending'

interface TranscriptEntry {
  role: 'user' | 'ai'
  text: string
  timestamp: number
}

interface VoiceChatProps {
  persona: PersonaKey
  onEndCall: () => void
  brandonStatus?: string
  brandonLocation?: string
  brandonNotes?: string
  voiceOverride?: VoiceName
}

interface ChatApiResponse {
  reply: string
  sessionId: string
}

// ---------------------------------------------------------------------------
// Persona → Voice mapping
// ---------------------------------------------------------------------------

const PERSONA_VOICES: Record<PersonaKey, VoiceName> = {
  laidback: 'onyx',
  professional: 'nova',
  hustler: 'echo',
}

const PERSONA_LABELS: Record<PersonaKey, string> = {
  laidback: 'Chill Mode',
  professional: 'Professional',
  hustler: 'Hustler',
}

// ---------------------------------------------------------------------------
// VoiceChat Component
// ---------------------------------------------------------------------------

export default function VoiceChat({
  persona,
  onEndCall,
  brandonStatus,
  brandonLocation,
  brandonNotes,
  voiceOverride,
}: VoiceChatProps) {
  // --- State ---
  const [callState, setCallState] = useState<CallState>('calling')
  const [callDuration, setCallDuration] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [currentInterim, setCurrentInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [barHeights, setBarHeights] = useState<number[]>(Array(24).fill(4))

  // --- Refs ---
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sessionIdRef = useRef(`voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const animFrameRef = useRef<number>(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const isEndingRef = useRef(false)
  const shouldListenRef = useRef(false)
  const chatApiRef = useRef<((text: string) => Promise<void>) | null>(null)

  // --- Format call duration ---
  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // --- Auto-scroll transcript ---
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // --- Waveform animation ---
  useEffect(() => {
    const animate = () => {
      const bars: number[] = []
      const time = Date.now()
      for (let i = 0; i < 24; i++) {
        if (isAiSpeaking) {
          // Active, dynamic waveform for AI speaking
          const base = 14
          const wave = Math.sin(time / 120 + i * 0.55) * 18
          const noise = Math.sin(time / 80 + i * 1.3) * 8
          bars.push(Math.max(3, base + wave + noise))
        } else if (isListening) {
          // Gentle pulsing when listening
          const base = 8
          const wave = Math.sin(time / 250 + i * 0.4) * 6
          const noise = Math.sin(time / 150 + i * 2.1) * 3
          bars.push(Math.max(3, base + wave + noise))
        } else if (isProcessing) {
          // Slow breathing while processing
          const base = 6
          const wave = Math.sin(time / 400 + i * 0.3) * 4
          bars.push(Math.max(3, base + wave))
        } else {
          // Minimal idle
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

  // --- Play TTS audio ---
  const playTTS = useCallback(
    async (text: string): Promise<void> => {
      if (!isSpeakerOn || isEndingRef.current) return

      setIsAiSpeaking(true)
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: voiceOverride ?? PERSONA_VOICES[persona],
          }),
        })

        if (!response.ok) {
          throw new Error('TTS failed')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        return new Promise<void>((resolve) => {
          if (!audioRef.current) {
            audioRef.current = new Audio()
          }
          const audio = audioRef.current
          audio.src = url

          audio.onended = () => {
            setIsAiSpeaking(false)
            URL.revokeObjectURL(url)
            resolve()
          }

          audio.onerror = () => {
            setIsAiSpeaking(false)
            URL.revokeObjectURL(url)
            resolve()
          }

          audio.play().catch(() => {
            setIsAiSpeaking(false)
            URL.revokeObjectURL(url)
            resolve()
          })
        })
      } catch {
        setIsAiSpeaking(false)
        // Fall back to browser speech synthesis
        return new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.rate = 1.0
          utterance.pitch = persona === 'hustler' ? 1.1 : 0.95
          utterance.onend = () => {
            setIsAiSpeaking(false)
            resolve()
          }
          utterance.onerror = () => {
            setIsAiSpeaking(false)
            resolve()
          }
          window.speechSynthesis.speak(utterance)
        })
      }
    },
    [persona, isSpeakerOn, voiceOverride],
  )

  // --- Send message to chat API ---
  const sendToAI = useCallback(
    async (text: string) => {
      if (isEndingRef.current) return

      console.log('[VoiceChat] sendToAI called with:', text.substring(0, 50) + '...')
      setIsProcessing(true)
      try {
        console.log('[VoiceChat] Fetching /api/chat...')
        const requestBody = {
          message: text,
          sessionId: sessionIdRef.current,
          phone: 'voice-demo',
          persona,
          brandonStatus,
          brandonLocation,
          brandonNotes,
        }
        console.log('[VoiceChat] Request body:', requestBody)
        
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        console.log('[VoiceChat] Fetch response received, status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[VoiceChat] Chat API error response:', errorText)
          throw new Error(`Chat API error: ${response.status} - ${errorText}`)
        }

        console.log('[VoiceChat] Parsing JSON response...')
        const data = (await response.json()) as ChatApiResponse
        console.log('[VoiceChat] AI response received:', data.reply.substring(0, 50) + '...')
        setIsProcessing(false)

        // Add AI response to transcript
        setTranscript((prev) => [
          ...prev,
          { role: 'ai', text: data.reply, timestamp: Date.now() },
        ])

        // Play the response via TTS
        console.log('[VoiceChat] Starting TTS playback...')
        await playTTS(data.reply)
        console.log('[VoiceChat] TTS playback finished, resuming listening...')

        // Resume listening after AI finishes speaking
        if (!isEndingRef.current && !isMuted) {
          console.log('[VoiceChat] Calling startListening after TTS')
          // Note: startListening is retrieved from latest ref to avoid circular dependency
          startListening()
        }
      } catch (err: unknown) {
        setIsProcessing(false)
        const msg = err instanceof Error ? err.message : 'Connection failed'
        console.error('[VoiceChat] ❌ sendToAI ERROR:', msg)
        console.error('[VoiceChat] Full error:', err)
        console.error('[VoiceChat] Text that failed:', text)
        setError(`API Error: ${msg}`)
        // Still try to resume listening
        if (!isEndingRef.current && !isMuted) {
          console.log('[VoiceChat] Attempting to resume listening after error...')
          startListening()
        }
      }
    },
    [persona, brandonStatus, brandonLocation, brandonNotes, playTTS, isMuted],
  )

  // --- Handle completed user speech ---
  const handleUserSpeech = useCallback(
    (text: string) => {
      if (!text.trim() || isEndingRef.current) return

      console.log('[VoiceChat] handleUserSpeech called with:', text)
      setCurrentInterim('')
      setIsListening(false)
      shouldListenRef.current = false

      // Stop recognition while processing
      try {
        recognitionRef.current?.stop()
        console.log('[VoiceChat] Stopped recognition for processing')
      } catch {
        // ignore
      }

      // Add to transcript
      setTranscript((prev) => [
        ...prev,
        { role: 'user', text: text.trim(), timestamp: Date.now() },
      ])

      // Send to AI
      console.log('[VoiceChat] Sending user speech to AI...')
      sendToAI(text.trim())
    },
    [sendToAI],
  )

  // --- Start speech recognition ---
  const startListening = useCallback(() => {
    if (isMuted || isEndingRef.current || isAiSpeaking) {
      console.log('[VoiceChat] startListening skipped:', { isMuted, isEnding: isEndingRef.current, isAiSpeaking })
      return
    }

    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    if (!SpeechRecognitionClass) {
      const msg = 'Speech recognition not supported in this browser. Try Chrome or Edge.'
      console.error('[VoiceChat]', msg)
      setError(msg)
      return
    }

    try {
      console.log('[VoiceChat] Starting speech recognition...')
      // Create a fresh instance each time for reliability
      const recognition = new SpeechRecognitionClass()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        console.log('[VoiceChat] Recognition started - listening now')
        setIsListening(true)
        shouldListenRef.current = true
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        console.log('[VoiceChat] Speech result:', { finalTranscript, interimTranscript, isFinal: finalTranscript.length > 0 })

        if (finalTranscript) {
          handleUserSpeech(finalTranscript)
        } else {
          setCurrentInterim(interimTranscript)
        }
      }

      recognition.onerror = (event: Event & { error: string }) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Normal — these fire routinely (e.g. silence, or endCall aborting recognition)
          if (!isEndingRef.current && !isMuted && shouldListenRef.current) {
            console.log('[VoiceChat] No speech / aborted, restarting listening...')
            setTimeout(() => startListening(), 300)
          }
          return
        }

        console.error('[VoiceChat] Speech recognition error:', event.error)
        setError(`Mic error: ${event.error}`)
        setIsListening(false)
      }

      recognition.onend = () => {
        console.log('[VoiceChat] Recognition ended')
        setIsListening(false)
        // Auto-restart if we should still be listening
        if (!isEndingRef.current && !isMuted && shouldListenRef.current && !isAiSpeaking) {
          console.log('[VoiceChat] Auto-restarting recognition...')
          setTimeout(() => startListening(), 300)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
      console.log('[VoiceChat] Recognition.start() called')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice recognition'
      console.error('[VoiceChat] Exception in startListening:', msg)
      setError(`Mic setup failed: ${msg}. Check browser microphone permissions.`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, isAiSpeaking, handleUserSpeech])

  // --- Call timer ---
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1)
      }, 1000)
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
  }, [callState])

  // --- "Ringing" → "Connected" transition + initial greeting ---
  useEffect(() => {
    if (callState !== 'calling') return

    console.log('[VoiceChat] Call transitioning from calling to connected...')
    const connectTimer = setTimeout(async () => {
      console.log('[VoiceChat] Setting callState to connected')
      setCallState('connected')

      // Send initial greeting request
      const greetingMsg = 'A customer just called in. Greet them warmly and ask what they need. Keep it short — one or two sentences max, like a real phone pickup.'
      console.log('[VoiceChat] About to call sendToAI with greeting message')
      console.log('[VoiceChat] Greeting message:', greetingMsg)
      
      try {
        await sendToAI(greetingMsg)
        console.log('[VoiceChat] sendToAI callback completed')
      } catch (e) {
        console.error('[VoiceChat] sendToAI threw exception:', e)
      }
    }, 2500)

    return () => {
      console.log('[VoiceChat] Cleaning up connect timer')
      clearTimeout(connectTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState])

  // --- End call ---
  const endCall = useCallback(() => {
    isEndingRef.current = true
    setCallState('ending')
    shouldListenRef.current = false

    // Stop everything
    try {
      recognitionRef.current?.abort()
    } catch {
      // ignore
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    window.speechSynthesis?.cancel()

    if (callTimerRef.current) clearInterval(callTimerRef.current)
    cancelAnimationFrame(animFrameRef.current)

    // Brief delay then callback
    setTimeout(() => {
      onEndCall()
    }, 800)
  }, [onEndCall])

  // --- Toggle mute ---
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newVal = !prev
      if (newVal) {
        shouldListenRef.current = false
        try {
          recognitionRef.current?.stop()
        } catch {
          // ignore
        }
        setIsListening(false)
      } else {
        // Resume listening
        if (callState === 'connected' && !isAiSpeaking) {
          setTimeout(() => startListening(), 300)
        }
      }
      return newVal
    })
  }, [callState, isAiSpeaking, startListening])

  // --- Toggle speaker ---
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev)
  }, [])

  // --- Cleanup ---
  useEffect(() => {
    // Reset on mount (fixes React StrictMode double-mount leaving isEndingRef stale)
    isEndingRef.current = false

    return () => {
      isEndingRef.current = true
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
      window.speechSynthesis?.cancel()
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // =========================================================================
  // RENDER
  // =========================================================================

  // --- Calling / Ringing State ---
  if (callState === 'calling') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-emperor-charcoal via-emperor-black to-emperor-black">
        {/* Animated ring circles */}
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
        <p className="mt-4 text-sm text-emperor-cream/50 animate-pulse">calling...</p>

        {/* End call button */}
        <button
          onClick={endCall}
          className="flex items-center justify-center w-16 h-16 mt-16 transition-all rounded-full shadow-lg bg-accent-red shadow-accent-red/30 hover:bg-accent-red/80 active:scale-95"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    )
  }

  // --- Ending State ---
  if (callState === 'ending') {
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

  // --- Connected / Active Call State ---
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

      {/* Waveform visualization */}
      <div className="flex items-center justify-center px-8 py-10">
        <div className="flex items-center justify-center gap-[3px] h-16">
          {barHeights.map((height, i) => (
            <div
              key={i}
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

      {/* Status indicator */}
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

      {/* Interim transcript */}
      {currentInterim && (
        <div className="px-4 py-2 mx-6 mb-3 border rounded-xl bg-accent-emerald/5 border-accent-emerald/10">
          <p className="font-mono text-xs italic text-accent-emerald/70">
            &quot;{currentInterim}&quot;
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 mx-6 mb-3 border rounded-xl bg-accent-red/10 border-accent-red/20">
          <p className="text-xs text-accent-red/70">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[10px] text-accent-red/50 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Conversation transcript */}
      <div className="flex-1 px-6 py-2 space-y-3 overflow-y-auto">
        {transcript.map((entry, i) => (
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
        <div ref={transcriptEndRef} />
      </div>

      {/* Call controls */}
      <div className="px-6 pt-4 pb-10">
        {/* Pro tip */}
        {transcript.length === 0 && !isAiSpeaking && !isProcessing && (
          <p className="text-center text-[11px] text-emperor-cream/20 mb-6 font-mono">
            Say something like &quot;I cracked my iPhone screen&quot;
          </p>
        )}

        <div className="flex items-center justify-center gap-8">
          {/* Mute button */}
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

          {/* End call button */}
          <button
            onClick={endCall}
            className="flex items-center justify-center p-5 transition-all rounded-full shadow-lg w-18 h-18 bg-accent-red shadow-accent-red/30 hover:bg-accent-red/80 active:scale-95"
          >
            <PhoneOff className="text-white w-7 h-7" />
          </button>

          {/* Speaker button */}
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
