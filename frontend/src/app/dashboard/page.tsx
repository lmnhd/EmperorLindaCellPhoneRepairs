'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  ArrowLeft,
  Dumbbell,
  Wrench,
  Moon,
  Car,
  Coffee,
  Phone,
  Bell,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Settings,
  ChevronRight,
  Save,
  MapPin,
  Volume2,
  VolumeX,
  Shield,
  Zap,
  ScrollText,
} from 'lucide-react'
import ChatLogOverlay from '@/components/ChatLogOverlay'

/** Type for Brandon's status modes */
type StatusMode = 'working' | 'gym' | 'driving' | 'break' | 'sleeping' | 'custom'
type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
type Gender = 'male' | 'female' | 'neutral'

interface VoiceOption {
  value: VoiceName
  label: string
  description: string
  gender: Gender
}

interface AssistantNameOption {
  value: string
  label: string
  gender: Gender
}

const ALL_VOICE_OPTIONS: VoiceOption[] = [
  { value: 'onyx', label: 'Onyx', description: 'Deep, warm — chill vibe', gender: 'male' },
  { value: 'echo', label: 'Echo', description: 'Smooth, energetic — closer', gender: 'male' },
  { value: 'fable', label: 'Fable', description: 'Warm, narrative — storyteller', gender: 'male' },
  { value: 'nova', label: 'Nova', description: 'Bright, polished — professional', gender: 'female' },
  { value: 'shimmer', label: 'Shimmer', description: 'Clear, expressive — friendly', gender: 'female' },
  { value: 'alloy', label: 'Alloy', description: 'Balanced, versatile — neutral', gender: 'neutral' },
]

const ASSISTANT_NAMES: AssistantNameOption[] = [
  { value: 'Linda', label: 'Linda', gender: 'female' },
  { value: 'Marcus', label: 'Marcus', gender: 'male' },
  { value: 'Devon', label: 'Devon', gender: 'neutral' },
  { value: 'Keisha', label: 'Keisha', gender: 'female' },
  { value: 'Darius', label: 'Darius', gender: 'male' },
  { value: 'Alex', label: 'Alex', gender: 'neutral' },
]

/** Default voice per gender — auto-selects when name changes */
const DEFAULT_VOICE_FOR_GENDER: Record<Gender, VoiceName> = {
  female: 'nova',
  male: 'onyx',
  neutral: 'alloy',
}

/** Get voice options compatible with a gender */
function getVoicesForGender(gender: Gender): VoiceOption[] {
  if (gender === 'neutral') return ALL_VOICE_OPTIONS
  return ALL_VOICE_OPTIONS.filter(v => v.gender === gender || v.gender === 'neutral')
}

interface StatusConfig {
  icon: typeof Wrench
  label: string
  color: string
  bgColor: string
  defaultNote: string
}

const STATUS_OPTIONS: Record<StatusMode, StatusConfig> = {
  working: { icon: Wrench, label: 'At the Shop', color: 'text-accent-emerald', bgColor: 'bg-accent-emerald/10 border-accent-emerald/20', defaultNote: 'Available for walk-ins and appointments' },
  gym: { icon: Dumbbell, label: 'At the Gym', color: 'text-emperor-gold', bgColor: 'bg-emperor-gold/10 border-emperor-gold/20', defaultNote: 'Back in 1-2 hours' },
  driving: { icon: Car, label: 'Driving / Out', color: 'text-accent-blue', bgColor: 'bg-accent-blue/10 border-accent-blue/20', defaultNote: 'On the move, will respond soon' },
  break: { icon: Coffee, label: 'On Break', color: 'text-accent-amber', bgColor: 'bg-accent-amber/10 border-accent-amber/20', defaultNote: 'Quick break, back shortly' },
  sleeping: { icon: Moon, label: 'After Hours', color: 'text-purple-400', bgColor: 'bg-purple-400/10 border-purple-400/20', defaultNote: 'Closed for the day. Open tomorrow at 9 AM' },
  custom: { icon: Settings, label: 'Custom', color: 'text-emperor-cream/60', bgColor: 'bg-emperor-cream/5 border-emperor-cream/10', defaultNote: '' },
}

interface Lead {
  lead_id: string
  phone: string
  repair_type: string
  device: string
  appointment_date: string
  appointment_time: string
  status: string
  created_at: string
}

interface AssistantConfig {
  aiAnswersCalls: boolean
  aiAnswersSms: boolean
  autoUpsell: boolean
  maxDiscount: number
  greeting: string
  specialInfo: string
  voice: VoiceName
  assistantName: string
}

export default function DashboardPage() {
  const [currentStatus, setCurrentStatus] = useState<StatusMode>('working')
  const [notes, setNotes] = useState(STATUS_OPTIONS.working.defaultNote)
  const [location, setLocation] = useState('shop')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusSaved, setStatusSaved] = useState(false)

  const [config, setConfig] = useState<AssistantConfig>({
    aiAnswersCalls: true,
    aiAnswersSms: true,
    autoUpsell: true,
    maxDiscount: 15,
    greeting: "Hey! Thanks for reaching out to EmperorLinda Cell Phone Repairs. How can I help you today?",
    specialInfo: "",
    voice: 'nova',
    assistantName: 'Linda',
  })

  // Derive the selected name's gender and available voices
  const selectedNameConfig = ASSISTANT_NAMES.find(n => n.value === config.assistantName) ?? ASSISTANT_NAMES[0]
  const availableVoices = getVoicesForGender(selectedNameConfig.gender)

  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [chatLogOpen, setChatLogOpen] = useState(false)

  // Load leads from DynamoDB on mount + auto-refresh every 15s
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads')
        if (!response.ok) {
          console.error('Failed to fetch leads:', response.status)
          return
        }
        const data = await response.json() as { status: string; leads: Lead[] }
        if (data.status === 'success' && Array.isArray(data.leads)) {
          setLeads(data.leads)
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setLeadsLoading(false)
      }
    }
    fetchLeads()
    const interval = setInterval(fetchLeads, 15_000)
    return () => clearInterval(interval)
  }, [])

  // Load state from backend on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch('/api/state')
        if (!response.ok) {
          console.error('Failed to load state')
          return
        }
        const data = await response.json()
        if (data.status === 'success' && data.state) {
          const state = data.state
          // Update status if valid, otherwise default to 'working'
          if (state.status && state.status in STATUS_OPTIONS) {
            setCurrentStatus(state.status as StatusMode)
          }
          if (state.notes) setNotes(state.notes)
          if (state.location) setLocation(state.location)
          
          // Update config with all persisted fields
          setConfig(prev => ({
            ...prev,
            voice: state.voice || prev.voice,
            assistantName: state.assistant_name || prev.assistantName,
            specialInfo: state.special_info || '',
            greeting: state.greeting || prev.greeting,
            maxDiscount: state.max_discount !== undefined ? state.max_discount : prev.maxDiscount,
            aiAnswersCalls: state.ai_answers_calls !== undefined ? state.ai_answers_calls : prev.aiAnswersCalls,
            aiAnswersSms: state.ai_answers_sms !== undefined ? state.ai_answers_sms : prev.aiAnswersSms,
            autoUpsell: state.auto_upsell !== undefined ? state.auto_upsell : prev.autoUpsell,
          }))
        }
      } catch (error) {
        console.error('Error loading state:', error)
      }
    }
    loadState()
  }, [])

  const statusConfig = STATUS_OPTIONS[currentStatus]

  const handleStatusChange = (mode: StatusMode) => {
    setCurrentStatus(mode)
    setNotes(STATUS_OPTIONS[mode].defaultNote)
    setStatusSaved(false)
  }

  const handleSaveStatus = async () => {
    setStatusSaving(true)
    setStatusSaved(false)

    try {
      // Save to local API route (which handles DynamoDB)
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: currentStatus,
          location,
          notes,
          special_info: config.specialInfo,
          voice: config.voice,
          assistant_name: config.assistantName,
          greeting: config.greeting,
          max_discount: config.maxDiscount,
          ai_answers_calls: config.aiAnswersCalls,
          ai_answers_sms: config.aiAnswersSms,
          auto_upsell: config.autoUpsell,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save state')
      }

      setStatusSaved(true)
      setTimeout(() => setStatusSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save status:', error)
      alert('Failed to save settings. Check console for details.')
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-emperor-black">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-emperor-black/80 border-b border-emperor-gold/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-emperor-cream/5 transition-colors">
              <ArrowLeft className="w-4 h-4 text-emperor-cream/50" />
            </Link>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emperor-gold" />
              <span className="font-display font-semibold text-sm">Brandon&apos;s Cockpit</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChatLogOpen(true)}
              className="p-2 rounded-lg hover:bg-emperor-cream/5 transition-all text-emperor-cream/30 hover:text-emperor-gold group relative"
              title="Chat Transcripts"
            >
              <ScrollText className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emperor-gold/60 group-hover:bg-emperor-gold animate-pulse" />
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono ${statusConfig.bgColor} ${statusConfig.color}`}>
              <statusConfig.icon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </div>
          </div>
        </div>
      </header>

      {/* Chat Log Overlay */}
      <ChatLogOverlay isOpen={chatLogOpen} onClose={() => setChatLogOpen(false)} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left Column - Status & Config */}
          <div className="lg:col-span-1 space-y-6">

            {/* Status Selector */}
            <div className="glass-panel p-6">
              <h2 className="font-display font-semibold text-sm text-emperor-cream/80 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emperor-gold" />
                Your Status
              </h2>

              <div className="grid grid-cols-3 gap-2 mb-5">
                {(Object.keys(STATUS_OPTIONS) as StatusMode[]).map((mode) => {
                  const opt = STATUS_OPTIONS[mode]
                  const isActive = currentStatus === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => handleStatusChange(mode)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center ${
                        isActive
                          ? `${opt.bgColor} ${opt.color}`
                          : 'border-transparent hover:bg-emperor-cream/5 text-emperor-cream/40 hover:text-emperor-cream/60'
                      }`}
                    >
                      <opt.icon className="w-5 h-5" />
                      <span className="text-[10px] font-mono leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Notes */}
              <label className="block text-xs text-emperor-cream/30 mb-1.5 font-mono">What LINDA tells customers:</label>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setStatusSaved(false); }}
                className="input-emperor !py-2.5 text-sm resize-none h-20"
                placeholder="Custom message for customers..."
              />

              <label className="block text-xs text-emperor-cream/30 mb-1.5 mt-3 font-mono">Location:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setStatusSaved(false); }}
                className="input-emperor !py-2.5 text-sm"
                placeholder="shop, gym, home..."
              />

              <button
                onClick={handleSaveStatus}
                disabled={statusSaving}
                className={`w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  statusSaved
                    ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                    : 'btn-emperor'
                }`}
              >
                {statusSaving ? (
                  <div className="w-4 h-4 border-2 border-emperor-black/30 border-t-emperor-black rounded-full animate-spin" />
                ) : statusSaved ? (
                  <>All Settings Saved!</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save All Settings
                  </>
                )}
              </button>
              <p className="text-[10px] text-emperor-cream/20 mt-2 font-mono text-center">
                Saves status + all assistant config below
              </p>
            </div>

            {/* AI Config */}
            <div className="glass-panel p-6">
              <h2 className="font-display font-semibold text-sm text-emperor-cream/80 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emperor-gold" />
                Assistant Settings
              </h2>

              <div className="space-y-4">
                {/* AI Answers Calls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {config.aiAnswersCalls ? <Volume2 className="w-4 h-4 text-accent-emerald" /> : <VolumeX className="w-4 h-4 text-emperor-cream/30" />}
                    <span className="text-sm text-emperor-cream/70">AI Answers Calls</span>
                  </div>
                  <button
                    onClick={() => { setConfig(prev => ({ ...prev, aiAnswersCalls: !prev.aiAnswersCalls })); setStatusSaved(false); }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      config.aiAnswersCalls ? 'bg-accent-emerald' : 'bg-emperor-smoke'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      config.aiAnswersCalls ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* AI Answers SMS */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${config.aiAnswersSms ? 'text-accent-emerald' : 'text-emperor-cream/30'}`} />
                    <span className="text-sm text-emperor-cream/70">AI Answers SMS</span>
                  </div>
                  <button
                    onClick={() => { setConfig(prev => ({ ...prev, aiAnswersSms: !prev.aiAnswersSms })); setStatusSaved(false); }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      config.aiAnswersSms ? 'bg-accent-emerald' : 'bg-emperor-smoke'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      config.aiAnswersSms ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Auto Upsell */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${config.autoUpsell ? 'text-accent-emerald' : 'text-emperor-cream/30'}`} />
                    <span className="text-sm text-emperor-cream/70">Auto-Upsell</span>
                  </div>
                  <button
                    onClick={() => { setConfig(prev => ({ ...prev, autoUpsell: !prev.autoUpsell })); setStatusSaved(false); }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      config.autoUpsell ? 'bg-accent-emerald' : 'bg-emperor-smoke'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      config.autoUpsell ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Max Auto-Discount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-emperor-cream/70">Max Auto-Discount</span>
                    <span className="text-sm font-mono text-emperor-gold">{config.maxDiscount}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={5}
                    value={config.maxDiscount}
                    onChange={(e) => { setConfig(prev => ({ ...prev, maxDiscount: parseInt(e.target.value) })); setStatusSaved(false); }}
                    className="w-full accent-emperor-gold h-1.5 rounded-full appearance-none bg-emperor-smoke cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-emperor-cream/20 font-mono mt-1">
                    <span>0%</span>
                    <span>25%</span>
                  </div>
                </div>

                {/* Assistant Name Selector */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-emperor-gold" />
                    <span className="text-sm text-emperor-cream/70">Assistant Name</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ASSISTANT_NAMES.map((n) => (
                      <button
                        key={n.value}
                        onClick={() => {
                          const nameGender = n.gender
                          const currentVoice = ALL_VOICE_OPTIONS.find(v => v.value === config.voice)
                          const currentVoiceCompatible = currentVoice &&
                            (currentVoice.gender === nameGender || currentVoice.gender === 'neutral' || nameGender === 'neutral')
                          setConfig(prev => ({
                            ...prev,
                            assistantName: n.value,
                            // Auto-switch voice if current voice doesn't match new name's gender
                            voice: currentVoiceCompatible ? prev.voice : DEFAULT_VOICE_FOR_GENDER[nameGender],
                          }))
                          setStatusSaved(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-center transition-all border ${
                          config.assistantName === n.value
                            ? 'bg-emperor-gold/10 border-emperor-gold/30 text-emperor-gold'
                            : 'border-emperor-cream/5 hover:bg-emperor-cream/5 text-emperor-cream/40'
                        }`}
                      >
                        <span className="text-xs font-semibold block">{n.label}</span>
                        <span className="text-[10px] opacity-60 block leading-tight capitalize">{n.gender}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selector (filtered by name gender) */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-4 h-4 text-emperor-gold" />
                    <span className="text-sm text-emperor-cream/70">{config.assistantName}&apos;s Voice</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableVoices.map((v) => (
                      <button
                        key={v.value}
                        onClick={() => { setConfig(prev => ({ ...prev, voice: v.value })); setStatusSaved(false); }}
                        className={`px-3 py-2 rounded-lg text-left transition-all border ${
                          config.voice === v.value
                            ? 'bg-emperor-gold/10 border-emperor-gold/30 text-emperor-gold'
                            : 'border-emperor-cream/5 hover:bg-emperor-cream/5 text-emperor-cream/40'
                        }`}
                      >
                        <span className="text-xs font-semibold block">{v.label}</span>
                        <span className="text-[10px] opacity-60 block leading-tight">{v.description}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-emperor-cream/20 mt-1.5 font-mono">
                    {selectedNameConfig.gender === 'neutral'
                      ? 'All voices available for neutral names'
                      : `Showing ${selectedNameConfig.gender} + neutral voices`
                    } &middot; Same voice for calls &amp; web demo
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Lead Feed */}
          <div className="lg:col-span-2 space-y-6">

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                const today = new Date().toISOString().split('T')[0]
                const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                return [
                  { label: "Today's Leads", value: leads.filter(l => l.appointment_date === today).length.toString(), icon: User, color: 'text-emperor-gold' },
                  { label: "Tomorrow", value: leads.filter(l => l.appointment_date === tomorrow).length.toString(), icon: Calendar, color: 'text-accent-blue' },
                  { label: "Total Booked", value: leads.filter(l => l.status === 'booked').length.toString(), icon: Zap, color: 'text-accent-emerald' },
                ]
              })().map((stat) => (
                <div key={stat.label} className="glass-panel p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-emperor-cream/40 font-mono">{stat.label}</span>
                  </div>
                  <span className="font-display text-3xl font-bold text-emperor-cream">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Lead Feed */}
            <div className="glass-panel">
              <div className="px-6 py-4 border-b border-emperor-gold/10 flex items-center justify-between">
                <h2 className="font-display font-semibold text-sm text-emperor-cream/80 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emperor-gold" />
                  Lead Feed
                </h2>
                <span className="text-xs text-emperor-cream/30 font-mono">Real-time from DynamoDB</span>
              </div>

              <div className="divide-y divide-emperor-gold/5 max-h-[600px] overflow-y-auto">
                {leads.map((lead) => (
                  <div
                    key={lead.lead_id}
                    className="px-6 py-4 hover:bg-emperor-cream/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-emperor-gold/60">{lead.lead_id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            lead.status === 'booked'
                              ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                              : lead.status === 'completed'
                              ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                              : 'bg-emperor-cream/5 text-emperor-cream/40 border border-emperor-cream/10'
                          }`}>
                            {(lead.status || 'pending').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-emperor-cream/70 font-medium">{lead.device || 'Unknown Device'}</span>
                          <span className="text-emperor-cream/30">&middot;</span>
                          <span className="text-emperor-cream/50 capitalize">{(lead.repair_type || 'other').replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-emperor-cream/30 font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {lead.appointment_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lead.appointment_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {leads.length === 0 && !leadsLoading && (
                  <div className="px-6 py-12 text-center">
                    <MessageSquare className="w-8 h-8 text-emperor-cream/10 mx-auto mb-3" />
                    <p className="text-sm text-emperor-cream/30">No leads yet. They&apos;ll appear here in real-time.</p>
                  </div>
                )}

                {leadsLoading && (
                  <div className="px-6 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-emperor-gold/30 border-t-emperor-gold rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-emperor-cream/30 font-mono">Loading leads from DynamoDB...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Greeting Editor */}
            <div className="glass-panel p-6">
              <h2 className="font-display font-semibold text-sm text-emperor-cream/80 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emperor-gold" />
                Default Greeting
              </h2>
              <textarea
                value={config.greeting}
                onChange={(e) => { setConfig(prev => ({ ...prev, greeting: e.target.value })); setStatusSaved(false); }}
                className="input-emperor text-sm resize-none h-20"
                placeholder="What LINDA says when a customer first reaches out..."
              />
              <p className="text-[11px] text-emperor-cream/20 mt-2 font-mono">
                This is LINDA&apos;s opening message for new conversations.
              </p>
            </div>

            {/* Special Info / Context */}
            <div className="glass-panel p-6">
              <h2 className="font-display font-semibold text-sm text-emperor-cream/80 mb-1 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emperor-gold" />
                Special Info
                <span className="text-[10px] font-mono text-emperor-cream/30 ml-auto">optional</span>
              </h2>
              <p className="text-[11px] text-emperor-cream/20 mb-3 font-mono">
                Deals, events, closures, or anything LINDA should know right now.
              </p>
              <textarea
                value={config.specialInfo}
                onChange={(e) => { setConfig(prev => ({ ...prev, specialInfo: e.target.value })); setStatusSaved(false); }}
                className="input-emperor text-sm resize-none h-28"
                placeholder={`Examples:\n• 20% off all screen repairs this week!\n• Closed Saturday for Presidents Day\n• New Samsung parts in stock — mention to Galaxy owners`}
              />
              <p className="text-[11px] text-emperor-cream/20 mt-2 font-mono">
                LINDA will weave this context into conversations naturally — not read it verbatim.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
