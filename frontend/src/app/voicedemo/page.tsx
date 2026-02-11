'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Star,
  Navigation,
  Globe,
  Share2,
  CheckCircle2,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react'

// Dynamically import VoiceChat (uses browser-only APIs)
const VoiceChat = dynamic(() => import('@/components/VoiceChat'), { ssr: false })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PersonaKey = 'laidback' | 'professional' | 'hustler'

interface PersonaOption {
  key: PersonaKey
  label: string
  description: string
  emoji: string
  color: string
  bg: string
  border: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERSONAS: PersonaOption[] = [
  {
    key: 'laidback',
    label: 'Chill',
    description: 'Laid back, neighborhood vibe. Uses natural slang.',
    emoji: '😎',
    color: 'text-accent-emerald',
    bg: 'bg-accent-emerald/10',
    border: 'border-accent-emerald/20',
  },
  {
    key: 'professional',
    label: 'Professional',
    description: 'Warm, confident, and polished. Great first impression.',
    emoji: '💼',
    color: 'text-accent-blue',
    bg: 'bg-accent-blue/10',
    border: 'border-accent-blue/20',
  },
  {
    key: 'hustler',
    label: 'Hustler',
    description: 'High-energy closer. Creates urgency and excitement.',
    emoji: '🔥',
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10',
    border: 'border-accent-amber/20',
  },
]

const SAMPLE_REVIEWS = [
  { name: 'Marcus T.', rating: 5, text: 'Fixed my iPhone in 30 min. This dude is the real deal!', time: '2 weeks ago' },
  { name: 'Ashley R.', rating: 5, text: 'On-site repair at my job. Brandon came through clutch.', time: '1 month ago' },
  { name: 'DeShawn P.', rating: 5, text: 'Best prices in Jax, no cap. 90-day warranty too.', time: '3 weeks ago' },
]

const SUGGESTED_INTROS = [
  'Say: "I cracked my iPhone screen"',
  'Say: "How much for a battery swap?"',
  'Say: "Do y\'all do on-site repairs?"',
  'Say: "What time slots are open today?"',
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function VoiceDemoPage() {
  const [isInCall, setIsInCall] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>('laidback')
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [savedVoice, setSavedVoice] = useState<string | undefined>(undefined)

  // Fetch saved voice preference from Brandon's state
  useEffect(() => {
    fetch('/api/state')
      .then(res => res.json())
      .then((data: { status: string; state?: { voice?: string } }) => {
        if (data.state?.voice) {
          setSavedVoice(data.state.voice)
        }
      })
      .catch(() => { /* use default persona voice */ })
  }, [])

  // Check microphone permission before starting call
  const startCall = async () => {
    try {
      console.log('[VoiceDemo] Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('[VoiceDemo] Microphone permission granted, stopping stream')
      // Stop the stream — we just needed permission
      stream.getTracks().forEach((t) => t.stop())
      setMicPermission('granted')
      console.log('[VoiceDemo] Starting voice call...')
      setIsInCall(true)
    } catch (err) {
      console.error('[VoiceDemo] Microphone permission denied:', err)
      setMicPermission('denied')
    }
  }

  const endCall = () => {
    setIsInCall(false)
  }

  // --- Voice Chat Active ---
  if (isInCall) {
    return (
      <VoiceChat
        persona={selectedPersona}
        onEndCall={endCall}
        brandonStatus="available"
        brandonLocation="shop"
        brandonNotes="Walk-ins welcome"
        voiceOverride={savedVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | undefined}
      />
    )
  }

  // --- Business Listing / Landing ---
  return (
    <main className="min-h-screen bg-emperor-black">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-emperor-black/80 border-b border-emperor-cream/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-lg hover:bg-emperor-cream/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-emperor-cream/50" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emperor-gold" />
            <span className="text-xs font-mono text-emperor-cream/30">VOICE DEMO</span>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-12">
        {/* Map-style hero banner */}
        <div className="relative h-44 bg-gradient-to-br from-emperor-charcoal via-emperor-slate to-emperor-charcoal overflow-hidden">
          {/* Simulated map grid lines */}
          <div className="absolute inset-0 dot-pattern opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-emperor-black" />
          
          {/* Map pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute inset-0 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-red/20 animate-ping" />
              <div className="w-10 h-10 rounded-full bg-accent-red shadow-lg shadow-accent-red/40 flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              {/* Pin stem */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-accent-red/60" />
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-2 h-1 bg-emperor-black/30 rounded-full" />
            </div>
          </div>

          {/* Street labels */}
          <div className="absolute top-6 left-6 text-[9px] font-mono text-emperor-cream/15 tracking-widest">
            BEACH BLVD
          </div>
          <div className="absolute bottom-16 right-8 text-[9px] font-mono text-emperor-cream/15 tracking-widest rotate-90">
            3RD ST
          </div>
        </div>

        {/* Business card */}
        <div className="px-4 -mt-4 relative z-10">
          <div className="glass-panel p-5">
            {/* Business name + verified */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-bold text-emperor-cream">
                    EmperorLinda Cell Phone Repairs
                  </h1>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-blue" />
                  <span className="text-[11px] text-accent-blue font-mono">Verified Business</span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-semibold text-emperor-cream">4.9</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < 5 ? 'text-emperor-gold fill-emperor-gold' : 'text-emperor-cream/20'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-emperor-cream/40">(127)</span>
            </div>

            {/* Category + hours */}
            <p className="text-xs text-emperor-cream/50 mt-1.5">Cell Phone Repair Shop</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent-emerald" />
                <span className="text-xs text-accent-emerald font-medium">Open</span>
                <span className="text-xs text-emperor-cream/40">· Closes 7 PM</span>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin className="w-3 h-3 text-emperor-cream/30" />
              <span className="text-xs text-emperor-cream/40">Jacksonville, FL</span>
            </div>

            {/* Action buttons row — GOOGLE MAPS STYLE */}
            <div className="grid grid-cols-4 gap-2 mt-5">
              {/* CALL — The star button */}
              <button
                onClick={startCall}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-accent-blue/15 border border-accent-blue/25 hover:bg-accent-blue/25 transition-all group active:scale-95"
              >
                <Phone className="w-5 h-5 text-accent-blue group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-medium text-accent-blue">Call</span>
              </button>

              {/* Directions */}
              <button className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emperor-cream/[0.04] border border-emperor-cream/5 hover:bg-emperor-cream/[0.08] transition-all opacity-50 cursor-default">
                <Navigation className="w-5 h-5 text-emperor-cream/40" />
                <span className="text-[11px] text-emperor-cream/40">Directions</span>
              </button>

              {/* Website */}
              <button className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emperor-cream/[0.04] border border-emperor-cream/5 hover:bg-emperor-cream/[0.08] transition-all opacity-50 cursor-default">
                <Globe className="w-5 h-5 text-emperor-cream/40" />
                <span className="text-[11px] text-emperor-cream/40">Website</span>
              </button>

              {/* Share */}
              <button className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emperor-cream/[0.04] border border-emperor-cream/5 hover:bg-emperor-cream/[0.08] transition-all opacity-50 cursor-default">
                <Share2 className="w-5 h-5 text-emperor-cream/40" />
                <span className="text-[11px] text-emperor-cream/40">Share</span>
              </button>
            </div>

            {/* Mic permission denied error */}
            {micPermission === 'denied' && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-accent-red/10 border border-accent-red/20">
                <p className="text-xs text-accent-red">
                  Microphone access denied. Please allow microphone access in your browser settings and try again.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Persona Selector */}
        <div className="px-4 mt-5">
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-emperor-gold" />
              <h2 className="text-sm font-display font-semibold text-emperor-cream">
                Choose AI Personality
              </h2>
            </div>

            <div className="space-y-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPersona(p.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                    selectedPersona === p.key
                      ? `${p.bg} ${p.border} ring-1 ring-offset-1 ring-offset-emperor-charcoal ring-current ${p.color}`
                      : 'border-emperor-cream/5 hover:bg-emperor-cream/[0.04]'
                  }`}
                >
                  <span className="text-xl" role="img" aria-label={p.label}>
                    {p.emoji}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${selectedPersona === p.key ? p.color : 'text-emperor-cream/70'}`}
                    >
                      {p.label}
                    </p>
                    <p className="text-[11px] text-emperor-cream/30 mt-0.5">{p.description}</p>
                  </div>
                  {selectedPersona === p.key && (
                    <CheckCircle2 className={`w-5 h-5 ${p.color}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="px-4 mt-5">
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emperor-gold" />
              <h2 className="text-sm font-display font-semibold text-emperor-cream">
                How This Demo Works
              </h2>
            </div>

            <div className="space-y-3 text-xs text-emperor-cream/40 leading-relaxed">
              <p>
                Press <strong className="text-accent-blue">Call</strong> above to start a live voice
                conversation with LINDA — the AI receptionist. This uses your device&apos;s
                microphone for real speech recognition and OpenAI for responses.
              </p>
              <p>
                LINDA can check availability, book appointments, quote prices, and handle the full
                customer experience — just like a real phone call. Any bookings made will appear in
                the dashboard.
              </p>
            </div>

            {/* Conversation starters */}
            <div className="mt-4 pt-4 border-t border-emperor-cream/5">
              <p className="text-[10px] font-mono text-emperor-cream/20 uppercase tracking-wider mb-3">
                Things to try
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_INTROS.map((hint) => (
                  <span
                    key={hint}
                    className="px-3 py-1.5 rounded-lg text-[11px] text-emperor-cream/30 bg-emperor-cream/[0.03] border border-emperor-cream/5"
                  >
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <div className="px-4 mt-5">
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-display font-semibold text-emperor-cream">Reviews</h2>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-emperor-gold fill-emperor-gold" />
                <span className="text-xs font-semibold text-emperor-cream">4.9</span>
              </div>
            </div>

            <div className="space-y-4">
              {SAMPLE_REVIEWS.map((review) => (
                <div key={review.name} className="pb-4 border-b border-emperor-cream/5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emperor-slate flex items-center justify-center text-[10px] font-bold text-emperor-cream/40">
                        {review.name.charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-emperor-cream/60">
                        {review.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-emperor-cream/20">{review.time}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1.5 ml-9">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} className="w-2.5 h-2.5 text-emperor-gold fill-emperor-gold" />
                    ))}
                  </div>
                  <p className="text-xs text-emperor-cream/40 leading-relaxed ml-9">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Big CTA at bottom */}
        <div className="px-4 mt-8 mb-4">
          <button
            onClick={startCall}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-blue to-accent-blue/80 text-white font-semibold text-base flex items-center justify-center gap-3 shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all active:scale-[0.98]"
          >
            <Phone className="w-5 h-5" />
            Call EmperorLinda Now
          </button>
          <p className="text-center text-[10px] text-emperor-cream/20 mt-2 font-mono">
            Uses your microphone · Powered by OpenAI
          </p>
        </div>
      </div>
    </main>
  )
}
