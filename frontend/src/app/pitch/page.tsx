'use client'

import Link from 'next/link'
import {
  Phone,
  MessageSquare,
  Brain,
  Calendar,
  ShoppingBag,
  Moon,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'critical' | 'high' | 'medium' | 'revenue'

interface GapCta {
  label: string
  href: string
  external?: boolean
  variant: 'phone' | 'primary' | 'secondary' | 'qr'
}

interface Gap {
  num: string
  badge: BadgeVariant
  badgeLabel: string
  title: string
  problem: string
  solution: string
  ctas: GapCta[]
}

interface Quote {
  stars: number
  text: string
  meta: string
}

interface LindaCapability {
  icon: React.ReactNode
  title: string
  desc: string
  bg: string
}

interface RoiRow {
  metric: string
  before: string
  after: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const GAPS: Gap[] = [
  {
    num: '01',
    badge: 'critical',
    badgeLabel: '🔴 Critical · Revenue Impact',
    title: 'Your Google Maps number rings — and rings — and rings.',
    problem:
      'Your primary discovery channel is Google Maps. When a potential customer searches "phone repair near me," finds you, and taps to call — they reach voicemail or get no answer at all. Reviews confirm it: "Called twice, no one picked up." That customer is already on their way to a competitor before you see the missed call. This is your single biggest revenue leak.',
    solution:
      'LINDA answers every call, 24/7 — even when you\'re mid-repair, at the gym, or asleep. Natural voice, real answers, books the appointment on the spot. A customer who calls your number at 11 PM on a Sunday gets a booking confirmation before they can close the tab.',
    ctas: [
      { label: 'Call now & try LINDA: (855) 799-5436', href: 'tel:+18557995436', variant: 'phone' },
    ],
  },
  {
    num: '02',
    badge: 'critical',
    badgeLabel: '🔴 Critical · First Impression',
    title: 'Customers show up and the shop is dark.',
    problem:
      'You run a mobile + walk-in hybrid shop without full staff. Customers who find you online and decide to stop by hit a locked door with no clear indicator of when you\'ll be back — no way to pre-qualify intent, set expectations, or capture that lead before they drive off. A customer who showed up once rarely shows up again.',
    solution:
      'The Agent Surface — our live chat assistant — answers questions, gives quotes, and schedules appointments around your actual availability. No more lost walk-ins. They scan the QR, chat with LINDA, and book a slot — all before you\'re back from the coffee run.',
    ctas: [
      { label: 'Door QR · Click to open Linda', href: '/', variant: 'qr' },
    ],
  },
  {
    num: '03',
    badge: 'high',
    badgeLabel: '🟠 High · Reputation Risk',
    title: 'Slow text replies are getting flagged in reviews.',
    problem:
      'Multiple reviews reference the same pattern: customer sends a message, waits hours, finds a competitor first or leaves a 1-2 star review mentioning the delay. You\'re not ignoring them — you\'re working, which is the whole point. But to a customer staring at a cracked screen, 6 hours feels like ghosting. That reputation damage compounds every week.',
    solution:
      'LINDA responds to inbound SMS in under 3 seconds — not a canned message, but a context-aware reply that knows whether you\'re at the shop, on the road, or unavailable. "He\'s mid-repair right now — let me lock in a slot so you\'re next." Urgency without pressure. The SMS webhook is live on (904) 650-3007 — one carrier registration step away from delivering.',
    ctas: [
      { label: 'Try the AI brain now (web chat)', href: '/', variant: 'primary' },
      { label: 'See the AI Receptionist', href: '/features#ai-receptionist', variant: 'secondary' },
    ],
  },
  {
    num: '04',
    badge: 'high',
    badgeLabel: '🟠 High · Conversion Leak',
    title: 'No upsell conversation is happening at point-of-booking.',
    problem:
      'A customer books a screen repair — that\'s one ticket. But while they\'re already engaged and mentally committed to spending money, nobody is mentioning screen protectors, cases, or a battery-while-you\'re-here offer. In a solo operation, upselling mid-repair is awkward. The window is at booking, and it\'s currently empty.',
    solution:
      'Every LINDA booking conversation includes a natural upsell prompt — timed right, never pushy. "Your iPhone 13 battery might be worth a look while we\'re in there — 30-min add-on, $49." You set a discount threshold; LINDA handles the close. Every booking becomes an upsell opportunity on autopilot.',
    ctas: [
      { label: 'See Upsell Intelligence', href: '/features#ai-intelligence', variant: 'primary' },
    ],
  },
  {
    num: '05',
    badge: 'medium',
    badgeLabel: '🔵 Medium · Operational',
    title: "Customers can't self-serve 'Mobile or Shop?' — they text to ask.",
    problem:
      'A huge portion of your inbound messages are logistics questions: "Do you come to me?", "Where is your shop?", "Are you open now?", "How long does a screen take?" These are zero-revenue conversations that eat your time. Every minute spent explaining "I\'m mobile too" is a minute not spent on repairs.',
    solution:
      'LINDA handles all FAQ-class conversations automatically: hours, location, services, pricing, mobile vs. shop, turnaround times. And because it knows your live status — "He\'s on the road right now but free at 3pm" — answers always match reality. Your time is protected for actual repair work.',
    ctas: [
      { label: 'See Context System', href: '/features#voice-system', variant: 'primary' },
      { label: 'View the Dashboard', href: '/dashboard', variant: 'secondary' },
    ],
  },
  {
    num: '06',
    badge: 'revenue',
    badgeLabel: '🟢 Revenue Upside · After Hours',
    title: "Your business closes at night. Your competitors' don't.",
    problem:
      'Phone repair is often an emergency: a cracked screen before a work trip, a dead battery the night before a flight. These customers search at 10 PM and book whoever responds first. Right now, you\'re invisible after hours. The shop that answers at 10 PM on Sunday gets the Tuesday morning walk-in.',
    solution:
      'LINDA runs 24/7 with zero marginal cost. After-hours mode shifts tone automatically — acknowledges it\'s late, explains your hours, and still captures a booking for the next available slot. A customer who can\'t reach you tonight books with you for tomorrow — instead of someone else for today.',
    ctas: [
      { label: 'Call after hours: (855) 799-5436', href: 'tel:+18557995436', variant: 'phone' },
      { label: 'See the ROI Numbers', href: '/features#roi', variant: 'secondary' },
    ],
  },
]

const QUOTES: Quote[] = [
  { stars: 2, text: '"Called twice, no answer. Texted, waited 6 hours. Ended up going to uBreakiFix."', meta: 'Google Maps Review — Gap #01 & #03' },
  { stars: 3, text: '"Drove to the shop address, nobody was there. No sign, no hours posted. Had to find someone else same day."', meta: 'Google Maps Review — Gap #02' },
  { stars: 5, text: '"Brandon is incredible when you get him. Fast, fair, knows his stuff. Just needs a better way to reach him."', meta: 'Google Maps Review — The Opportunity' },
  { stars: 3, text: '"Wish I knew if he does mobile repairs before I drove out there. Website didn\'t really say."', meta: 'Google Maps Review — Gap #05' },
]

const CAPABILITIES: LindaCapability[] = [
  { icon: <Phone size={16} />, title: 'Answers Every Call', desc: 'Natural voice AI on your number. Handles inquiries, books appointments, escalates only what needs you.', bg: 'bg-red-900/30' },
  { icon: <MessageSquare size={16} />, title: 'Website Chat + SMS', desc: 'Live on the landing page today. SMS webhook deployed on (904) 650-3007 — one-time carrier registration activates it (A2P 10DLC, ~$14, 1-day approval). Same AI brain, every channel.', bg: 'bg-emperor-gold/10' },
  { icon: <Brain size={16} />, title: 'Knows Your Status', desc: 'Working, Gym, Driving, Break — you flip a switch and the AI\'s tone shifts automatically.', bg: 'bg-accent-emerald/10' },
  { icon: <Calendar size={16} />, title: 'Books Real Appointments', desc: 'Checks actual availability, locks a slot, confirms with the customer. No double-booking.', bg: 'bg-accent-blue/10' },
  { icon: <ShoppingBag size={16} />, title: 'Handles Upsells & Discounts', desc: 'You set the threshold. Discounts approved instantly. Upsell offered every time.', bg: 'bg-red-900/20' },
  { icon: <Moon size={16} />, title: '24 / 7 — No Salary', desc: 'After-hours mode captures every late-night lead. Runs on API costs — a fraction of a human receptionist.', bg: 'bg-emperor-gold/10' },
]

const ROI_ROWS: RoiRow[] = [
  { metric: 'Missed calls (gym / repairs / breaks)', before: '~40% lost', after: '0% — LINDA picks up every time' },
  { metric: 'Lead response time', before: '15 min – 6 hours', after: '< 3 seconds, 24/7' },
  { metric: 'After-hours lead capture', before: 'None', after: 'Every inquiry, every night' },
  { metric: 'Upsell offered per booking', before: 'Inconsistent', after: '100% — automated, natural' },
  { metric: 'Logistics FAQ time cost', before: '5+ hrs / week', after: 'Zero — fully automated' },
  { metric: 'Monthly receptionist cost', before: '$2,000–$3,000 (human)', after: 'Fraction — API-based, no salary' },
]

// ─── Badge styles ──────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<BadgeVariant, string> = {
  critical: 'bg-red-900/40 text-red-400 border border-red-800/50',
  high:     'bg-amber-900/30 text-amber-400 border border-amber-700/40',
  medium:   'bg-blue-900/30 text-accent-blue border border-blue-700/40',
  revenue:  'bg-emerald-900/30 text-accent-emerald border border-emerald-700/40',
}

// ─── CTA link styles ───────────────────────────────────────────────────────────
const CTA_STYLES: Record<GapCta['variant'], string> = {
  phone:     'bg-emperor-gold text-emperor-black hover:bg-emperor-gold-light',
  primary:   'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30 hover:bg-accent-emerald/20',
  secondary: 'bg-white/5 text-emperor-cream/60 border border-white/10 hover:border-white/25 hover:text-emperor-cream',
  qr:        'bg-white/5 text-emperor-cream border border-emperor-gold/25 hover:border-emperor-gold/55 hover:bg-white/10',
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < count ? 'text-emperor-gold' : 'text-white/15'}>★</span>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PitchPage() {
  return (
    <main className="min-h-screen bg-emperor-black text-emperor-cream font-body">

      {/* ═══ TOP BAR ═════════════════════════════════════════════════════════ */}
      <header className="border-b border-white/8 px-6 sm:px-16 lg:px-28 py-4 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest uppercase text-emperor-gold/70">
          EmperorLinda · Gaps &amp; Fixes
        </span>
        <span className="font-mono text-xs tracking-widest uppercase text-white/25">
          Feb 2026
        </span>
      </header>


      {/* ═══ THE GAPS ════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-16 lg:px-28 pt-10 pb-16 max-w-5xl mx-auto">

        <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[1.05] text-emperor-cream mb-14">
          Here&rsquo;s what I{' '}
          <em className="italic text-emperor-gold">found,</em>
          <br />
          then{' '}
          <em className="italic text-accent-emerald">built</em>
          {' '}for you.
        </h1>

        <div className="divide-y divide-white/8">
          {GAPS.map((gap) => (
            <div key={gap.num} className="group py-10 grid grid-cols-[3rem_1fr] gap-x-8">

              {/* Number */}
              <span className="font-display text-5xl leading-none text-white/15 group-hover:text-emperor-gold transition-colors duration-300 pt-1 select-none">
                {gap.num}
              </span>

              {/* Body */}
              <div>
                <span className={`inline-block font-mono text-xs tracking-widest uppercase px-2.5 py-1 rounded-sm mb-3 ${BADGE_STYLES[gap.badge]}`}>
                  {gap.badgeLabel}
                </span>
                <h3 className="font-sans font-bold text-xl text-emperor-cream mb-3 leading-snug">
                  {gap.title}
                </h3>
                <p className="text-emperor-cream/45 text-sm leading-relaxed max-w-2xl mb-5">
                  {gap.problem}
                </p>

                {/* Solution block */}
                <div className="border-l-2 border-emperor-gold pl-4 py-2 bg-emperor-gold/5 rounded-r mb-5">
                  <p className="font-mono text-xs tracking-widest uppercase text-emperor-gold mb-2">✦ The Fix</p>
                  <p className="text-emperor-cream/80 text-sm leading-relaxed">{gap.solution}</p>
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap gap-2.5">
                  {gap.ctas.map((cta) => {
                    const cls = `inline-flex items-center gap-2 font-sans font-semibold text-sm px-4 py-2 rounded transition-all duration-150 ${CTA_STYLES[cta.variant]}`
                    const isExternal = cta.external === true
                    const isPhone = cta.href.startsWith('tel:')

                    if (cta.variant === 'qr') {
                      return (
                        <Link
                          key={cta.label}
                          href={cta.href}
                          className="group/qr inline-flex items-center gap-3 rounded-lg border border-emperor-gold/25 bg-white/5 px-3 py-2 hover:border-emperor-gold/55 hover:bg-white/10 transition-all duration-150"
                        >
                          <span
                            aria-hidden="true"
                            className="h-10 w-10 rounded-[6px] border border-emperor-gold/35 bg-emperor-cream p-[3px] shadow-inner shadow-emperor-black/10"
                          >
                            <span className="grid h-full w-full grid-cols-5 gap-[2px] rounded-[3px] bg-emperor-cream">
                              {[
                                1,1,1,0,1,
                                1,0,1,1,0,
                                1,1,0,1,1,
                                0,1,1,0,1,
                                1,0,1,1,1,
                              ].map((dot, index) => (
                                <span
                                  key={`${cta.label}-${index}`}
                                  className={dot === 1 ? 'rounded-[1px] bg-emperor-black' : 'rounded-[1px] bg-emperor-cream'}
                                />
                              ))}
                            </span>
                          </span>

                          <span className="flex flex-col leading-tight">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emperor-gold/80">Door QR</span>
                            <span className="text-sm font-semibold text-emperor-cream">Click to open Linda</span>
                          </span>
                        </Link>
                      )
                    }

                    if (isPhone || isExternal) {
                      return (
                        <a key={cta.label} href={cta.href} className={cls}>
                          {isPhone ? <Phone size={13} /> : <ExternalLink size={13} />}
                          {cta.label}
                        </a>
                      )
                    }
                    return (
                      <Link key={cta.label} href={cta.href} className={cls}>
                        <ArrowRight size={13} />
                        {cta.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

            </div>
          ))}
        </div>
      </section>


      {/* ═══ EVIDENCE ════════════════════════════════════════════════════════ */}
      <section className="bg-emperor-charcoal py-20 px-6 sm:px-16 lg:px-28">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs tracking-widest uppercase text-emperor-gold/60 mb-3">Section 02 — The Evidence</p>
          <h2 className="font-display text-4xl sm:text-5xl text-emperor-cream mb-2">
            Real words.{' '}
            <em className="text-emperor-gold italic">Real customers.</em>
          </h2>
          <p className="text-emperor-cream/40 text-sm mb-10">This is what the gaps look like in the wild.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {QUOTES.map((q) => (
              <div key={q.meta} className="p-5 border border-white/8 rounded bg-emperor-black/50">
                <StarRow count={q.stars} />
                <p className="font-display italic text-emperor-cream/80 text-base leading-relaxed mb-3">{q.text}</p>
                <p className="font-mono text-xs tracking-widest uppercase text-emperor-gold/50">{q.meta}</p>
              </div>
            ))}
          </div>

          <blockquote className="mt-10 border-l-4 border-emperor-gold pl-5 py-1 text-emperor-gold font-display italic text-lg leading-relaxed">
            "Brandon is incredible when you get him." — That 5-star technician has a 3-star 
            discoverability problem. That's not a skills gap. That's a systems gap.
          </blockquote>
        </div>
      </section>


      {/* ═══ ROI ═════════════════════════════════════════════════════════════ */}
      <section className="bg-emperor-slate/30 py-24 px-6 sm:px-16 lg:px-28">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs tracking-widest uppercase text-emperor-gold/60 mb-3">Section 03 — The Math</p>
          <h2 className="font-display text-4xl sm:text-5xl text-emperor-cream mb-3">
            What the gaps cost <em className="text-accent-red italic">annually.</em>
          </h2>
          <p className="text-emperor-cream/45 text-sm max-w-xl leading-relaxed mb-12">
            Conservative estimates. Actual bleed is likely higher given Jacksonville competition density.
          </p>

          {/* Bleed cards */}
          <div className="flex flex-wrap gap-4 mb-12">
            {[
              { n: '$12,480', l: 'Annual revenue from missed jobs alone\n(3 missed leads/wk × $80 avg profit × 52 wks)' },
              { n: '260 hrs', l: 'Annual time lost to logistics texts & unanswered calls\n(5 hrs/week of preventable admin)' },
              { n: '1–3 ★', l: 'Review damage compounding each week a slow-response event happens' },
            ].map(c => (
              <div key={c.n} className="flex-1 min-w-[200px] p-5 border border-white/10 rounded bg-emperor-black/50">
                <div className="font-display text-4xl text-accent-red mb-2 leading-none">{c.n}</div>
                <p className="text-emperor-cream/45 text-xs leading-relaxed whitespace-pre-line">{c.l}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-white/10">
                  <th className="font-mono text-xs tracking-widest uppercase text-emperor-cream/40 text-left py-3 pr-6">Metric</th>
                  <th className="font-mono text-xs tracking-widest uppercase text-accent-red/70 text-left py-3 pr-6">Before LINDA</th>
                  <th className="font-mono text-xs tracking-widest uppercase text-accent-emerald/70 text-left py-3">With LINDA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {ROI_ROWS.map(r => (
                  <tr key={r.metric}>
                    <td className="py-3.5 pr-6 text-emperor-cream/60">{r.metric}</td>
                    <td className="py-3.5 pr-6 text-accent-red font-semibold">{r.before}</td>
                    <td className="py-3.5 text-accent-emerald font-semibold">{r.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>


      {/* ═══ WHAT IS LINDA ═══════════════════════════════════════════════════ */}
      <section className="py-24 px-6 sm:px-16 lg:px-28">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs tracking-widest uppercase text-emperor-gold/60 mb-3">Section 04 — The System</p>
          <h2 className="font-display text-4xl sm:text-5xl text-emperor-cream mb-3">
            What <em className="text-emperor-gold italic">LINDA</em> actually is.
          </h2>
          <p className="text-emperor-cream/45 text-sm max-w-xl leading-relaxed mb-12">
            Not a chatbot. Not a phone tree. LINDA is a full front-desk operation 
            running on your existing number — context-aware, booking-capable, always on.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map(c => (
              <div key={c.title} className="p-5 border border-white/8 rounded bg-emperor-charcoal/60 hover:border-emperor-gold/30 transition-colors duration-200">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-4 ${c.bg} text-emperor-gold`}>
                  {c.icon}
                </div>
                <h3 className="font-sans font-bold text-base text-emperor-cream mb-1.5">{c.title}</h3>
                <p className="text-emperor-cream/45 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/features" className="inline-flex items-center gap-2 font-sans font-semibold text-sm px-4 py-2.5 rounded bg-emperor-gold/10 text-emperor-gold border border-emperor-gold/30 hover:bg-emperor-gold/20 transition-all">
              <ArrowRight size={14} />
              See all features in detail
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-2 font-sans font-semibold text-sm px-4 py-2.5 rounded bg-white/5 text-emperor-cream/60 border border-white/10 hover:border-white/25 hover:text-emperor-cream transition-all">
              <ArrowRight size={14} />
              Explore the Dashboard
            </Link>
          </div>
        </div>
      </section>


      {/* ═══ CLOSING ═════════════════════════════════════════════════════════ */}
      <section className="bg-emperor-charcoal py-28 px-6 sm:px-16 lg:px-28 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs tracking-widest uppercase text-emperor-gold/60 mb-6">Section 05 — Next Steps</p>
          <h2 className="font-display text-4xl sm:text-6xl text-emperor-cream leading-none mb-5">
            The software is{' '}
            <em className="text-emperor-gold italic">built.</em>
            <br />It's waiting for your number.
          </h2>
          <p className="text-emperor-cream/45 text-base leading-relaxed max-w-md mx-auto mb-10">
            No setup required on your end. Call the demo line, try the chat, explore the dashboard — 
            then let us know when you want to point it at your real number.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="tel:+18557995436"
              className="inline-flex items-center gap-2 font-sans font-bold text-base px-7 py-3.5 rounded bg-emperor-gold text-emperor-black hover:bg-emperor-gold-light transition-colors"
            >
              <Phone size={16} />
              Call the Demo: (855) 799-5436
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-sans font-bold text-base px-7 py-3.5 rounded bg-transparent text-emperor-cream border border-white/20 hover:border-white/50 transition-colors"
            >
              <ArrowRight size={16} />
              Open Linda
            </Link>
          </div>
        </div>
      </section>


      {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/8 px-6 sm:px-16 lg:px-28 py-5 flex flex-wrap justify-between items-center gap-3">
        <span className="font-mono text-xs tracking-widest uppercase text-emperor-cream/25">
          EmperorLinda Cell Phone Repairs — Digital Gap Report · Feb 2026
        </span>
        <nav className="flex gap-6">
          {[
            { label: 'Linda', href: '/' },
            { label: 'Features', href: '/features' },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Voice Chat', href: '/' },
          ].map(n => (
            <Link key={n.label} href={n.href} className="font-mono text-xs tracking-widest uppercase text-emperor-cream/30 hover:text-emperor-gold transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>
      </footer>

    </main>
  )
}

