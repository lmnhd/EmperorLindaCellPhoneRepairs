'use client'

import { useState, useEffect, useRef } from 'react'
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
  PhoneCall,
  MapPin,
  Bell,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Settings,
  Save,
  Volume2,
  Shield,
  Zap,
  ScrollText,
  Play,
  BarChart3,
  Bot,
  CheckCircle,
  Plus,
  Trash2,
  DollarSign,
  ListChecks,
  AlertTriangle,
} from 'lucide-react'
import ChatLogOverlay from '@/components/ChatLogOverlay'
import AgentPromptControlPanel from '@/components/AgentPromptControlPanel'

type DashboardTab = 'brandon' | 'leads' | 'agent'
type StatusMode = 'working' | 'gym' | 'driving' | 'break' | 'sleeping' | 'custom'
type VoiceName = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar'
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
  { value: 'cedar',   label: 'Cedar',   description: 'Deep, grounded  confident',      gender: 'male'    },
  { value: 'verse',   label: 'Verse',   description: 'Warm, narrative  conversational',gender: 'male'    },
  { value: 'echo',    label: 'Echo',    description: 'Energetic, clear  direct',       gender: 'neutral' },
  { value: 'coral',   label: 'Coral',   description: 'Bright, polished  welcoming',    gender: 'female'  },
  { value: 'shimmer', label: 'Shimmer', description: 'Friendly, expressive  upbeat',   gender: 'female'  },
  { value: 'alloy',   label: 'Alloy',   description: 'Balanced, versatile  neutral',   gender: 'neutral' },
  { value: 'ash',     label: 'Ash',     description: 'Calm, clean  minimal',            gender: 'neutral' },
  { value: 'ballad',  label: 'Ballad',  description: 'Smooth, modern  polished',        gender: 'neutral' },
  { value: 'sage',    label: 'Sage',    description: 'Steady, practical  reassuring',   gender: 'neutral' },
  { value: 'marin',   label: 'Marin',   description: 'Crisp, balanced  professional',  gender: 'neutral' },
]

const ASSISTANT_NAMES: AssistantNameOption[] = [
  { value: 'Linda',  label: 'Linda',  gender: 'female'  },
  { value: 'Marcus', label: 'Marcus', gender: 'male'    },
  { value: 'Devon',  label: 'Devon',  gender: 'neutral' },
  { value: 'Keisha', label: 'Keisha', gender: 'female'  },
  { value: 'Darius', label: 'Darius', gender: 'male'    },
  { value: 'Alex',   label: 'Alex',   gender: 'neutral' },
]

const PERSONA_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Polished, confident' },
  { value: 'laidback',     label: 'Laid Back',    description: 'Neighborhood, chill' },
  { value: 'hustler',      label: 'Hustler',      description: 'High energy, closer' },
]

const DEFAULT_VOICE_FOR_GENDER: Record<Gender, VoiceName> = {
  female:  'coral',
  male:    'cedar',
  neutral: 'alloy',
}

const LEGACY_TO_REALTIME_VOICE: Record<string, VoiceName> = {
  nova: 'coral',
  onyx: 'cedar',
  fable: 'verse',
}

function normalizeVoiceName(input: string | undefined): VoiceName | undefined {
  if (!input) return undefined

  const normalized = input.trim().toLowerCase()
  const direct = ALL_VOICE_OPTIONS.find((voice) => voice.value === normalized)
  if (direct) {
    return direct.value
  }

  return LEGACY_TO_REALTIME_VOICE[normalized]
}

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
  working:  { icon: Wrench,   label: 'At the Shop',   color: 'text-accent-emerald',   bgColor: 'bg-accent-emerald/10 border-accent-emerald/20', defaultNote: 'Available for walk-ins and appointments' },
  gym:      { icon: Dumbbell, label: 'At the Gym',    color: 'text-emperor-gold',     bgColor: 'bg-emperor-gold/10 border-emperor-gold/20',     defaultNote: 'Back in 1-2 hours' },
  driving:  { icon: Car,      label: 'Driving / Out', color: 'text-accent-blue',      bgColor: 'bg-accent-blue/10 border-accent-blue/20',       defaultNote: 'On the move, will respond soon' },
  break:    { icon: Coffee,   label: 'On Break',      color: 'text-accent-amber',     bgColor: 'bg-accent-amber/10 border-accent-amber/20',     defaultNote: 'Quick break, back shortly' },
  sleeping: { icon: Moon,     label: 'Away / Closed', color: 'text-purple-400',       bgColor: 'bg-purple-400/10 border-purple-400/20',         defaultNote: 'Currently Closed.' },
  custom:   { icon: Settings, label: 'Custom',        color: 'text-emperor-cream/60', bgColor: 'bg-emperor-cream/5 border-emperor-cream/10',    defaultNote: '' },
}

interface Lead {
  lead_id: string
  phone: string
  customer_name?: string
  repair_type: string
  device: string
  appointment_date: string
  appointment_time: string
  status: string
  lead_type?: 'appointment' | 'callback' | 'on_site'
  source?: string
  notes?: string
  created_at: number
  timestamp?: number
}

function formatLeadCreatedAt(unix?: number): string {
  if (!unix || !Number.isFinite(unix)) return '—'
  return new Date(unix * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatLeadScheduledAt(lead: Lead): string {
  const date = typeof lead.appointment_date === 'string' ? lead.appointment_date.trim() : ''
  const time = typeof lead.appointment_time === 'string' ? lead.appointment_time.trim() : ''

  if (date && time) return `${date} at ${time}`
  if (date) return date
  if (time) return time
  return 'Not scheduled'
}

function getScheduleLabelByType(leadType?: Lead['lead_type']): string {
  if (leadType === 'on_site') return 'On-site visit'
  if (leadType === 'callback') return 'Callback window'
  return 'Appointment time'
}

function leadSourceLabel(source?: string): string {
  if (!source) return 'unknown'
  if (source === 'web-chat') return 'web chat'
  if (source === 'twilio-sms') return 'sms'
  if (source === 'twilio-voice') return 'voice call'
  return source
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
  persona: string
  servicesBlock: string    // kept for DynamoDB compat (serialised from serviceLines)
  serviceLines: string[]   // UI list — each item is one service entry
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-accent-emerald' : 'bg-emperor-smoke'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-emperor-cream/30 font-mono mb-2">{children}</p>
  )
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
        active
          ? 'bg-emperor-gold/10 border-emperor-gold/30 text-emperor-gold'
          : 'border-emperor-cream/5 hover:bg-emperor-cream/5 text-emperor-cream/40 hover:text-emperor-cream/70'
      }`}
    >
      {children}
    </button>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-panel p-6 ${className}`}>{children}</div>
}

function PanelHeader({ icon: Icon, title, aside }: { icon: typeof Wrench; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon className="w-4 h-4 text-emperor-gold" />
      <h2 className="font-display font-semibold text-sm text-emperor-cream/80">{title}</h2>
      {aside && <span className="ml-auto">{aside}</span>}
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab,    setActiveTab]    = useState<DashboardTab>('brandon')
  const [currentStatus, setCurrentStatus] = useState<StatusMode>('working')
  const [notes,        setNotes]        = useState(STATUS_OPTIONS.working.defaultNote)
  const [operationalHoursEnabled, setOperationalHoursEnabled] = useState(false)
  const [operationalOpenTime, setOperationalOpenTime] = useState('09:00')
  const [operationalCloseTime, setOperationalCloseTime] = useState('17:00')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusSaved,  setStatusSaved]  = useState(false)
  const [testingVoice, setTestingVoice] = useState<string | null>(null)
  const [leads,        setLeads]        = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [chatLogOpen,  setChatLogOpen]  = useState(false)
  const [isMobile,     setIsMobile]     = useState(false)
  const hasLoadedInitialStateRef = useRef(false)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)

  const DEFAULT_SERVICE_LINES = [
    'Screen replacement: starting at $79 (iPhone), $89 (Samsung)',
    'Battery replacement: starting at $49',
    'Charging port repair: starting at $59',
    'Water damage assessment: $39 diagnostic fee',
    'Back glass replacement: starting at $69',
    'On-site repair: additional $20 service fee',
    'Remote diagnostic: free via phone/video',
    'All repairs include a 90-day warranty. Most done in under an hour.',
    'SERVICE TYPES: Walk-in | On-site ($20 fee) | Remote (free diagnostic)',
  ]

  const DEFAULT_SERVICES_BLOCK =
    'SERVICES & PRICING (approximate — always say "starting at"):\n' +
    DEFAULT_SERVICE_LINES.map(l => `- ${l}`).join('\n')

  const [newServiceText, setNewServiceText] = useState('')

  const [config, setConfig] = useState<AssistantConfig>({
    aiAnswersCalls: true,
    aiAnswersSms:   true,
    autoUpsell:     true,
    maxDiscount:    15,
    greeting:       "Welcome, need you phone fixed fast?",
    specialInfo:    '',
    voice:          'coral',
    assistantName:  'Linda',
    persona:        'professional',
    servicesBlock:  DEFAULT_SERVICES_BLOCK,
    serviceLines:   DEFAULT_SERVICE_LINES,
  })

  const selectedNameConfig = ASSISTANT_NAMES.find(n => n.value === config.assistantName) ?? ASSISTANT_NAMES[0]
  const availableVoices    = getVoicesForGender(selectedNameConfig.gender)
  const statusConfig       = STATUS_OPTIONS[currentStatus]
  const operationalHoursWarning = !operationalHoursEnabled && currentStatus === 'sleeping'

  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
  const stats = [
    { label: "Today",    value: leads.filter(l => l.appointment_date === today).length,   icon: Zap,      color: 'text-emperor-gold'   },
    { label: 'Tomorrow', value: leads.filter(l => l.appointment_date === tomorrow).length, icon: Calendar, color: 'text-accent-blue'    },
    { label: 'Booked',   value: leads.filter(l => l.status === 'booked').length,           icon: User,     color: 'text-accent-emerald' },
  ]

  const TABS: Array<{ id: DashboardTab; label: string; icon: typeof Wrench; badge?: number }> = [
    { id: 'brandon', label: 'Brandon',       icon: Smartphone                          },
    { id: 'leads',   label: 'Leads',         icon: BarChart3, badge: leads.length || 0 },
    { id: 'agent',   label: 'Agent Control', icon: Bot                                 },
  ]

  const testVoice = async (voiceName: string) => {
    setTestingVoice(voiceName)
    try {
      const text = `Hey, this is ${config.assistantName} from EmperorLinda Cell Phone Repairs. How can I help you today?`
      const res  = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceName }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setTestingVoice(null) }
      await audio.play()
    } catch {
      setTestingVoice(null)
    }
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res  = await fetch('/api/leads', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json() as { status: string; leads: Lead[] }
        if (data.status === 'success' && Array.isArray(data.leads)) setLeads(data.leads)
      } catch { /* silent */ } finally { setLeadsLoading(false) }
    }
    fetchLeads()
    const iv = setInterval(fetchLeads, 15_000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch state and agent config in parallel — agent_shared_tone is source of truth for persona
        const [stateRes, agentRes] = await Promise.all([
          fetch('/api/state'),
          fetch('/api/agent-config'),
        ])
        const stateData = stateRes.ok ? await stateRes.json() : null
        const agentData = agentRes.ok ? await agentRes.json() : null

        const agentTone = (agentData?.values?.agent_shared_tone as string | undefined) ?? ''

        if (stateData?.status === 'success' && stateData.state) {
          const s = stateData.state
          const normalizedVoice = normalizeVoiceName(typeof s.voice === 'string' ? s.voice : undefined)
          if (s.status && s.status in STATUS_OPTIONS) setCurrentStatus(s.status as StatusMode)
          if (s.notes)    setNotes(s.notes)
          if (typeof s.operational_hours_enabled === 'boolean') {
            setOperationalHoursEnabled(s.operational_hours_enabled)
          }
          if (typeof s.operational_open_time === 'string' && s.operational_open_time.trim().length > 0) {
            setOperationalOpenTime(s.operational_open_time)
          }
          if (typeof s.operational_close_time === 'string' && s.operational_close_time.trim().length > 0) {
            setOperationalCloseTime(s.operational_close_time)
          }
          setConfig(prev => ({
            ...prev,
            voice:          normalizedVoice      || prev.voice,
            assistantName:  s.assistant_name     || prev.assistantName,
            // agent_shared_tone is source of truth; fall back to state.persona
            persona:        agentTone            || s.persona || prev.persona,
            specialInfo:    s.special_info       || '',
            greeting:       s.greeting           || prev.greeting,
            servicesBlock:  s.services_block     || prev.servicesBlock,
            serviceLines:   (() => {
              const raw = s.services_block as string | undefined
              if (!raw) return prev.serviceLines
              // Stored as newline-separated lines (with optional leading dash+space)
              const parsed = raw.split('\n')
                .map((l: string) => l.replace(/^[-\s]+/, '').trim())
                .filter((l: string) => l.length > 0 && !l.startsWith('SERVICES &'))
              return parsed.length > 0 ? parsed : prev.serviceLines
            })(),
            maxDiscount:    s.max_discount      !== undefined ? s.max_discount      : prev.maxDiscount,
            aiAnswersCalls: s.ai_answers_calls  !== undefined ? s.ai_answers_calls  : prev.aiAnswersCalls,
            aiAnswersSms:   s.ai_answers_sms    !== undefined ? s.ai_answers_sms    : prev.aiAnswersSms,
            autoUpsell:     s.auto_upsell       !== undefined ? s.auto_upsell       : prev.autoUpsell,
          }))
        }
      } catch { /* silent */ }
      finally {
        hasLoadedInitialStateRef.current = true
      }
    }
    load()
  }, [])

  const handleStatusChange = (mode: StatusMode) => {
    setCurrentStatus(mode)
    setNotes(STATUS_OPTIONS[mode].defaultNote)
    setStatusSaved(false)
  }

  const handleSaveStatus = async (silent = false) => {
    if (isSavingRef.current) {
      return
    }

    isSavingRef.current = true
    setStatusSaving(true)
    setStatusSaved(false)
    try {
      // Save Brandon state and sync agent_shared_tone in parallel
      const [stateRes] = await Promise.all([
        fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status:           currentStatus,
            notes,
            special_info:     config.specialInfo,
            voice:            config.voice,
            assistant_name:   config.assistantName,
            persona:          config.persona,
            greeting:         config.greeting,
            max_discount:     config.maxDiscount,
            ai_answers_calls: config.aiAnswersCalls,
            ai_answers_sms:   config.aiAnswersSms,
            auto_upsell:      config.autoUpsell,
            operational_hours_enabled: operationalHoursEnabled,
            operational_open_time: operationalHoursEnabled ? operationalOpenTime : null,
            operational_close_time: operationalHoursEnabled ? operationalCloseTime : null,
            services_block:   'SERVICES & PRICING (approximate — always say "starting at"):\n' +
                              config.serviceLines.map(l => `- ${l}`).join('\n'),
          }),
        }),
        // Keep agent_shared_tone in sync — it is the source of truth for persona/tone
        fetch('/api/agent-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: { agent_shared_tone: config.persona } }),
        }),
      ])
      if (!stateRes.ok) throw new Error('Failed to save state')
      setStatusSaved(true)
      setTimeout(() => setStatusSaved(false), 3000)
    } catch (error) {
      if (!silent) {
        alert('Failed to save settings. Check console for details.')
      }
      console.error('Failed to save dashboard settings:', error)
    } finally {
      isSavingRef.current = false
      setStatusSaving(false)
    }
  }

  useEffect(() => {
    if (!hasLoadedInitialStateRef.current) {
      return
    }

    setStatusSaved(false)

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      void handleSaveStatus(true)
    }, 900)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [currentStatus, notes, config, operationalHoursEnabled, operationalOpenTime, operationalCloseTime])

  return (
    <main className="min-h-screen bg-emperor-black">

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-emperor-black/90 border-b border-emperor-gold/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
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
                className="p-2 rounded-lg hover:bg-emperor-cream/5 text-emperor-cream/30 hover:text-emperor-gold group relative transition-all"
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

          <div className="flex items-end gap-1 -mb-px overflow-x-auto no-scrollbar">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all duration-150 rounded-t-lg whitespace-nowrap sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
                    isActive
                      ? 'border-emperor-gold text-emperor-gold bg-emperor-gold/5'
                      : 'border-transparent text-emperor-cream/40 hover:text-emperor-cream/70 hover:bg-emperor-cream/[0.03]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-emperor-gold/20 text-emperor-gold' : 'bg-emperor-cream/10 text-emperor-cream/40'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <ChatLogOverlay isOpen={chatLogOpen} onClose={() => setChatLogOpen(false)} />

      <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-8">

        {/* TAB 1  BRANDON */}
        {activeTab === 'brandon' && (
          <div className="space-y-6">

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Status */}
              <Panel>
                <PanelHeader
                  icon={Zap}
                  title="Your Status"
                  aside={<span className="text-[10px] font-mono text-emperor-cream/20">tells LINDA how to respond</span>}
                />
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {(Object.keys(STATUS_OPTIONS) as StatusMode[]).map((mode) => {
                    const opt      = STATUS_OPTIONS[mode]
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
                <div className="space-y-3">
                  <div>
                    <FieldLabel>What LINDA tells customers</FieldLabel>
                    <textarea
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); setStatusSaved(false) }}
                      className="input-emperor !py-2.5 text-sm resize-none h-20"
                      placeholder="Custom message for customers..."
                    />
                  </div>

                  <div className="pt-2 border-t border-emperor-cream/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <FieldLabel>Operational Hours</FieldLabel>
                        <p className="text-[11px] text-emperor-cream/35 font-mono">Optional scheduling window for the agent.</p>
                      </div>
                      <Toggle
                        on={operationalHoursEnabled}
                        onToggle={() => {
                          setOperationalHoursEnabled((prev) => !prev)
                          setStatusSaved(false)
                        }}
                      />
                    </div>

                    {operationalHoursEnabled ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <FieldLabel>Open Time</FieldLabel>
                          <input
                            type="time"
                            value={operationalOpenTime}
                            onChange={(e) => {
                              setOperationalOpenTime(e.target.value)
                              setStatusSaved(false)
                            }}
                            className="input-emperor !py-2.5 text-sm"
                          />
                        </div>
                        <div>
                          <FieldLabel>Close Time</FieldLabel>
                          <input
                            type="time"
                            value={operationalCloseTime}
                            onChange={(e) => {
                              setOperationalCloseTime(e.target.value)
                              setStatusSaved(false)
                            }}
                            className="input-emperor !py-2.5 text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-emperor-cream/10 bg-emperor-cream/5 px-3 py-2 text-[11px] text-emperor-cream/45 font-mono">
                        Disabled — agent has no hour limits unless status/rules block scheduling.
                      </div>
                    )}

                    {operationalHoursWarning && (
                      <div className="rounded-lg border border-accent-red/35 bg-accent-red/10 px-3 py-2 text-[11px] font-mono text-accent-red/85 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          Operational Hours are disabled while Away / Closed is active. LINDA will treat the shop as closed indefinitely and stop scheduling. Enable Operational Hours and/or turn off Away / Closed to resume scheduling.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>

              {/* Greeting + Live Context */}
              <Panel className="space-y-5">
                <div>
                  <PanelHeader icon={MessageSquare} title="Opening Greeting" />
                  <textarea
                    value={config.greeting}
                    onChange={(e) => { setConfig(prev => ({ ...prev, greeting: e.target.value })); setStatusSaved(false) }}
                    className="input-emperor text-sm resize-none h-20"
                    placeholder="What LINDA says when a customer first reaches out..."
                  />
                  <p className="text-[11px] text-emperor-cream/20 mt-1.5 font-mono">LINDA&apos;s opening line for new conversations.</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-emperor-gold" />
                    <h2 className="font-display font-semibold text-sm text-emperor-cream/80">Live Context</h2>
                    <span className="text-[10px] font-mono text-emperor-cream/30 ml-auto">optional</span>
                  </div>
                  <p className="text-[11px] text-emperor-cream/20 mb-2 font-mono">
                    Deals, closures, new parts  anything LINDA should know right now.
                  </p>
                  <textarea
                    value={config.specialInfo}
                    onChange={(e) => { setConfig(prev => ({ ...prev, specialInfo: e.target.value })); setStatusSaved(false) }}
                    className="input-emperor text-sm resize-none h-20"
                    placeholder=" 20% off screen repairs this week!&#10; Closed Saturday&#10; New Samsung parts in"
                  />
                  <p className="text-[11px] text-emperor-cream/20 mt-1.5 font-mono">LINDA weaves this in naturally  won&apos;t read verbatim.</p>
                </div>
              </Panel>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Assistant Identity */}
              <Panel className="space-y-5">
                <PanelHeader icon={Volume2} title="Assistant Identity" />

                <div>
                  <FieldLabel>Name</FieldLabel>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ASSISTANT_NAMES.map((n) => (
                      <ChipButton
                        key={n.value}
                        active={config.assistantName === n.value}
                        onClick={() => {
                          const currentVoice = ALL_VOICE_OPTIONS.find(v => v.value === config.voice)
                          const compatible   = currentVoice && (currentVoice.gender === n.gender || currentVoice.gender === 'neutral' || n.gender === 'neutral')
                          setConfig(prev => ({
                            ...prev,
                            assistantName: n.value,
                            voice: compatible ? prev.voice : DEFAULT_VOICE_FOR_GENDER[n.gender],
                          }))
                          setStatusSaved(false)
                        }}
                      >
                        <span className="text-xs font-semibold block">{n.label}</span>
                        <span className="text-[10px] opacity-60 block leading-tight capitalize">{n.gender}</span>
                      </ChipButton>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>{config.assistantName}&apos;s Voice  <span className="normal-case">click  to preview</span></FieldLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableVoices.map((v) => (
                      <div key={v.value} className="relative">
                        <ChipButton
                          active={config.voice === v.value}
                          onClick={() => { setConfig(prev => ({ ...prev, voice: v.value })); setStatusSaved(false) }}
                        >
                          <span className="text-xs font-semibold block pr-6">{v.label}</span>
                          <span className="text-[10px] opacity-60 block leading-tight">{v.description}</span>
                        </ChipButton>
                        <button
                          onClick={() => testVoice(v.value)}
                          disabled={testingVoice === v.value}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-emperor-gold/20 transition-colors disabled:opacity-50"
                          title={`Preview ${v.label}`}
                        >
                          {testingVoice === v.value
                            ? <div className="w-3 h-3 border border-emperor-gold/30 border-t-emperor-gold rounded-full animate-spin" />
                            : <Play className="w-3 h-3 text-emperor-gold" />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-emperor-cream/20 mt-1.5 font-mono">
                    {selectedNameConfig.gender === 'neutral' ? 'All voices available' : `${selectedNameConfig.gender} + neutral voices`}  same for calls &amp; web
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FieldLabel>Personality Mode</FieldLabel>
                    <span className="ml-auto text-[10px] font-mono text-emperor-gold/40 border border-emperor-gold/20 rounded px-1.5 py-0.5">synced ↔ Agent Tone</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PERSONA_OPTIONS.map((p) => (
                      <ChipButton
                        key={p.value}
                        active={config.persona === p.value}
                        onClick={() => { setConfig(prev => ({ ...prev, persona: p.value })); setStatusSaved(false) }}
                      >
                        <span className="text-xs font-semibold block">{p.label}</span>
                        <span className="text-[10px] opacity-60 block leading-tight">{p.description}</span>
                      </ChipButton>
                    ))}
                  </div>
                  <p className="text-[10px] text-emperor-cream/20 mt-1.5 font-mono">Saved here → syncs Agent Control Tone automatically.</p>
                </div>
              </Panel>

              {/* AI Settings + Save */}
              <Panel>
                <PanelHeader icon={Settings} title="AI Settings" />

                <div className="space-y-4">
                  {([
                    { key: 'aiAnswersCalls' as const, label: 'AI Answers Calls', icon: Phone         },
                    { key: 'aiAnswersSms'   as const, label: 'AI Answers SMS',   icon: MessageSquare },
                    { key: 'autoUpsell'     as const, label: 'Auto-Upsell',      icon: Shield        },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${config[key] ? 'text-accent-emerald' : 'text-emperor-cream/25'}`} />
                        <span className="text-sm text-emperor-cream/70">{label}</span>
                      </div>
                      <Toggle
                        on={config[key]}
                        onToggle={() => { setConfig(prev => ({ ...prev, [key]: !prev[key] })); setStatusSaved(false) }}
                      />
                    </div>
                  ))}

                  <div className="pt-1 border-t border-emperor-cream/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-emperor-cream/70">Max Auto-Discount</span>
                      <span className="text-sm font-mono text-emperor-gold font-semibold">{config.maxDiscount}%</span>
                    </div>
                    <input
                      type="range" min={0} max={25} step={5}
                      value={config.maxDiscount}
                      onChange={(e) => { setConfig(prev => ({ ...prev, maxDiscount: parseInt(e.target.value) })); setStatusSaved(false) }}
                      className="w-full accent-emperor-gold h-1.5 rounded-full appearance-none bg-emperor-smoke cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-emperor-cream/20 font-mono mt-1">
                      <span>0%</span><span>25%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => void handleSaveStatus(false)}
                    disabled={statusSaving}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      statusSaved
                        ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                        : 'btn-emperor'
                    }`}
                  >
                    {statusSaving
                      ? <div className="w-4 h-4 border-2 border-emperor-black/30 border-t-emperor-black rounded-full animate-spin" />
                      : statusSaved
                      ? <><CheckCircle className="w-4 h-4" /> All Settings Saved!</>
                      : <><Save className="w-4 h-4" /> Save Brandon Settings</>}
                  </button>
                  <p className="text-[10px] text-emperor-cream/20 font-mono text-center mt-2">
                    Auto-save is enabled. Manual save is optional.
                  </p>
                </div>
              </Panel>
            </div>

            {/* Services & Pricing */}
            <div>

              <Panel>
                <PanelHeader
                  icon={DollarSign}
                  title="Services &amp; Pricing"
                  aside={<span className="text-[10px] font-mono text-emperor-gold/40 border border-emperor-gold/20 rounded px-1.5 py-0.5">{config.serviceLines.length} items active</span>}
                />
                <p className="text-[11px] text-emperor-cream/25 font-mono mb-3">
                  Add, edit, or remove services. LINDA quotes from this list on every call and chat.
                </p>

                <div className="space-y-1.5 mb-4">
                  {config.serviceLines.map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2 group" title={line}>
                      <span className="text-[10px] font-mono text-emperor-gold/40 mt-2.5 w-4 shrink-0 text-right">-</span>
                      <input
                        type="text"
                        value={line}
                        onChange={(e) => {
                          const updated = [...config.serviceLines]
                          updated[idx] = e.target.value
                          setConfig(prev => ({ ...prev, serviceLines: updated }))
                          setStatusSaved(false)
                        }}
                        className="input-emperor !py-1.5 text-xs font-mono flex-1 min-w-0"
                      />
                      <button
                        onClick={() => {
                          const updated = config.serviceLines.filter((_, i) => i !== idx)
                          setConfig(prev => ({ ...prev, serviceLines: updated }))
                          setStatusSaved(false)
                        }}
                        className="mt-1.5 p-1.5 rounded-lg text-emperor-cream/15 hover:text-red-400/70 hover:bg-red-400/5 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add service line */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newServiceText}
                    onChange={(e) => setNewServiceText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newServiceText.trim()) {
                        setConfig(prev => ({ ...prev, serviceLines: [...prev.serviceLines, newServiceText.trim()] }))
                        setNewServiceText('')
                        setStatusSaved(false)
                      }
                    }}
                    className="input-emperor !py-1.5 text-xs font-mono flex-1"
                    placeholder="e.g. iPad screen repair: starting at $99"
                  />
                  <button
                    onClick={() => {
                      if (!newServiceText.trim()) return
                      setConfig(prev => ({ ...prev, serviceLines: [...prev.serviceLines, newServiceText.trim()] }))
                      setNewServiceText('')
                      setStatusSaved(false)
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emperor-gold/10 border border-emperor-gold/20 text-emperor-gold hover:bg-emperor-gold/20 transition-colors shrink-0"
                    title="Add service"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => { setConfig(prev => ({ ...prev, serviceLines: DEFAULT_SERVICE_LINES })); setStatusSaved(false) }}
                  className="mt-3 text-[10px] font-mono text-emperor-cream/20 hover:text-emperor-gold/60 transition-colors"
                >
                  ↺ reset to defaults
                </button>
              </Panel>

            </div>

          </div>
        )}

        {/* TAB 2  LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-panel p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-emperor-cream/40 font-mono">{stat.label}</span>
                  </div>
                  <span className="font-display text-4xl font-bold text-emperor-cream">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="glass-panel">
              <div className="px-6 py-4 border-b border-emperor-gold/10 flex items-center justify-between">
                <h2 className="font-display font-semibold text-sm text-emperor-cream/80 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emperor-gold" />
                  Lead Feed
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emperor-cream/30 font-mono">auto-refresh  15 s</span>
                  <button
                    onClick={() => setChatLogOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emperor-cream/10 text-emperor-cream/40 hover:text-emperor-gold hover:border-emperor-gold/30 text-xs font-mono transition-colors"
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    Chat Logs
                  </button>
                </div>
              </div>

              <div className="divide-y divide-emperor-gold/5">
                {leadsLoading && (
                  <div className="px-6 py-14 text-center">
                    <div className="w-6 h-6 border-2 border-emperor-gold/30 border-t-emperor-gold rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-emperor-cream/30 font-mono">Loading leads from DynamoDB...</p>
                  </div>
                )}
                {!leadsLoading && leads.length === 0 && (
                  <div className="px-6 py-14 text-center">
                    <MessageSquare className="w-8 h-8 text-emperor-cream/10 mx-auto mb-3" />
                    <p className="text-sm text-emperor-cream/30">No leads yet. They&apos;ll appear here in real-time.</p>
                  </div>
                )}
                {leads.map((lead) => {
                  const lt = lead.lead_type ?? 'appointment'
                  const typeConfig = {
                    appointment: {
                      icon: Wrench,
                      label: 'Appointment',
                      accent: 'text-accent-blue',
                      badge: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
                      dot: 'bg-accent-blue',
                    },
                    on_site: {
                      icon: MapPin,
                      label: 'On-Site',
                      accent: 'text-accent-emerald',
                      badge: 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20',
                      dot: 'bg-accent-emerald',
                    },
                    callback: {
                      icon: PhoneCall,
                      label: 'Callback',
                      accent: 'text-emperor-gold',
                      badge: 'bg-emperor-gold/10 text-emperor-gold border-emperor-gold/20',
                      dot: 'bg-emperor-gold',
                    },
                  }[lt]

                  const TypeIcon = typeConfig.icon
                  const canCall = Boolean(lead.phone && lead.phone !== 'unknown')
                  const handleLeadClick = () => {
                    if (canCall) window.location.href = `tel:${lead.phone}`
                  }

                  return (
                    <div
                      key={lead.lead_id}
                      onClick={handleLeadClick}
                      className={`px-6 py-4 transition-colors ${
                        canCall
                          ? 'cursor-pointer hover:bg-emperor-gold/5 active:bg-emperor-gold/10'
                          : 'hover:bg-emperor-cream/[0.02]'
                      }`}
                      role={canCall ? 'button' : undefined}
                      tabIndex={canCall ? 0 : undefined}
                      onKeyDown={canCall ? (e) => e.key === 'Enter' && handleLeadClick() : undefined}
                    >
                      <div className="flex items-start gap-3">

                        {/* Type icon pill */}
                        <div className={`mt-0.5 p-2 rounded-xl border ${typeConfig.badge} shrink-0`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Top row: type tag + status */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-mono font-semibold ${typeConfig.accent}`}>{typeConfig.label.toUpperCase()}</span>
                            <span className="text-emperor-cream/15 text-xs">·</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                              lead.status === 'booked'
                                ? 'bg-accent-blue/8 text-accent-blue/80 border-accent-blue/15'
                                : lead.status === 'completed'
                                ? 'bg-accent-emerald/8 text-accent-emerald/80 border-accent-emerald/15'
                                : 'bg-emperor-cream/5 text-emperor-cream/40 border-emperor-cream/10'
                            }`}>
                              {(lead.status || 'pending').toUpperCase()}
                            </span>
                            <span className="ml-auto text-[10px] text-emperor-cream/20 font-mono shrink-0">
                              {lead.lead_id}
                            </span>
                          </div>

                          {/* Main info row */}
                          {lt === 'callback' ? (
                            <div className="text-sm">
                              <span className="text-emperor-cream/80 font-semibold">{lead.notes || lead.repair_type || 'Callback'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-emperor-cream/80 font-semibold truncate">{lead.device || 'Unknown Device'}</span>
                              <span className="text-emperor-cream/20">—</span>
                              <span className="text-emperor-cream/50 capitalize">{(lead.repair_type || 'other').replace(/_/g, ' ')}</span>
                            </div>
                          )}

                          {!!lead.customer_name && lead.customer_name.trim().length > 0 && (
                            <div className="text-xs text-emperor-cream/60 font-mono flex items-center gap-1.5">
                              <User className="w-3 h-3" />
                              {lead.customer_name}
                            </div>
                          )}

                          {/* Meta row */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-lg border border-emperor-gold/25 bg-emperor-gold/8 px-2.5 py-1.5 text-xs font-mono">
                              <Calendar className="h-3.5 w-3.5 text-emperor-gold/80" />
                              <span className="text-emperor-gold/75 uppercase tracking-[0.08em]">{getScheduleLabelByType(lead.lead_type)}</span>
                              <span className="text-emperor-gold/30">·</span>
                              <Clock className="h-3.5 w-3.5 text-emperor-gold/70" />
                              <span className="text-emperor-cream/90">{formatLeadScheduledAt(lead)}</span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-emperor-cream/30 font-mono flex-wrap">
                            {lead.phone && lead.phone !== 'unknown' && (
                              <span className={`flex items-center gap-1 ${
                                canCall ? 'text-emperor-gold/80 font-semibold' : ''
                              }`}>
                                <Phone className={`w-3 h-3 ${canCall ? 'animate-pulse' : ''}`} />
                                {lead.phone}
                                {canCall && <span className="text-[9px] ml-0.5">(tap to call)</span>}
                              </span>
                            )}
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{leadSourceLabel(lead.source)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />lead created {formatLeadCreatedAt(lead.created_at || lead.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3  AGENT CONTROL */}
        {activeTab === 'agent' && <AgentPromptControlPanel />}

      </div>
    </main>
  )
}
