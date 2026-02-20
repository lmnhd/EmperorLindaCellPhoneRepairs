'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

/* ──────────────────────────────────────────────────────
   useVoiceChat — Browser WebRTC → OpenAI Realtime API

   Flow:
   1. POST /api/realtime-session  →  ephemeral client_secret
   2. getUserMedia()              →  mic audio track
   3. RTCPeerConnection + SDP     →  negotiate with OpenAI
   4. DataChannel "oai-events"   →  transcripts, speaking events
   5. Remote audio track          →  <audio> playback via srcObject
      └─ srcObject is AUTOPLAY-EXEMPT on iOS/Android — no unlock needed

   Key difference from the old blob/TTS approach:
   The audio arrives as a live WebRTC MediaStream assigned to
   audioEl.srcObject. Mobile browsers grant these streams a
   special autoplay exemption for real-time communication, so
   audio plays immediately without any user-gesture workarounds.
   ────────────────────────────────────────────────────── */

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

export type VoiceTranscript = {
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

type UseVoiceChatReturn = {
  status: VoiceStatus
  transcripts: VoiceTranscript[]
  isSpeaking: boolean
  isUserSpeaking: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  setMicMuted: (muted: boolean) => void
  setSpeakerMuted: (muted: boolean) => void
}

export function useVoiceChat(): UseVoiceChatReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Accumulate partial assistant transcript deltas keyed by item_id
  const partialRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    return () => { cleanupRef.current() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Use a ref so cleanup can be called from effects without stale closures
  const cleanupRef = useRef<() => void>(() => {})

  const cleanup = useCallback(() => {
    dcRef.current?.close()
    dcRef.current = null

    pcRef.current?.close()
    pcRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.srcObject = null
      audioRef.current = null
    }

    partialRef.current.clear()
  }, [])

  // Keep the ref in sync
  cleanupRef.current = cleanup

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string)

      switch (msg.type) {
        // ── AI audio state ──
        case 'response.audio.delta':
          setIsSpeaking(true)
          break

        case 'response.audio.done':
          setIsSpeaking(false)
          break

        case 'response.done':
          setIsSpeaking(false)
          break

        // ── Assistant transcript ──
        case 'response.audio_transcript.delta':
          if (msg.item_id && msg.delta) {
            partialRef.current.set(
              msg.item_id,
              (partialRef.current.get(msg.item_id) ?? '') + msg.delta,
            )
          }
          break

        case 'response.audio_transcript.done':
          setIsSpeaking(false)
          if (msg.transcript?.trim()) {
            setTranscripts((prev) => [
              ...prev,
              { role: 'assistant', text: msg.transcript.trim(), timestamp: Date.now() },
            ])
          } else if (msg.item_id) {
            const accumulated = partialRef.current.get(msg.item_id)
            if (accumulated?.trim()) {
              setTranscripts((prev) => [
                ...prev,
                { role: 'assistant', text: accumulated.trim(), timestamp: Date.now() },
              ])
            }
            partialRef.current.delete(msg.item_id)
          }
          break

        // ── User speech / VAD ──
        case 'input_audio_buffer.speech_started':
          setIsUserSpeaking(true)
          break

        case 'input_audio_buffer.speech_stopped':
          setIsUserSpeaking(false)
          break

        // ── User transcript (Whisper) ──
        case 'conversation.item.input_audio_transcription.completed':
          if (msg.transcript?.trim()) {
            setTranscripts((prev) => [
              ...prev,
              { role: 'user', text: msg.transcript.trim(), timestamp: Date.now() },
            ])
          }
          break

        // ── Errors ──
        case 'error':
          console.error('[Voice] OpenAI error event:', msg.error)
          setError(msg.error?.message ?? 'Voice session error')
          break

        default:
          break
      }
    } catch (err) {
      console.error('[Voice] Failed to parse data channel message:', err)
    }
  }, [])

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return

    setStatus('connecting')
    setError(null)
    setTranscripts([])
    partialRef.current.clear()

    try {
      // ── Step 1: Get ephemeral token ──────────────────────
      const tokenRes = await fetch('/api/realtime-session', { method: 'POST' })
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error ?? `Session creation failed (${tokenRes.status})`)
      }
      const { client_secret } = await tokenRes.json() as { client_secret: string }
      if (!client_secret) throw new Error('No client secret returned from server')

      // ── Step 2: RTCPeerConnection ────────────────────────
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // ── Step 3: Audio element (srcObject = autoplay-exempt on mobile) ──
      const audioEl = new Audio()
      audioEl.autoplay = true
      // Required for iOS to play audio inline rather than launching Media Player
      audioEl.setAttribute('playsinline', 'true')
      audioRef.current = audioEl

      pc.ontrack = (event) => {
        // Assigning a live MediaStream to srcObject bypasses mobile autoplay
        // restrictions that would block audio.src = blob:// playback.
        audioEl.srcObject = event.streams[0]
      }

      // ── Step 4: Microphone ───────────────────────────────
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      })
      streamRef.current = stream
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      // ── Step 5: Data channel for session events ──────────
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        console.log('[Voice] Data channel open — requesting greeting')
        // Belt-and-suspenders: ensure transcription is on
        dc.send(
          JSON.stringify({
            type: 'session.update',
            session: { input_audio_transcription: { model: 'whisper-1' } },
          }),
        )
        // Prompt OpenAI to deliver the opening greeting immediately
        dc.send(JSON.stringify({ type: 'response.create' }))
      }

      dc.onmessage = handleMessage

      dc.onclose = () => console.log('[Voice] Data channel closed')
      dc.onerror = (ev) => console.error('[Voice] Data channel error:', ev)

      // ── Step 6: SDP offer ────────────────────────────────
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // ── Step 7: OpenAI SDP answer ────────────────────────
      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${client_secret}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        },
      )
      if (!sdpRes.ok) throw new Error(`WebRTC SDP negotiation failed (${sdpRes.status})`)

      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      // ── Step 8: Connection state monitoring ──────────────
      pc.onconnectionstatechange = () => {
        console.log('[Voice] Connection state:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          setStatus('connected')
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setStatus('idle')
          cleanup()
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStatus('connected')
        }
      }

      // Optimistic — most connections resolve immediately
      setStatus('connected')
    } catch (err) {
      console.error('[Voice] Connection error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect voice session')
      setStatus('error')
      cleanup()
    }
  }, [status, cleanup, handleMessage])

  const disconnect = useCallback(() => {
    cleanup()
    setStatus('idle')
    setIsSpeaking(false)
    setIsUserSpeaking(false)
  }, [cleanup])

  /** Mute / unmute the microphone input track */
  const setMicMuted = useCallback((muted: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted
    })
  }, [])

  /** Mute / unmute the AI voice output */
  const setSpeakerMuted = useCallback((muted: boolean) => {
    if (audioRef.current) {
      audioRef.current.muted = muted
    }
  }, [])

  return {
    status,
    transcripts,
    isSpeaking,
    isUserSpeaking,
    error,
    connect,
    disconnect,
    setMicMuted,
    setSpeakerMuted,
  }
}
