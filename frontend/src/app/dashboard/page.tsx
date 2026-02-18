'use client'

import { useState, useEffect } from 'react'
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
  Save,
  Volume2,
  Shield,
  Zap,
  ScrollText,
  Play,
  BarChart3,
  Bot,
  CheckCircle,
} from 'lucide-react'
import ChatLogOverlay from '@/components/ChatLogOverlay'
import AgentPromptControlPanel from '@/components/AgentPromptControlPanel'

type DashboardTab = 'brandon' | 'leads' | 'agent'
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
  { value: 'onyx',    label: 'Onyx',    description: 'Deep, warm  chill vibe',        gender: 'male'    },
  { value: 'echo',    label: 'Echo',    description: 'Smooth, energetic  closer',      gender: 'male'    },
  { value: 'fable',   label: 'Fable',   description: 'Warm, narrative  storyteller',   gender: 'male'    },
  { value: 'nova',    label: 'Nova',    description: 'Bright, polished  professional', gender: 'female'  },
  { value: 'shimmer', label: 'Shimmer', description: 'Clear, expressive  friendly',    gender: 'female'  },
  { value: 'alloy',   label: 'Alloy',   description: 'Balanced, versatile  neutral',   gender: 'neutral' },
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
  female:  'nova',
  male:    'onyx',
  neutral: 'alloy',
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
  sleeping: { icon: Moon,     label: 'After Hours',   color: 'text-purple-400',       bgColor: 'bg-purple-400/10 border-purple-400/20',         defaultNote: 'Closed for the day. Open tomorrow at 9 AM' },
  custom:   { icon: Settings, label: 'Custom',        color: 'text-emperor-cream/60', bgColor: 'bg-emperor-cream/5 border-emperor-cream/10',    defaultNote: '' },
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
  persona: string
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
  const [location,     setLocation]     = useState('shop')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusSaved,  setStatusSaved]  = useState(false)
  const [testingVoice, setTestingVoice] = useState<string | null>(null)
  const [leads,        setLeads]        = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [chatLogOpen,  setChatLogOpen]  = useState(false)

  const [config, setConfig] = useState<AssistantConfig>({
    aiAnswersCalls: true,
    aiAnswersSms:   true,
    autoUpsell:     true,
    maxDiscount:    15,
    greeting:       "Hey! Thanks for reaching out to EmperorLinda Cell Phone Repairs. How can I help you today?",
    specialInfo:    "",
    voice:          'nova',
    assistantName:  'Linda',
    persona:        'professional',
  })

  const selectedNameConfig = ASSISTANT_NAMES.find(n => n.value === config.assistantName) ?? ASSISTANT_NAMES[0]
  const availableVoices    = getVoicesForGender(selectedNameConfig.gender)
  const statusConfig       = STATUS_OPTIONS[currentStatus]

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
    const fetchLeads = async () => {
      try {
        const res  = await fetch('/api/leads')
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
          if (s.status && s.status in STATUS_OPTIONS) setCurrentStatus(s.status as StatusMode)
          if (s.notes)    setNotes(s.notes)
          if (s.location) setLocation(s.location)
          setConfig(prev => ({
            ...prev,
            voice:          s.voice              || prev.voice,
            assistantName:  s.assistant_name     || prev.assistantName,
            // agent_shared_tone is source of truth; fall back to state.persona
            persona:        agentTone            || s.persona || prev.persona,
            specialInfo:    s.special_info       || '',
            greeting:       s.greeting           || prev.greeting,
            maxDiscount:    s.max_discount      !== undefined ? s.max_discount      : prev.maxDiscount,
            aiAnswersCalls: s.ai_answers_calls  !== undefined ? s.ai_answers_calls  : prev.aiAnswersCalls,
            aiAnswersSms:   s.ai_answers_sms    !== undefined ? s.ai_answers_sms    : prev.aiAnswersSms,
            autoUpsell:     s.auto_upsell       !== undefined ? s.auto_upsell       : prev.autoUpsell,
          }))
        }
      } catch { /* silent */ }
    }
    load()
  }, [])

  const handleStatusChange = (mode: StatusMode) => {
    setCurrentStatus(mode)
    setNotes(STATUS_OPTIONS[mode].defaultNote)
    setStatusSaved(false)
  }

  const handleSaveStatus = async () => {
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
            location,
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
    } catch {
      alert('Failed to save settings. Check console for details.')
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-emperor-black">

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-emperor-black/90 border-b border-emperor-gold/10">
        <div className="max-w-5xl mx-auto px-6">
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

          <div className="flex items-end gap-1 -mb-px">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 rounded-t-lg ${
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

      <div className="max-w-5xl mx-auto px-6 py-8">

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
                  <div>
                    <FieldLabel>Location</FieldLabel>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => { setLocation(e.target.value); setStatusSaved(false) }}
                      className="input-emperor !py-2.5 text-sm"
                      placeholder="shop, gym, home..."
                    />
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
                    onClick={handleSaveStatus}
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
                    Saves status, identity &amp; AI settings to DynamoDB
                  </p>
                </div>
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
                {leads.map((lead) => (
                  <div key={lead.lead_id} className="px-6 py-4 hover:bg-emperor-cream/[0.02] transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-emperor-gold/50">{lead.lead_id}</span>
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
                        <span className="text-emperor-cream/80 font-semibold">{lead.device || 'Unknown Device'}</span>
                        <span className="text-emperor-cream/25"></span>
                        <span className="text-emperor-cream/50 capitalize">{(lead.repair_type || 'other').replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-emperor-cream/30 font-mono">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{lead.appointment_date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lead.appointment_time}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
