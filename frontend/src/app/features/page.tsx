'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  Phone,
  MessageSquare,
  Mic,
  Shield,
  Clock,
  Zap,
  Brain,
  Settings,
  BarChart3,
  Users,
  Star,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  MapPin,
  Headphones,
  Bot,
  Gauge,
  Palette,
  Bell,
  FileText,
  Lock,
  Globe,
  TrendingUp,
  Calendar,
  Percent,
  ShoppingCart,
  Layers,
  Wifi,
  Monitor,
  Battery,
  Cpu,
  Volume2,
  UserCog,
  LayoutDashboard,
  ChevronDown,
  ExternalLink,
  Sparkles,
} from 'lucide-react'

// ─────────────────────────────────────────────────────
// Quick Link Sections for sticky nav
// ─────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ai-receptionist', label: 'AI Receptionist' },
  { id: 'voice-system', label: 'Voice System' },
  { id: 'smart-booking', label: 'Smart Booking' },
  { id: 'dashboard', label: 'Your Dashboard' },
  { id: 'ai-intelligence', label: 'AI Intelligence' },
  { id: 'services', label: 'Services' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'roi', label: 'ROI' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'technical', label: 'Under the Hood' },
]

// ─────────────────────────────────────────────────────
// Feature Cards
// ─────────────────────────────────────────────────────
const AI_FEATURES = [
  {
    icon: Phone,
    title: 'Answers Every Call',
    desc: 'AI picks up your phone 24/7 — even at the gym, driving, or sleeping. Never miss a lead again.',
  },
  {
    icon: MessageSquare,
    title: 'Website Chat',
    desc: 'Embedded chat widget on your site. Visitors get instant answers, quotes, and booking — no waiting.',
  },
  {
    icon: Mic,
    title: 'Natural Voice',
    desc: 'Sounds like a real person. Choose from 6 premium voices — deep, smooth, bright, or chill.',
  },
  {
    icon: Brain,
    title: 'Context-Aware',
    desc: 'Knows your status in real-time. At the gym? Creates urgency. At the shop? Invites walk-ins.',
  },
  {
    icon: Calendar,
    title: 'Books Appointments',
    desc: 'Checks your real availability and locks in bookings on the spot. No double-booking, no back-and-forth.',
  },
  {
    icon: Percent,
    title: 'Handles Discounts',
    desc: 'Set a max threshold — AI approves small discounts instantly. Bigger asks get escalated to you.',
  },
]

const DASHBOARD_FEATURES = [
  {
    icon: Gauge,
    title: '6 Status Modes',
    desc: 'Working, Gym, Driving, Break, After Hours, Custom — each one changes how your AI talks to customers.',
    color: 'text-accent-emerald',
  },
  {
    icon: UserCog,
    title: 'Name & Voice',
    desc: 'Pick your AI\'s name (Linda, Marcus, Keisha...) and voice. Gender-matched options. Switch anytime.',
    color: 'text-emperor-gold',
  },
  {
    icon: Palette,
    title: '3 Personalities',
    desc: 'Professional, Laid Back, or Hustler. Each has its own vibe, slang, and sales approach.',
    color: 'text-accent-blue',
  },
  {
    icon: Bell,
    title: 'Bulletin Board',
    desc: 'Post deals, closures, or notes. Your AI weaves them naturally into conversations.',
    color: 'text-accent-amber',
  },
  {
    icon: BarChart3,
    title: 'Live Lead Feed',
    desc: 'See every booking, lead, and inquiry in real-time. Auto-refreshes every 15 seconds.',
    color: 'text-accent-emerald',
  },
  {
    icon: FileText,
    title: 'Chat Transcripts',
    desc: 'Read every conversation — phone, web, SMS. Search by source. Expand full message history.',
    color: 'text-emperor-gold',
  },
]

const SERVICES = [
  { icon: Monitor, label: 'Screen Repair', price: 'From $79', time: '~45 min', detail: 'iPhone & Android. Same-day.' },
  { icon: Battery, label: 'Battery Swap', price: 'From $49', time: '~30 min', detail: 'OEM-quality cells.' },
  { icon: Zap, label: 'Charging Port', price: 'From $59', time: '~40 min', detail: 'USB-C & Lightning.' },
  { icon: Cpu, label: 'Diagnostics', price: 'Free', time: '~15 min', detail: 'Full health check.' },
]

const STATUS_BEHAVIORS = [
  { status: 'At the Shop', emoji: '🔧', behavior: '"Walk-ins welcome, we\'re open now!"', color: 'bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30' },
  { status: 'At the Gym', emoji: '🏋️', behavior: '"Spots are limited today — I\'d lock one in now."', color: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30' },
  { status: 'Driving', emoji: '🚗', behavior: '"He\'s on the move, back shortly."', color: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30' },
  { status: 'On Break', emoji: '☕', behavior: '"Quick break — let me get you booked."', color: 'bg-emperor-gold/20 text-emperor-gold border-emperor-gold/30' },
  { status: 'After Hours', emoji: '🌙', behavior: '"We\'re closed for today, opens 9 AM."', color: 'bg-emperor-cream/10 text-emperor-cream/60 border-emperor-cream/20' },
  { status: 'Custom', emoji: '✏️', behavior: 'Whatever you type becomes the AI\'s context.', color: 'bg-accent-emerald/10 text-accent-emerald/70 border-accent-emerald/20' },
]

const PERSONAS = [
  {
    name: 'Professional',
    emoji: '💼',
    example: '"We\'d love to help! Screen repairs start at $79 and take about 45 minutes. Shall I check availability?"',
    vibe: 'Warm, confident, polished',
  },
  {
    name: 'Laid Back',
    emoji: '😎',
    example: '"Aye, cracked screen? Say less, we got you. Brandon does those in like 45 minutes, no cap."',
    vibe: 'Chill, neighborhood, slang',
  },
  {
    name: 'Hustler',
    emoji: '🔥',
    example: '"Listen, Brandon\'s one of the best in Jax. 90-day warranty. Let\'s get you on the books."',
    vibe: 'High-energy, urgency, closer',
  },
]

const ROI_ROWS = [
  { metric: 'Missed calls (gym/breaks)', before: '~40%', after: '0%' },
  { metric: 'Lead response time', before: '15–60 min', after: '< 3 seconds' },
  { metric: 'After-hours lead capture', before: 'None', after: '24/7 automated' },
  { metric: 'Upsell rate', before: 'Inconsistent', after: '100% offered' },
  { metric: 'Monthly receptionist cost', before: '$2,000–3,000', after: 'Fraction' },
]

const ROADMAP_ITEMS = [
  { label: 'Payment Integration (Stripe/Square)', priority: 'High', desc: 'Collect deposits at booking time' },
  { label: 'Google Calendar Sync', priority: 'High', desc: 'Auto-sync every booking to your calendar' },
  { label: 'SMS Appointment Reminders', priority: 'High', desc: 'Auto-text customers 24h before their slot' },
  { label: 'Analytics Dashboard', priority: 'Medium', desc: 'Conversion rates, popular repairs, peak hours' },
  { label: 'Lead Status Updates', priority: 'Medium', desc: 'Mark leads completed or cancelled from dashboard' },
  { label: 'Custom Business Hours', priority: 'Medium', desc: 'Set your own open/close per day of week' },
  { label: 'Email Notifications', priority: 'Medium', desc: 'Get emailed when a new lead books' },
  { label: 'Customer Feedback Loop', priority: 'Medium', desc: 'Post-repair survey via SMS' },
  { label: 'Model & Voice Upgrades', priority: 'Ongoing', desc: 'Always using the latest AI and voice tech' },
  { label: 'Personality Optimization', priority: 'Ongoing', desc: 'Tuning the perfect character for your brand' },
  { label: 'Multi-Language Support', priority: 'Future', desc: 'Serve Spanish-speaking customers too' },
  { label: 'CRM Integration', priority: 'Future', desc: 'Sync leads to Salesforce, HubSpot, etc.' },
]

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────
export default function FeaturesPage() {
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Intersection observer for scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [mounted])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setMobileNavOpen(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[50%] -translate-x-1/2 w-[120vw] h-[80vh] bg-gradient-radial from-emperor-gold/[0.04] via-transparent to-transparent" />
        <div className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[40vh] bg-gradient-radial from-accent-emerald/[0.02] via-transparent to-transparent" />
        <div className="absolute inset-0 dot-pattern opacity-30" />
      </div>

      {/* ── Top Nav ── */}
      <nav className="relative z-30 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emperor-gold to-emperor-gold-dark flex items-center justify-center shadow-lg shadow-emperor-gold/20">
            <Smartphone className="w-5 h-5 text-emperor-black" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-emperor-cream">
            Emperor<span className="text-emperor-gold">Linda</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-emperor-cream/50 hover:text-emperor-gold transition-colors font-medium">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Landing Page
          </Link>
          <Link href="/dashboard" className="btn-ghost text-sm !px-4 !py-2">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ── Sticky Section Nav (Desktop pill bar) ── */}
      <div className="sticky top-0 z-20 hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="glass-panel !rounded-full px-2 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none">
            {NAV_SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  activeSection === id
                    ? 'bg-emperor-gold text-emperor-black shadow-lg shadow-emperor-gold/20'
                    : 'text-emperor-cream/50 hover:text-emperor-cream hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile Section Nav ── */}
      <div className="sticky top-0 z-20 lg:hidden px-4 py-2">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="glass-panel w-full px-4 py-3 flex items-center justify-between text-sm text-emperor-cream/70"
        >
          <span className="font-medium">Jump to: <span className="text-emperor-gold">{NAV_SECTIONS.find(s => s.id === activeSection)?.label}</span></span>
          <ChevronDown className={`w-4 h-4 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} />
        </button>
        {mobileNavOpen && (
          <div className="glass-panel mt-1 py-2 max-h-64 overflow-y-auto">
            {NAV_SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  activeSection === id ? 'text-emperor-gold bg-emperor-gold/10' : 'text-emperor-cream/50 hover:text-emperor-cream'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ───────────────────────── SECTIONS ───────────────────────── */}

      {/* §1 — OVERVIEW HERO */}
      <section id="overview" className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-20 lg:pt-20">
        <div className={`max-w-3xl mx-auto text-center space-y-8 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emperor-gold/[0.08] border border-emperor-gold/20">
            <Sparkles className="w-3.5 h-3.5 text-emperor-gold" />
            <span className="text-xs font-mono text-emperor-gold/80 tracking-wide uppercase">Complete Feature Breakdown</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
            Your AI <span className="text-emperor-gold italic">Chief of Staff</span>
            <br />
            <span className="text-emperor-cream/40 text-3xl sm:text-4xl lg:text-[2.8rem]">handles everything while you work.</span>
          </h1>

          <p className="text-emperor-cream/50 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
            Phone calls, website chat, appointment booking, upsells, and discounts — 
            all running on autopilot. You focus on repairs. <span className="text-emperor-gold font-medium">LINDA handles the rest.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/" className="btn-emperor flex items-center gap-2">
              <Globe className="w-4 h-4" />
              See Landing Page
            </Link>
            <Link href="/dashboard" className="btn-ghost flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Open Dashboard
            </Link>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
            {[
              { label: '24/7 Coverage', icon: Clock },
              { label: '< 3s Response', icon: Zap },
              { label: 'Real Bookings', icon: Calendar },
              { label: '90-Day Warranty', icon: Shield },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <Icon className="w-3.5 h-3.5 text-emperor-gold/70" />
                <span className="text-xs font-mono text-emperor-cream/50">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §2 — AI RECEPTIONIST */}
      <section id="ai-receptionist" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Core Feature"
          title="AI Receptionist"
          subtitle="Never miss a call, text, or website visitor again. Your AI handles every customer touchpoint — instantly."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {AI_FEATURES.map((feat, i) => (
            <div
              key={feat.title}
              className={`glass-panel p-6 hover:border-emperor-gold/30 transition-all duration-300 group ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-emperor-gold/10 flex items-center justify-center mb-4 group-hover:bg-emperor-gold/20 transition-colors">
                <feat.icon className="w-5 h-5 text-emperor-gold" />
              </div>
              <h3 className="font-display font-semibold text-emperor-cream text-lg mb-2">{feat.title}</h3>
              <p className="text-sm text-emperor-cream/45 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* §3 — VOICE SYSTEM */}
      <section id="voice-system" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Voice"
          title="Premium Voice System"
          subtitle="Your customers hear a natural, human-like voice — not a robot. Same voice across phone, web, and SMS."
        />

        <div className="grid lg:grid-cols-2 gap-8 mt-14">
          {/* Voice consistency card */}
          <div className="glass-panel p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-emperor-gold" />
              <h3 className="font-display font-bold text-xl text-emperor-cream">Consistent Across All Channels</h3>
            </div>
            <p className="text-emperor-cream/45 leading-relaxed">
              Whether a customer calls your phone number, chats on your website, or hears a voice demo — 
              they hear the <strong className="text-emperor-cream/70">exact same voice and personality</strong>. 
              No mismatched robot voices.
            </p>
            <div className="space-y-3">
              {['Phone Calls (Twilio)', 'Website Chat (Landing Page)', 'Voice Demo (Browser)', 'SMS Responses'].map((ch) => (
                <div key={ch} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0" />
                  <span className="text-sm text-emperor-cream/60">{ch}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voice options card */}
          <div className="glass-panel p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Headphones className="w-6 h-6 text-emperor-gold" />
              <h3 className="font-display font-bold text-xl text-emperor-cream">6 Premium Voices</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Onyx', desc: 'Deep, warm — chill vibe', gender: '♂' },
                { name: 'Echo', desc: 'Smooth, energetic', gender: '♂' },
                { name: 'Fable', desc: 'Warm, narrative', gender: '♂' },
                { name: 'Nova', desc: 'Bright, polished', gender: '♀' },
                { name: 'Shimmer', desc: 'Clear, expressive', gender: '♀' },
                { name: 'Alloy', desc: 'Balanced, neutral', gender: '⚡' },
              ].map((v) => (
                <div key={v.name} className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-emperor-gold/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{v.gender}</span>
                    <span className="font-mono text-sm font-medium text-emperor-cream">{v.name}</span>
                  </div>
                  <span className="text-xs text-emperor-cream/35">{v.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-emperor-cream/30 italic">
              Voice auto-matches assistant name gender. Override anytime in the dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* §4 — SMART BOOKING */}
      <section id="smart-booking" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Booking Engine"
          title="Smart Booking System"
          subtitle="Real appointments, real availability, real follow-through. No generic form — a genuine conversation that ends in a sale."
        />

        <div className="glass-panel p-8 lg:p-12 mt-14">
          {/* Booking flow visualization */}
          <div className="grid md:grid-cols-5 gap-4 items-center">
            {[
              { step: '1', label: 'Customer asks about repairs', icon: MessageSquare },
              { step: '2', label: 'AI quotes price & timeframe', icon: DollarSign },
              { step: '3', label: 'AI checks real availability', icon: Calendar },
              { step: '4', label: 'Booking confirmed instantly', icon: CheckCircle2 },
              { step: '5', label: 'Upsell offered automatically', icon: ShoppingCart },
            ].map((s, i) => (
              <div key={s.step} className="flex flex-col items-center text-center space-y-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  i === 3 ? 'bg-accent-emerald/20 border-2 border-accent-emerald/30' : 'bg-emperor-gold/10 border border-emperor-gold/20'
                }`}>
                  <s.icon className={`w-6 h-6 ${i === 3 ? 'text-accent-emerald' : 'text-emperor-gold'}`} />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-emperor-gold/50 mb-1">STEP {s.step}</div>
                  <p className="text-xs text-emperor-cream/50 leading-snug">{s.label}</p>
                </div>
                {i < 4 && <ArrowRight className="w-4 h-4 text-emperor-cream/15 hidden md:block absolute" style={{ display: 'none' }} />}
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] mt-10 pt-8 grid sm:grid-cols-3 gap-6">
            {[
              { label: 'Auto-Upsell', desc: 'Screen protectors ($15), cases ($25), extended warranty. Toggle on/off.' },
              { label: 'Discount Threshold', desc: 'Set 0–25%. AI auto-approves within limit, escalates beyond it.' },
              { label: 'Collision-Free', desc: 'Real-time slot checking. No double-bookings, ever.' },
            ].map((f) => (
              <div key={f.label} className="space-y-2">
                <h4 className="font-display font-semibold text-emperor-cream">{f.label}</h4>
                <p className="text-xs text-emperor-cream/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §5 — YOUR DASHBOARD */}
      <section id="dashboard" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Control Center"
          title={<>Brandon&rsquo;s Cockpit</>}
          subtitle="Your single-screen command center. Toggle status, change voice, read transcripts, review leads — all in one place."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {DASHBOARD_FEATURES.map((feat, i) => (
            <div
              key={feat.title}
              className={`glass-panel p-6 hover:border-emperor-gold/20 transition-all duration-300 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <feat.icon className={`w-6 h-6 ${feat.color} mb-4`} />
              <h3 className="font-display font-semibold text-emperor-cream mb-2">{feat.title}</h3>
              <p className="text-sm text-emperor-cream/40 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Controls snapshot */}
        <div className="glass-panel p-8 mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'AI Answers Calls', desc: 'On/Off toggle', icon: Phone },
            { label: 'AI Answers SMS', desc: 'On/Off toggle', icon: MessageSquare },
            { label: 'Auto-Upsell', desc: 'On/Off toggle', icon: ShoppingCart },
            { label: 'Max Auto-Discount', desc: '0% – 25% slider', icon: Percent },
          ].map((ctrl) => (
            <div key={ctrl.label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emperor-gold/10 flex items-center justify-center flex-shrink-0">
                <ctrl.icon className="w-4 h-4 text-emperor-gold/70" />
              </div>
              <div>
                <div className="text-sm font-medium text-emperor-cream">{ctrl.label}</div>
                <div className="text-xs text-emperor-cream/30">{ctrl.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/dashboard" className="btn-emperor inline-flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Open Dashboard
            <ExternalLink className="w-3.5 h-3.5 opacity-50" />
          </Link>
        </div>
      </section>

      {/* §6 — AI INTELLIGENCE */}
      <section id="ai-intelligence" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Intelligence"
          title="Context-Aware AI"
          subtitle="Not a generic chatbot. LINDA knows where you are, what you're doing, and adapts every response in real time."
        />

        {/* Status Behavior Table */}
        <div className="mt-14 space-y-3">
          <h3 className="font-display text-lg font-semibold text-emperor-cream mb-6">Your Status Changes the AI&rsquo;s Behavior</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STATUS_BEHAVIORS.map((s) => (
              <div key={s.status} className={`px-5 py-4 rounded-xl border ${s.color} transition-all`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="font-mono text-sm font-medium">{s.status}</span>
                </div>
                <p className="text-xs opacity-70 leading-relaxed italic">{s.behavior}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Personas */}
        <div className="mt-14 space-y-3">
          <h3 className="font-display text-lg font-semibold text-emperor-cream mb-6">3 AI Personalities</h3>
          <div className="grid md:grid-cols-3 gap-5">
            {PERSONAS.map((p) => (
              <div key={p.name} className="glass-panel p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <h4 className="font-display font-bold text-emperor-cream">{p.name}</h4>
                    <span className="text-xs text-emperor-cream/40">{p.vibe}</span>
                  </div>
                </div>
                <p className="text-sm text-emperor-cream/50 italic leading-relaxed border-l-2 border-emperor-gold/30 pl-4">
                  {p.example}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Function Calling */}
        <div className="mt-14">
          <h3 className="font-display text-lg font-semibold text-emperor-cream mb-6">Real Business Operations (Not Just Chat)</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { fn: 'check_availability', desc: 'Queries your real schedule and returns open time slots.', icon: Calendar },
              { fn: 'book_slot', desc: 'Creates a real booking in your system. Done deal.', icon: CheckCircle2 },
              { fn: 'authorize_discount', desc: 'Auto-approves discounts within your set threshold.', icon: Percent },
              { fn: 'log_upsell', desc: 'Tracks which customers accepted/declined add-ons.', icon: TrendingUp },
            ].map((f) => (
              <div key={f.fn} className="flex items-start gap-4 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <f.icon className="w-5 h-5 text-emperor-gold flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-xs font-mono text-emperor-gold/80">{f.fn}()</code>
                  <p className="text-sm text-emperor-cream/45 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §7 — SERVICES */}
      <section id="services" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Menu"
          title="Services & Pricing"
          subtitle="All pricing is built into the AI. Customers get instant quotes. You set the numbers."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
          {SERVICES.map((svc, i) => (
            <div
              key={svc.label}
              className={`glass-panel p-6 hover:border-emperor-gold/30 transition-all duration-300 group ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <svc.icon className="w-8 h-8 text-emperor-gold/70 group-hover:text-emperor-gold transition-colors mb-4" />
              <h3 className="font-display font-semibold text-emperor-cream mb-1">{svc.label}</h3>
              <p className="text-xs text-emperor-cream/35 mb-3">{svc.detail}</p>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span className="text-sm text-emperor-gold font-mono font-medium">{svc.price}</span>
                <span className="text-xs text-emperor-cream/30 font-mono">{svc.time}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-emperor-cream/25 mt-6 italic">
          All prices shown as &ldquo;starting at&rdquo; — AI uses this language with customers. You set final pricing.
        </p>
      </section>

      {/* §8 — PRICING */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Investment"
          title="Simple, All-In-One Pricing"
          subtitle="One monthly price covers everything — hosting, AI, voice, SMS, booking engine, dashboard. No hidden fees."
        />

        <div className="max-w-2xl mx-auto mt-14">
          {/* Main pricing card */}
          <div className="glass-panel overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emperor-gold/20 via-emperor-gold/10 to-transparent p-8 border-b border-emperor-gold/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emperor-gold/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emperor-gold" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-emperor-cream">All-In-One Package</h3>
                  <p className="text-sm text-emperor-cream/40">Everything included. No surprises.</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-6">
                <span className="font-display text-5xl font-bold text-emperor-gold">$99</span>
                <span className="text-emperor-cream/40 text-lg">/month</span>
              </div>
              <p className="text-xs text-emperor-cream/30 mt-2">No contract. Cancel anytime.</p>
            </div>

            {/* Setup fee override */}
            <div className="px-8 py-5 bg-accent-emerald/[0.06] border-b border-accent-emerald/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent-emerald flex-shrink-0" />
                <div>
                  <span className="text-sm text-accent-emerald font-medium">Setup Fee: </span>
                  <span className="text-sm text-emperor-cream/40 line-through mr-2">$1,000 – $3,000</span>
                  <span className="text-sm text-accent-emerald font-bold">WAIVED</span>
                  <span className="text-xs text-emperor-cream/30 ml-2">— First customer reward</span>
                </div>
              </div>
            </div>

            {/* What's included */}
            <div className="p-8 space-y-4">
              <h4 className="font-mono text-xs text-emperor-gold/60 uppercase tracking-wider">Everything Included</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'AI Phone Answering (24/7)',
                  'Website Chat Widget',
                  'Natural Voice System (6 voices)',
                  'Smart Booking Engine',
                  'Auto-Upsell System',
                  'Discount Authorization',
                  'Admin Dashboard',
                  'Real-Time Lead Feed',
                  'Chat Transcript Archive',
                  'Custom Landing Page',
                  'Twilio Phone Number',
                  'All Hosting & Infrastructure',
                  'OpenAI API Usage',
                  'DynamoDB Storage',
                  'Continuous Updates',
                  'Priority Support',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald flex-shrink-0" />
                    <span className="text-sm text-emperor-cream/55">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="px-8 py-5 border-t border-white/[0.06] bg-white/[0.02]">
              <p className="text-xs text-emperor-cream/30 leading-relaxed">
                Prefer to manage your own Twilio or AWS account? Pricing is negotiable — we can break out 
                individual services. The all-in-one package is designed so you pay one price and forget about the tech.
              </p>
            </div>
          </div>

          {/* Cost context */}
          <div className="glass-panel-light p-6 mt-6 text-center">
            <p className="text-sm text-emperor-cream/40">
              Estimated infrastructure cost: <span className="text-emperor-gold font-mono">~$18/mo</span> at typical usage.
              <br />
              <span className="text-xs text-emperor-cream/25">OpenAI ~$7.50 · Twilio ~$10.50 · AWS ~$0.53 · Hosting: Free tier</span>
            </p>
          </div>
        </div>
      </section>

      {/* §9 — ROI */}
      <section id="roi" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Value"
          title="The Numbers Don't Lie"
          subtitle="See what changes when every call gets answered and every lead gets followed up — automatically."
        />

        <div className="glass-panel overflow-hidden mt-14">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left px-6 py-4 text-xs font-mono text-emperor-cream/40 uppercase tracking-wider">Metric</th>
                  <th className="text-center px-6 py-4 text-xs font-mono text-accent-red/60 uppercase tracking-wider">Before LINDA</th>
                  <th className="text-center px-6 py-4 text-xs font-mono text-accent-emerald/60 uppercase tracking-wider">With LINDA</th>
                </tr>
              </thead>
              <tbody>
                {ROI_ROWS.map((row, i) => (
                  <tr key={row.metric} className={i < ROI_ROWS.length - 1 ? 'border-b border-white/[0.04]' : ''}>
                    <td className="px-6 py-4 text-sm text-emperor-cream/60">{row.metric}</td>
                    <td className="px-6 py-4 text-center text-sm text-accent-red/70 font-mono">{row.before}</td>
                    <td className="px-6 py-4 text-center text-sm text-accent-emerald font-mono font-medium">{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pain point callouts */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[
            { pain: '"I miss calls at the gym"', fix: 'AI answers every call 24/7 with context-aware urgency.' },
            { pain: '"I lose leads when I can\'t respond"', fix: 'AI responds instantly — phone, chat, and SMS.' },
            { pain: '"I forget to upsell"', fix: 'AI automatically offers add-ons after every booking.' },
            { pain: '"I need a receptionist"', fix: 'LINDA is your AI Chief of Staff — fraction of the cost.' },
            { pain: '"I need to know what\'s happening"', fix: 'Dashboard shows real-time leads and transcripts.' },
            { pain: '"I need a pro web presence"', fix: 'Premium landing page with embedded AI chat.' },
          ].map((p) => (
            <div key={p.pain} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <p className="text-sm text-emperor-cream/60 font-medium italic">{p.pain}</p>
              <p className="text-xs text-accent-emerald/80 leading-relaxed">{p.fix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* §10 — ROADMAP / ADD-ON */}
      <section id="roadmap" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Growth"
          title="What's Coming Next"
          subtitle="This is v1. Here's what's on the roadmap — each one adds more power to your operation."
        />

        {/* SEO Add-on callout */}
        <div className="glass-panel p-8 mt-14 border-emperor-gold/20 bg-gradient-to-r from-emperor-gold/[0.06] via-transparent to-transparent">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emperor-gold/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-7 h-7 text-emperor-gold" />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="font-display text-xl font-bold text-emperor-cream">
                Add-On: SEO & Google Maps Optimization
              </h3>
              <p className="text-sm text-emperor-cream/45 leading-relaxed max-w-2xl">
                Potential clients find you on Google Maps — that&rsquo;s where the &ldquo;Call&rdquo; button lives. 
                We optimize your Maps listing, reviews strategy, and local SEO so you show up first 
                when someone in Jacksonville searches &ldquo;phone repair near me.&rdquo;
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-emperor-gold">+$49</span>
                <span className="text-emperor-cream/40">/month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10">
          {ROADMAP_ITEMS.map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className={`mt-0.5 text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${
                item.priority === 'High' ? 'bg-accent-emerald/20 text-accent-emerald' :
                item.priority === 'Medium' ? 'bg-accent-amber/20 text-accent-amber' :
                item.priority === 'Ongoing' ? 'bg-accent-blue/20 text-accent-blue' :
                'bg-emperor-cream/10 text-emperor-cream/40'
              }`}>
                {item.priority}
              </span>
              <div>
                <h4 className="text-sm font-medium text-emperor-cream/70">{item.label}</h4>
                <p className="text-xs text-emperor-cream/30 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-emperor-cream/25 mt-8 italic max-w-lg mx-auto">
          Anything can be further customized or removed, and any feature can be added. 
          Tell us what you need and we build it to spec.
        </p>
      </section>

      {/* §11 — TECHNICAL (collapsed by default) */}
      <section id="technical" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          badge="Technical"
          title="Under the Hood"
          subtitle="For the curious — here's the tech stack powering everything. You never have to touch any of this."
        />

        <TechnicalDetails mounted={mounted} />
      </section>

      {/* ── CTA Footer ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="glass-panel p-10 lg:p-16 text-center space-y-8 border-emperor-gold/20 bg-gradient-to-b from-emperor-gold/[0.05] via-transparent to-transparent">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-emperor-cream leading-tight">
            Ready to see it <span className="text-emperor-gold italic">in action</span>?
          </h2>
          <p className="text-emperor-cream/45 max-w-xl mx-auto leading-relaxed">
            Visit the landing page to chat with the AI. Open the dashboard to control everything. 
            Call the demo number to hear the voice. It&rsquo;s all live.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/" className="btn-emperor flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Landing Page
            </Link>
            <Link href="/dashboard" className="btn-ghost flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-10 border-t border-emperor-gold/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emperor-gold/50" />
            <span className="font-display text-sm text-emperor-cream/40">
              Emperor<span className="text-emperor-gold/60">Linda</span> Cell Phone Repairs
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-emperor-cream/25">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Jacksonville, FL
            </div>
            <div className="h-3 w-px bg-emperor-cream/10" />
            <Link href="/" className="hover:text-emperor-gold/60 transition-colors">Home</Link>
            <div className="h-3 w-px bg-emperor-cream/10" />
            <Link href="/dashboard" className="hover:text-emperor-gold/60 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

// ─────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────

function SectionHeader({ badge, title, subtitle }: { badge: string; title: React.ReactNode; subtitle: string }) {
  return (
    <div className="max-w-2xl">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emperor-gold/[0.08] border border-emperor-gold/15 mb-5">
        <span className="text-[10px] font-mono text-emperor-gold/70 uppercase tracking-widest">{badge}</span>
      </div>
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-emperor-cream leading-tight mb-4">
        {title}
      </h2>
      <p className="text-emperor-cream/40 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function TechnicalDetails({ mounted }: { mounted: boolean }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const sections: Array<{ key: string; title: string; icon: typeof Layers; items: Array<{ label: string; value: string }> }> = [
    {
      key: 'stack',
      title: 'Technology Stack',
      icon: Layers,
      items: [
        { label: 'AI Model', value: 'OpenAI GPT-5 Mini — function calling, 42-message context window' },
        { label: 'Voice', value: 'OpenAI TTS-1 — 6 premium voices, 1.05x speed' },
        { label: 'Frontend', value: 'Next.js (latest) + React + Tailwind CSS + TypeScript' },
        { label: 'Backend', value: 'Next.js API Routes (primary) + AWS Lambda (SMS pipeline)' },
        { label: 'Database', value: 'AWS DynamoDB — 2 tables, pay-per-request, auto-scaling' },
        { label: 'Phone/SMS', value: 'Twilio Programmable Voice + SMS' },
        { label: 'Hosting', value: 'Vercel (edge-deployed, auto-scaling)' },
      ],
    },
    {
      key: 'performance',
      title: 'Performance',
      icon: Gauge,
      items: [
        { label: 'Page Load', value: '~1.2s (Vercel edge CDN)' },
        { label: 'Chat Response', value: '~1.5–2.5s (OpenAI dependent)' },
        { label: 'Voice TTS', value: '~1.0–1.5s generation time' },
        { label: 'Database Query', value: '~50–80ms' },
        { label: 'Concurrent Chats', value: 'Unlimited (serverless horizontal scaling)' },
        { label: 'Concurrent Calls', value: '1 per Twilio number (add numbers for more)' },
      ],
    },
    {
      key: 'security',
      title: 'Security & Compliance',
      icon: Lock,
      items: [
        { label: 'Transport', value: 'HTTPS/TLS everywhere' },
        { label: 'API Keys', value: 'Server-side only, never exposed to browser' },
        { label: 'Database Access', value: 'IAM role-based — only authenticated services' },
        { label: 'Chat Storage', value: 'All transcripts in DynamoDB (manual purge available)' },
        { label: 'API Rate Limiting', value: 'Vercel default: 100 req/10s' },
        { label: 'HIPAA/PCI', value: 'Not applicable — no health or payment data stored' },
      ],
    },
    {
      key: 'api',
      title: 'API Endpoints',
      icon: Globe,
      items: [
        { label: '/api/chat', value: 'POST — AI conversation (chat widget + demo)' },
        { label: '/api/twilio-voice', value: 'POST — Twilio phone call webhook' },
        { label: '/api/tts', value: 'POST — Text-to-speech generation' },
        { label: '/api/tts/stream', value: 'GET — Streaming TTS for Twilio <Play>' },
        { label: '/api/state', value: 'GET/POST — Dashboard state read/write' },
        { label: '/api/leads', value: 'GET — Lead feed for dashboard' },
        { label: '/api/chat-logs', value: 'GET — Chat transcript retrieval' },
      ],
    },
    {
      key: 'compatibility',
      title: 'Browser & Mobile',
      icon: Monitor,
      items: [
        { label: 'Chrome/Edge', value: '90+ — full support including Web Speech API' },
        { label: 'Safari', value: '14+ — webkit prefix for speech' },
        { label: 'Firefox', value: '88+ — limited voice demo support' },
        { label: 'Mobile Safari', value: 'iOS 14+ — optimized experience' },
        { label: 'Mobile Chrome', value: 'Android 10+ — full feature parity' },
        { label: 'Responsive', value: 'Desktop, tablet, mobile — all breakpoints covered' },
      ],
    },
  ]

  return (
    <div className="mt-14 space-y-3">
      {sections.map((sec) => (
        <div key={sec.key} className="glass-panel overflow-hidden">
          <button
            onClick={() => toggle(sec.key)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <sec.icon className="w-5 h-5 text-emperor-gold/70" />
              <span className="font-display font-semibold text-emperor-cream">{sec.title}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-emperor-cream/40 transition-transform duration-300 ${openSections[sec.key] ? 'rotate-180' : ''}`} />
          </button>
          {openSections[sec.key] && (
            <div className="px-6 pb-5 pt-1 border-t border-white/[0.05]">
              <div className="space-y-3 pt-3">
                {sec.items.map((item) => (
                  <div key={item.label} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                    <span className="text-xs font-mono text-emperor-gold/60 sm:w-40 flex-shrink-0">{item.label}</span>
                    <span className="text-sm text-emperor-cream/50">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
