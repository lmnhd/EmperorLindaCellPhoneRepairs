'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  Eye,
  Layers,
  MessageSquare,
  Phone,
  RotateCcw,
  Save,
  Thermometer,
  TriangleAlert,
} from 'lucide-react'
import {
  KNOWN_AGENT_CONFIG_DEFAULTS,
  type AgentConfigKey,
  type AgentConfigRecord,
} from '@/lib/agentConfig'

type AgentTab = 'chat' | 'phone'

type PromptPreview = {
  system_prompt: string
  source: string
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Balanced, confident, clear' },
  { value: 'laidback',     label: 'Laid Back',    description: 'Neighborhood-friendly, relaxed' },
  { value: 'hustler',      label: 'Hustler',      description: 'High-energy, urgency-aware' },
]

const LENGTH_OPTIONS = [
  { value: 'short',    label: 'Short',    description: 'Minimal, fast responses' },
  { value: 'medium',   label: 'Medium',   description: 'Default balanced detail' },
  { value: 'detailed', label: 'Detailed', description: 'More complete explanations' },
]

function asRecord(values: Record<string, string>): AgentConfigRecord {
  const output = {} as AgentConfigRecord
  for (const key of Object.keys(KNOWN_AGENT_CONFIG_DEFAULTS) as AgentConfigKey[]) {
    output[key] = values[key] ?? KNOWN_AGENT_CONFIG_DEFAULTS[key]
  }
  return output
}

function getChangedKeys(current: AgentConfigRecord, baseline: AgentConfigRecord): AgentConfigKey[] {
  return (Object.keys(KNOWN_AGENT_CONFIG_DEFAULTS) as AgentConfigKey[]).filter(
    (key) => current[key] !== baseline[key],
  )
}

/*  Section wrapper  */
function Section({ label, children, accent = false }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 space-y-4 ${accent ? 'border-red-400/20 bg-red-500/5' : 'border-emperor-cream/8 bg-emperor-cream/[0.015]'}`}>
      <p className={`text-[10px] uppercase tracking-widest font-mono font-semibold ${accent ? 'text-red-300/60' : 'text-emperor-gold/60'}`}>{label}</p>
      {children}
    </div>
  )
}

/*  Field label  */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-emperor-cream/40 font-mono mb-1.5">{children}</p>
}

/*  Chip button  */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-2 rounded-lg border text-left transition-all duration-150 ${
        active
          ? 'bg-emperor-gold/10 border-emperor-gold/30 text-emperor-gold'
          : 'border-emperor-cream/8 hover:bg-emperor-cream/5 text-emperor-cream/40 hover:text-emperor-cream/70'
      }`}
    >
      {children}
    </button>
  )
}

/*  Temperature slider  */
function TempSlider({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const num = parseFloat(value)
  const pct = Math.round((num / 2) * 100)
  const color = num <= 0.5 ? 'text-accent-blue' : num <= 1.0 ? 'text-accent-emerald' : num <= 1.5 ? 'text-emperor-gold' : 'text-red-400'
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-emperor-cream/30" />
          <FieldLabel>{label}</FieldLabel>
        </div>
        <span className={`text-sm font-mono font-semibold ${color}`}>{value}</span>
      </div>
      <input
        type="range" min="0" max="2" step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none bg-emperor-smoke cursor-pointer accent-emperor-gold"
      />
      <div className="flex justify-between text-[10px] text-emperor-cream/20 font-mono mt-1">
        <span>Precise 0</span>
        <span className="text-emperor-cream/20">{pct}%</span>
        <span>Creative 2</span>
      </div>
    </div>
  )
}

export default function AgentPromptControlPanel() {
  const [activeTab, setActiveTab] = useState<AgentTab>('chat')
  const [values,    setValues]    = useState<AgentConfigRecord>(asRecord({}))
  const [baseline,  setBaseline]  = useState<AgentConfigRecord>(asRecord({}))
  const [preview,   setPreview]   = useState<PromptPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  const changedKeys   = useMemo(() => getChangedKeys(values, baseline), [values, baseline])
  const dirtyCount    = changedKeys.length

  const sharedOverrideActive = values.agent_shared_full_override.trim().length > 0
  const channelOverrideActive = activeTab === 'chat'
    ? values.agent_chat_full_override.trim().length > 0
    : values.agent_phone_full_override.trim().length > 0
  const anyOverrideActive = sharedOverrideActive || channelOverrideActive

  const updateValue = (key: AgentConfigKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agent-config')
      if (!res.ok) throw new Error('Failed to load agent config')
      const payload = (await res.json()) as { values: Record<string, string> }
      const mapped  = asRecord(payload.values ?? {})
      setValues(mapped)
      setBaseline(mapped)
    } catch (err) {
      console.error('Failed to load agent config:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPreview = async (tab: AgentTab) => {
    try {
      const res = await fetch(`/api/agent-config/${tab}`)
      if (!res.ok) throw new Error('Failed to load prompt preview')
      const payload = (await res.json()) as PromptPreview
      setPreview(payload)
    } catch (err) {
      console.error('Failed to load prompt preview:', err)
      setPreview(null)
    }
  }

  useEffect(() => { loadConfig() }, [])
  useEffect(() => { loadPreview(activeTab) }, [activeTab])

  const saveChanges = async () => {
    if (dirtyCount === 0) return
    setSaving(true)
    try {
      const updates = Object.fromEntries(changedKeys.map((key) => [key, values[key]]))
      const res = await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error('Failed to save agent config')
      setBaseline(values)
      await loadPreview(activeTab)
    } catch (err) {
      console.error('Failed to save agent config:', err)
      alert('Failed to save prompt controls. Check console logs.')
    } finally {
      setSaving(false)
    }
  }

  const discardChanges = () => setValues(baseline)

  if (loading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="w-6 h-6 border-2 border-emperor-gold/30 border-t-emperor-gold rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-emperor-cream/40 font-mono">Loading agent controls...</p>
      </div>
    )
  }

  const chatActive  = activeTab === 'chat'
  const channelTemp = chatActive ? 'agent_chat_temperature'        : 'agent_phone_temperature'
  const channelAdd  = chatActive ? 'agent_chat_channel_addendum'   : 'agent_phone_channel_addendum'
  const channelRule = chatActive ? 'agent_chat_channel_rules'      : 'agent_phone_channel_rules'
  const channelOver = chatActive ? 'agent_chat_full_override'      : 'agent_phone_full_override'
  const channelName = chatActive ? 'Web Chat' : 'Phone'

  return (
    <div className="space-y-6 pb-20 relative">

      {/* Header + Channel toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-emperor-gold" />
            <h2 className="font-display font-semibold text-emperor-cream/90">Prompt Control Center</h2>
          </div>
          <p className="text-xs text-emperor-cream/30 font-mono">
            <span className="text-emperor-cream/50">Shared settings</span> apply to both agents.
            Channel tabs control addendum, rules, temperature, and overrides.
          </p>
        </div>

        {/* Channel tabs */}
        <div className="flex shrink-0 items-center rounded-xl border border-emperor-cream/10 p-1 gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-emperor-gold/15 border border-emperor-gold/30 text-emperor-gold'
                : 'text-emperor-cream/40 hover:text-emperor-cream/70'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Web Chat
          </button>
          <button
            onClick={() => setActiveTab('phone')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'phone'
                ? 'bg-emperor-gold/15 border border-emperor-gold/30 text-emperor-gold'
                : 'text-emperor-cream/40 hover:text-emperor-cream/70'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            Phone
          </button>
        </div>
      </div>

      {/* Override warning banner */}
      {anyOverrideActive && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/8 p-4">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-200 mb-0.5">Full Override Active</p>
            <p className="text-xs text-amber-200/60 font-mono">
              {sharedOverrideActive && 'Shared override replaces the assembled prompt for BOTH agents. '}
              {channelOverrideActive && `${channelName} channel override replaces the assembled prompt for this agent. `}
              Assembled fragments below are ignored when override is filled.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN  Shared Settings */}
        <div className="space-y-4">
          <Section label="Shared  applies to both agents">

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <FieldLabel>Tone</FieldLabel>
                <span className="ml-auto text-[10px] font-mono text-emperor-gold/40 border border-emperor-gold/20 rounded px-1.5 py-0.5">synced ↔ Personality Mode</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {TONE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    active={values.agent_shared_tone === opt.value}
                    onClick={() => updateValue('agent_shared_tone', opt.value)}
                  >
                    <span className="text-xs font-semibold block">{opt.label}</span>
                    <span className="text-[10px] opacity-60 block leading-tight">{opt.description}</span>
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Response Length</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {LENGTH_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    active={values.agent_shared_response_length === opt.value}
                    onClick={() => updateValue('agent_shared_response_length', opt.value)}
                  >
                    <span className="text-xs font-semibold block">{opt.label}</span>
                    <span className="text-[10px] opacity-60 block leading-tight">{opt.description}</span>
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Escalation Threshold ($)</FieldLabel>
              <input
                type="number"
                value={values.agent_shared_escalation_threshold}
                onChange={(e) => updateValue('agent_shared_escalation_threshold', e.target.value)}
                className="input-emperor text-sm w-32"
              />
              <p className="text-[10px] text-emperor-cream/20 mt-1 font-mono">Jobs above this amount  agent flags for Brandon.</p>
            </div>

            <div>
              <FieldLabel>Additional Rules</FieldLabel>
              <textarea
                value={values.agent_shared_additional_rules}
                onChange={(e) => updateValue('agent_shared_additional_rules', e.target.value)}
                className="input-emperor text-sm resize-none h-24"
                placeholder="e.g. Never quote prices without checking parts availability first..."
              />
              <p className="text-[10px] text-emperor-cream/20 mt-1 font-mono">{values.agent_shared_additional_rules.length} chars</p>
            </div>

            <div>
              <FieldLabel>Contextual Info</FieldLabel>
              <textarea
                value={values.agent_shared_contextual_info}
                onChange={(e) => updateValue('agent_shared_contextual_info', e.target.value)}
                className="input-emperor text-sm resize-none h-20"
                placeholder="e.g. Brandon only works on iPhones and Samsung Galaxy devices..."
              />
              <p className="text-[10px] text-emperor-cream/20 mt-1 font-mono">{values.agent_shared_contextual_info.length} chars</p>
            </div>

            <div>
              <FieldLabel>Base Prompt Override (optional)</FieldLabel>
              <textarea
                value={values.agent_shared_base_prompt_override}
                onChange={(e) => updateValue('agent_shared_base_prompt_override', e.target.value)}
                className="input-emperor text-sm resize-none h-20"
                placeholder="Leave empty to use the auto-assembled base prompt..."
              />
              <p className="text-[10px] text-emperor-cream/20 mt-1 font-mono">Replaces only the base section, not channel-specific parts.</p>
            </div>

          </Section>
        </div>

        {/* RIGHT COLUMN  Channel-Specific */}
        <div className="space-y-4">
          <Section label={`${channelName} agent  channel-specific`}>

            <TempSlider
              label={`${channelName} Temperature`}
              value={values[channelTemp]}
              onChange={(v) => updateValue(channelTemp, v)}
            />

            <div>
              <FieldLabel>{channelName} Channel Addendum</FieldLabel>
              <textarea
                value={values[channelAdd]}
                onChange={(e) => updateValue(channelAdd, e.target.value)}
                className="input-emperor text-sm resize-none h-24"
                placeholder={chatActive
                  ? "e.g. End responses with a booking CTA when relevant..."
                  : "e.g. Keep all responses under 2 sentences. Spell out numbers..."}
              />
              <p className="text-[10px] text-emperor-cream/20 mt-1 font-mono">Appended after the shared base prompt.</p>
            </div>

            <div>
              <FieldLabel>{channelName} Channel Rules</FieldLabel>
              <textarea
                value={values[channelRule]}
                onChange={(e) => updateValue(channelRule, e.target.value)}
                className="input-emperor text-sm resize-none h-24"
                placeholder={chatActive
                  ? "e.g. Never reveal specific discount percentages without Brandon's approval..."
                  : "e.g. Do not ask for phone model  caller has already provided it..."}
              />
              <p className="text-[10px] text-emperor-cream/20 mt-1 font-mono">Channel-specific guardrails and hard rules.</p>
            </div>

          </Section>

          {/* Prompt Preview */}
          <div className="rounded-xl border border-emperor-cream/8 bg-emperor-cream/[0.015] overflow-hidden">
            <button
              onClick={() => { setShowPreview(p => !p); if (!showPreview) loadPreview(activeTab) }}
              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-emperor-cream/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-emperor-cream/40" />
                <span className="text-xs font-mono text-emperor-cream/50">Assembled Prompt Preview  {channelName}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-emperor-cream/30 transition-transform ${showPreview ? 'rotate-90' : ''}`} />
            </button>
            {showPreview && (
              <div className="border-t border-emperor-cream/8">
                <div className="p-4 max-h-64 overflow-y-auto">
                  <pre className="text-[11px] whitespace-pre-wrap text-emperor-cream/50 font-mono leading-relaxed">
                    {preview?.system_prompt ?? 'Preview unavailable  save changes first to refresh.'}
                  </pre>
                </div>
                <div className="px-4 py-2 border-t border-emperor-cream/8">
                  <p className="text-[10px] text-emperor-cream/20 font-mono">
                    source: {preview?.source ?? 'n/a'}  {preview?.system_prompt?.length ?? 0} chars
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Danger Zone  Full Overrides */}
      <Section label="Danger Zone  full overrides" accent>
        <div className="flex items-start gap-3 mb-1">
          <TriangleAlert className="w-4 h-4 text-red-300/70 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200/60 font-mono leading-relaxed">
            Full overrides <strong className="text-red-200/90">completely replace</strong> the assembled prompt.
            All shared fragments, rules, and addendums above are ignored.
            Use only when you need precise control over the raw system prompt.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <FieldLabel>{channelName} Full Override</FieldLabel>
            <textarea
              value={values[channelOver]}
              onChange={(e) => updateValue(channelOver, e.target.value)}
              className="input-emperor text-sm resize-none h-32"
              placeholder={`Leave empty to use assembled ${channelName.toLowerCase()} prompt...`}
            />
          </div>
          <div>
            <FieldLabel>Shared Full Override (highest priority)</FieldLabel>
            <textarea
              value={values.agent_shared_full_override}
              onChange={(e) => updateValue('agent_shared_full_override', e.target.value)}
              className="input-emperor text-sm resize-none h-32"
              placeholder="Leave empty unless you need to override both agents at once..."
            />
          </div>
        </div>
      </Section>

      {/* Floating save bar */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 rounded-2xl border border-emperor-gold/30 bg-emperor-black/95 backdrop-blur-xl px-5 py-3 shadow-2xl shadow-black/50">
            <div className="w-2 h-2 rounded-full bg-emperor-gold animate-pulse" />
            <span className="text-sm text-emperor-cream/70 font-mono">{dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={discardChanges}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emperor-cream/20 text-emperor-cream/60 text-xs hover:bg-emperor-cream/5 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Discard
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="btn-emperor text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-60"
              >
                {saving ? (
                  <><div className="w-3 h-3 border border-emperor-black/30 border-t-emperor-black rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-3 h-3" /> Save All</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
