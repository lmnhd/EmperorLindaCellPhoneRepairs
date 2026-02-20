'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface VoiceTranscript {
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

interface RealtimeSessionResponse {
  client_secret?: string
  session_id?: string
  expires_at?: number
  model?: string
  error?: string
  detail?: string
}

interface ConnectOptions {
  sessionId?: string
  persona?: 'laidback' | 'professional' | 'hustler'
  brandonStatus?: string
  brandonLocation?: string
  brandonNotes?: string
  voiceOverride?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  handoffPrompt?: string
  initialAssistantMessage?: string
}

interface UseVoiceChatResult {
  status: VoiceStatus
  transcripts: VoiceTranscript[]
  isAssistantSpeaking: boolean
  isUserSpeaking: boolean
  error: string | null
  connect: (options?: ConnectOptions) => Promise<void>
  disconnect: () => void
  clearTranscripts: () => void
  setMicMuted: (muted: boolean) => void
  setSpeakerEnabled: (enabled: boolean) => void
}

interface RealtimeEventBase {
  type?: string
}

interface RealtimeTranscriptEvent extends RealtimeEventBase {
  transcript?: string
}

interface DebugVoiceEvent {
  source: 'voice-hook'
  event: string
  sessionId?: string
  data?: Record<string, unknown>
  timestamp: number
}

export function useVoiceChat(): UseVoiceChatResult {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([])
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const assistantTranscriptBufferRef = useRef<Map<string, string>>(new Map())
  const isCleaningRef = useRef(false)
  const connectAttemptRef = useRef(0)

  const logVoiceDebug = useCallback((event: string, sessionId: string | undefined, data?: Record<string, unknown>) => {
    const payload: DebugVoiceEvent = {
      source: 'voice-hook',
      event,
      sessionId,
      data,
      timestamp: Date.now(),
    }

    console.log('[VoiceDebug]', payload)

    void fetch('/api/agent-debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Best effort logging only.
    })
  }, [])

  const teardown = useCallback(() => {
    isCleaningRef.current = true

    const channel = dataChannelRef.current
    if (channel) {
      try {
        channel.close()
      } catch {
        // no-op
      }
      dataChannelRef.current = null
    }

    const peer = peerConnectionRef.current
    if (peer) {
      try {
        peer.getSenders().forEach((sender) => {
          try {
            sender.track?.stop()
          } catch {
            // no-op
          }
        })
        peer.close()
      } catch {
        // no-op
      }
      peerConnectionRef.current = null
    }

    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // no-op
        }
      })
      localStreamRef.current = null
    }

    const audio = remoteAudioRef.current
    if (audio) {
      try {
        audio.pause()
        audio.srcObject = null
      } catch {
        // no-op
      }
      remoteAudioRef.current = null
    }

    assistantTranscriptBufferRef.current.clear()
    setIsAssistantSpeaking(false)
    setIsUserSpeaking(false)

    isCleaningRef.current = false
  }, [])

  const appendTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    setTranscripts((previous) => [
      ...previous,
      {
        role,
        text: trimmed,
        timestamp: Date.now(),
      },
    ])
  }, [])

  const handleRealtimeEvent = useCallback((event: MessageEvent<string>) => {
    let payload: unknown
    try {
      payload = JSON.parse(event.data)
    } catch {
      return
    }

    const base = payload as RealtimeEventBase

    switch (base.type) {
      case 'response.audio.delta':
        setIsAssistantSpeaking(true)
        break

      case 'response.audio.done':
      case 'response.done':
        setIsAssistantSpeaking(false)
        break

      case 'input_audio_buffer.speech_started':
        setIsUserSpeaking(true)
        break

      case 'input_audio_buffer.speech_stopped':
        setIsUserSpeaking(false)
        break

      case 'conversation.item.input_audio_transcription.completed': {
        const transcriptEvent = payload as RealtimeTranscriptEvent
        if (transcriptEvent.transcript) {
          appendTranscript('user', transcriptEvent.transcript)
        }
        break
      }

      case 'response.audio_transcript.delta': {
        const deltaPayload = payload as { item_id?: string; delta?: string }
        if (deltaPayload.item_id && deltaPayload.delta) {
          const existing = assistantTranscriptBufferRef.current.get(deltaPayload.item_id) ?? ''
          assistantTranscriptBufferRef.current.set(deltaPayload.item_id, `${existing}${deltaPayload.delta}`)
        }
        break
      }

      case 'response.audio_transcript.done': {
        const transcriptDonePayload = payload as { item_id?: string; transcript?: string }
        const finalText = transcriptDonePayload.transcript?.trim() ?? ''

        if (finalText) {
          appendTranscript('assistant', finalText)
        } else if (transcriptDonePayload.item_id) {
          const buffered = assistantTranscriptBufferRef.current.get(transcriptDonePayload.item_id) ?? ''
          appendTranscript('assistant', buffered)
        }

        if (transcriptDonePayload.item_id) {
          assistantTranscriptBufferRef.current.delete(transcriptDonePayload.item_id)
        }

        setIsAssistantSpeaking(false)
        break
      }

      case 'error': {
        const errorPayload = payload as { error?: { message?: string } }
        setError(errorPayload.error?.message ?? 'Realtime voice session error')
        break
      }

      default:
        break
    }
  }, [appendTranscript])

  const connect = useCallback(async (options?: ConnectOptions) => {
    if (status === 'connecting' || status === 'connected') {
      return
    }

    const effectiveSessionId = options?.sessionId

    setStatus('connecting')
    setError(null)
    logVoiceDebug('connect_started', effectiveSessionId, {
      persona: options?.persona,
      voiceOverride: options?.voiceOverride,
      hasHandoffPrompt: Boolean(options?.handoffPrompt?.trim()),
      hasInitialAssistantMessage: Boolean(options?.initialAssistantMessage?.trim()),
    })

    try {
      const connectAttempt = connectAttemptRef.current + 1
      connectAttemptRef.current = connectAttempt

      teardown()

      const ensureConnectStillActive = () => {
        if (connectAttemptRef.current !== connectAttempt) {
          throw new Error('Voice connection cancelled')
        }
      }

      const sessionRes = await fetch('/api/realtime-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options ?? {}),
      })

      if (!sessionRes.ok) {
        let detail = ''
        try {
          const errorJson = (await sessionRes.json()) as RealtimeSessionResponse
          detail = errorJson.detail ?? errorJson.error ?? ''
        } catch {
          detail = await sessionRes.text().catch(() => '')
        }

        const suffix = detail ? `: ${detail}` : ''
        logVoiceDebug('session_init_failed', effectiveSessionId, {
          status: sessionRes.status,
          detail,
        })
        throw new Error(`Session init failed (${sessionRes.status})${suffix}`)
      }

      ensureConnectStillActive()

      const sessionData = (await sessionRes.json()) as RealtimeSessionResponse
      const ephemeralKey = sessionData.client_secret
      logVoiceDebug('session_initialized', effectiveSessionId, {
        model: sessionData.model,
        hasClientSecret: Boolean(ephemeralKey),
      })

      if (!ephemeralKey) {
        throw new Error('Missing client secret from realtime-session endpoint')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      ensureConnectStillActive()
      localStreamRef.current = stream

      const peer = new RTCPeerConnection()
      peerConnectionRef.current = peer

      const audioEl = new Audio()
      audioEl.autoplay = true
      audioEl.setAttribute('playsinline', 'true')
      remoteAudioRef.current = audioEl

      peer.ontrack = (trackEvent: RTCTrackEvent) => {
        const [remoteStream] = trackEvent.streams
        if (!remoteStream) return
        audioEl.srcObject = remoteStream
        void audioEl.play().catch(() => {
          // Browser may require additional tap; UI keeps session active.
        })
      }

      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream)
      })

      const dataChannel = peer.createDataChannel('oai-events')
      dataChannelRef.current = dataChannel
      dataChannel.onmessage = handleRealtimeEvent
      dataChannel.onopen = () => {
        logVoiceDebug('data_channel_open', effectiveSessionId)
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      ensureConnectStillActive()

      const model = sessionData.model ?? 'gpt-realtime'
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })

      if (!sdpResponse.ok) {
        const detail = await sdpResponse.text()
        logVoiceDebug('sdp_exchange_failed', effectiveSessionId, {
          model,
          detail,
        })
        throw new Error(`Realtime SDP exchange failed: ${detail}`)
      }

      const answerSdp = await sdpResponse.text()
      ensureConnectStillActive()

      if (peerConnectionRef.current !== peer || peer.signalingState === 'closed') {
        throw new Error('Voice connection closed before remote description was applied')
      }

      await peer.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      })

      ensureConnectStillActive()

      const waitForDataChannelOpen = async () => {
        if (dataChannel.readyState === 'open') return

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            dataChannel.removeEventListener('open', onOpen)
            reject(new Error('Data channel did not open in time'))
          }, 3000)

          const onOpen = () => {
            clearTimeout(timeout)
            resolve()
          }

          dataChannel.addEventListener('open', onOpen, { once: true })
        })
      }

      await waitForDataChannelOpen()
      ensureConnectStillActive()

      const kickoffMessage = options?.initialAssistantMessage?.trim()
      const kickoffInstruction = kickoffMessage
        ? `We already started this conversation in text. Start speaking immediately with this exact continuation message in one short natural sentence: "${kickoffMessage}". Then continue helping without re-introducing yourself.`
        : options?.handoffPrompt?.trim() ||
          'Start speaking immediately with a warm one-sentence greeting and ask how you can help with the repair.'

      const kickoffEvent = {
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          instructions: kickoffInstruction,
        },
      }

      dataChannel.send(JSON.stringify(kickoffEvent))
      logVoiceDebug('kickoff_sent', effectiveSessionId, {
        hasExplicitKickoffMessage: Boolean(kickoffMessage),
      })

      setStatus('connected')
      logVoiceDebug('connect_completed', effectiveSessionId, {
        model,
      })
    } catch (connectError: unknown) {
      teardown()

      const message = connectError instanceof Error ? connectError.message : 'Failed to connect voice session'
      const isCancellation =
        message.includes('Voice connection cancelled') ||
        message.includes('closed before remote description') ||
        message.includes("signalingState is 'closed'")

      if (isCancellation) {
        setStatus('idle')
        logVoiceDebug('connect_cancelled', effectiveSessionId, {
          reason: message,
        })
        return
      }

      setStatus('error')
      setError(message)
      logVoiceDebug('connect_failed', effectiveSessionId, {
        reason: message,
      })
      throw connectError
    }
  }, [handleRealtimeEvent, logVoiceDebug, status, teardown])

  const disconnect = useCallback(() => {
    connectAttemptRef.current += 1
    teardown()
    setStatus('idle')
    setError(null)
    logVoiceDebug('disconnect', undefined)
  }, [logVoiceDebug, teardown])

  const clearTranscripts = useCallback(() => {
    setTranscripts([])
  }, [])

  const setMicMuted = useCallback((muted: boolean) => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })
  }, [])

  const setSpeakerEnabled = useCallback((enabled: boolean) => {
    const audio = remoteAudioRef.current
    if (!audio) return
    audio.muted = !enabled
    audio.volume = enabled ? 1 : 0
  }, [])

  useEffect(() => {
    return () => {
      teardown()
    }
  }, [teardown])

  return {
    status,
    transcripts,
    isAssistantSpeaking,
    isUserSpeaking,
    error,
    connect,
    disconnect,
    clearTranscripts,
    setMicMuted,
    setSpeakerEnabled,
  }
}
