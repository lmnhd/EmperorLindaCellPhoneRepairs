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
      { label: 'Call now & try LINDA: (904) 650-3007', href: 'tel:+19046503007', variant: 'phone' },
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
    badgeLabel: '🟠 High · Control Gap',
    title: 'No real-time command center for Brandon while he works.',
    problem:
      'Even if AI handles inbound leads, Brandon still needs a fast way to steer the day: set current status, monitor active leads, and tune how LINDA speaks. Without a simple command surface, context drifts and opportunities get missed while he is focused on repairs.',
    solution:
      'Brandon\'s Cockpit is the control layer. In one screen, he can switch modes (Working, Gym, Driving, After Hours), monitor lead flow, and keep LINDA aligned with the business in real time. That means fewer missed opportunities and tighter day-to-day operations.',
    ctas: [
      { label: 'Open Brandon\'s Cockpit', href: '/dashboard', variant: 'primary' },
      { label: 'See Cockpit Features', href: '/features#dashboard', variant: 'secondary' },
    ],
  },
  {
    num: '04',
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
    num: '05',
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
    num: '06',
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
    num: '07',
    badge: 'revenue',
    badgeLabel: '🟢 Revenue Upside · After Hours',
    title: "Your business closes at night. Your competitors' don't.",
    problem:
      'Phone repair is often an emergency: a cracked screen before a work trip, a dead battery the night before a flight. These customers search at 10 PM and book whoever responds first. Right now, you\'re invisible after hours. The shop that answers at 10 PM on Sunday gets the Tuesday morning walk-in.',
    solution:
      'LINDA runs 24/7 with zero marginal cost. After-hours mode shifts tone automatically — acknowledges it\'s late, explains your hours, and still captures a booking for the next available slot. A customer who can\'t reach you tonight books with you for tomorrow — instead of someone else for today.',
    ctas: [
      { label: 'Call after hours: (904) 650-3007', href: 'tel:+19046503007', variant: 'phone' },
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
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/8 sm:px-16 lg:px-28">
        <span className="font-mono text-xs tracking-widest uppercase text-emperor-gold/70">
          EmperorLinda · Gaps &amp; Fixes
        </span>
        <span className="font-mono text-xs tracking-widest uppercase text-white/25">
          Feb 2026
        </span>
      </header>


      {/* ═══ THE GAPS ════════════════════════════════════════════════════════ */}
      <section className="max-w-5xl px-6 pt-10 pb-16 mx-auto sm:px-16 lg:px-28">

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
              <span className="pt-1 text-5xl leading-none transition-colors duration-300 select-none font-display text-white/15 group-hover:text-emperor-gold">
                {gap.num}
              </span>

              {/* Body */}
              <div>
                <span className={`inline-block font-mono text-xs tracking-widest uppercase px-2.5 py-1 rounded-sm mb-3 ${BADGE_STYLES[gap.badge]}`}>
                  {gap.badgeLabel}
                </span>
                <h3 className="mb-3 font-sans text-xl font-bold leading-snug text-emperor-cream">
                  {gap.title}
                </h3>
                <p className="max-w-2xl mb-5 text-sm leading-relaxed text-emperor-cream/45">
                  {gap.problem}
                </p>

                {/* Solution block */}
                <div className="py-2 pl-4 mb-5 border-l-2 rounded-r border-emperor-gold bg-emperor-gold/5">
                  <p className="mb-2 font-mono text-xs tracking-widest uppercase text-emperor-gold">✦ The Fix</p>
                  <p className="text-sm leading-relaxed text-emperor-cream/80">{gap.solution}</p>
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
                          className="inline-flex items-center gap-3 px-3 py-2 transition-all duration-150 border rounded-lg group/qr border-emperor-gold/25 bg-white/5 hover:border-emperor-gold/55 hover:bg-white/10"
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
      <section className="px-6 py-20 bg-emperor-charcoal sm:px-16 lg:px-28">
        <div className="max-w-5xl mx-auto">
          <p className="mb-3 font-mono text-xs tracking-widest uppercase text-emperor-gold/60">Section 02 — The Evidence</p>
          <h2 className="mb-2 text-4xl font-display sm:text-5xl text-emperor-cream">
            Real words.{' '}
            <em className="italic text-emperor-gold">Real customers.</em>
          </h2>
          <p className="mb-10 text-sm text-emperor-cream/40">This is what the gaps look like in the wild.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {QUOTES.map((q) => (
              <div key={q.meta} className="p-5 border rounded border-white/8 bg-emperor-black/50">
                <StarRow count={q.stars} />
                <p className="mb-3 text-base italic leading-relaxed font-display text-emperor-cream/80">{q.text}</p>
                <p className="font-mono text-xs tracking-widest uppercase text-emperor-gold/50">{q.meta}</p>
              </div>
            ))}
          </div>

          <blockquote className="py-1 pl-5 mt-10 text-lg italic leading-relaxed border-l-4 border-emperor-gold text-emperor-gold font-display">
            "Brandon is incredible when you get him." — That 5-star technician has a 3-star 
            discoverability problem. That's not a skills gap. That's a systems gap.
          </blockquote>
        </div>
      </section>


      {/* ═══ THE COCKPIT ═══════════════════════════════════════════════════ */}
      <section className="px-6 py-24 bg-emperor-slate/30 sm:px-16 lg:px-28">
        <div className="max-w-5xl mx-auto">
          <p className="mb-3 font-mono text-xs tracking-widest uppercase text-emperor-gold/60">Section 03 — The Cockpit</p>
          <h2 className="mb-3 text-4xl font-display sm:text-5xl text-emperor-cream">
            Your real advantage: <em className="italic text-emperor-gold">Brandon&apos;s Cockpit.</em>
          </h2>
          <p className="max-w-2xl mb-10 text-sm leading-relaxed text-emperor-cream/45">
            This is where LINDA stops being a cool demo and becomes a daily operating system.
            One screen gives Brandon full control over the business day while the AI handles the front desk.
          </p>

          <div className="grid gap-4 mb-8 sm:grid-cols-2">
            {[
              {
                title: 'Live Status Control',
                desc: 'Flip between Working, Gym, Driving, Break, and After Hours so LINDA responds with the right context instantly.',
              },
              {
                title: 'Lead Visibility',
                desc: 'See every incoming lead, booking, and conversation in one place instead of chasing missed calls and texts.',
              },
              {
                title: 'Voice + Persona Tuning',
                desc: 'Adjust tone, voice, and behavior so responses sound aligned with Brandon and the brand.',
              },
              {
                title: 'Operator Simplicity',
                desc: 'No technical workflow. Open the Cockpit, update status, keep repairing phones — LINDA handles the rest.',
              },
            ].map((item) => (
              <div key={item.title} className="p-5 border rounded border-white/10 bg-emperor-black/40">
                <p className="font-sans font-semibold text-emperor-cream mb-1.5">{item.title}</p>
                <p className="text-sm leading-relaxed text-emperor-cream/50">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-3 font-sans text-sm font-bold transition-colors rounded bg-emperor-gold text-emperor-black hover:bg-emperor-gold-light">
              <ArrowRight size={15} />
              Open Brandon&apos;s Cockpit
            </Link>
            <Link href="/features#dashboard" className="inline-flex items-center gap-2 px-5 py-3 font-sans text-sm font-semibold transition-colors border rounded bg-white/5 text-emperor-cream/65 border-white/10 hover:border-white/25 hover:text-emperor-cream">
              <ArrowRight size={15} />
              See Cockpit Features
            </Link>
          </div>
        </div>
      </section>


      {/* ═══ ROI ═════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 bg-emperor-slate/30 sm:px-16 lg:px-28">
        <div className="max-w-5xl mx-auto">
          <p className="mb-3 font-mono text-xs tracking-widest uppercase text-emperor-gold/60">Section 04 — The Math</p>
          <h2 className="mb-3 text-4xl font-display sm:text-5xl text-emperor-cream">
            What the gaps cost <em className="italic text-accent-red">annually.</em>
          </h2>
          <p className="max-w-xl mb-12 text-sm leading-relaxed text-emperor-cream/45">
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
                <div className="mb-2 text-4xl leading-none font-display text-accent-red">{c.n}</div>
                <p className="text-xs leading-relaxed whitespace-pre-line text-emperor-cream/45">{c.l}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-white/10">
                  <th className="py-3 pr-6 font-mono text-xs tracking-widest text-left uppercase text-emperor-cream/40">Metric</th>
                  <th className="py-3 pr-6 font-mono text-xs tracking-widest text-left uppercase text-accent-red/70">Before LINDA</th>
                  <th className="py-3 font-mono text-xs tracking-widest text-left uppercase text-accent-emerald/70">With LINDA</th>
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
      <section className="px-6 py-24 sm:px-16 lg:px-28">
        <div className="max-w-5xl mx-auto">
          <p className="mb-3 font-mono text-xs tracking-widest uppercase text-emperor-gold/60">Section 05 — The System</p>
          <h2 className="mb-3 text-4xl font-display sm:text-5xl text-emperor-cream">
            What <em className="italic text-emperor-gold">LINDA</em> actually is.
          </h2>
          <p className="max-w-xl mb-12 text-sm leading-relaxed text-emperor-cream/45">
            Not a chatbot. Not a phone tree. LINDA is a full front-desk operation 
            running on your existing number — context-aware, booking-capable, always on.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(c => (
              <div key={c.title} className="p-5 transition-colors duration-200 border rounded border-white/8 bg-emperor-charcoal/60 hover:border-emperor-gold/30">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-4 ${c.bg} text-emperor-gold`}>
                  {c.icon}
                </div>
                <h3 className="font-sans font-bold text-base text-emperor-cream mb-1.5">{c.title}</h3>
                <p className="text-sm leading-relaxed text-emperor-cream/45">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
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
      <section className="px-6 text-center bg-emperor-charcoal py-28 sm:px-16 lg:px-28">
        <div className="max-w-2xl mx-auto">
          <p className="mb-6 font-mono text-xs tracking-widest uppercase text-emperor-gold/60">Section 06 — Next Steps</p>
          <h2 className="mb-5 text-4xl leading-none font-display sm:text-6xl text-emperor-cream">
            The software is{' '}
            <em className="italic text-emperor-gold">built.</em>
            <br />It's waiting for your number.
          </h2>
          <p className="max-w-md mx-auto mb-10 text-base leading-relaxed text-emperor-cream/45">
            No setup required on your end. Call the demo line, try the chat, explore the dashboard — 
            then let us know when you want to point it at your real number.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="tel:+19046503007"
              className="inline-flex items-center gap-2 font-sans font-bold text-base px-7 py-3.5 rounded bg-emperor-gold text-emperor-black hover:bg-emperor-gold-light transition-colors"
            >
              <Phone size={16} />
              Call the Demo: (904) 650-3007
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
      <footer className="flex flex-wrap items-center justify-between gap-6 px-6 py-8 border-t border-white/8 sm:px-16 lg:px-28">
        <span className="font-mono text-xs tracking-widest uppercase text-emperor-cream/25">
          EmperorLinda Cell Phone Repairs — Digital Gap Report · Feb 2026
        </span>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] tracking-widest uppercase text-emperor-gold/50">Built by Nate · Halimede</span>
            <a href="tel:+19042520927" className="font-mono text-sm font-bold transition-colors text-emperor-cream hover:text-emperor-gold">
              (904) 252-0927
            </a>
          </div>
          <nav className="flex gap-6">
            {[
              { label: 'Linda', href: '/' },
              { label: 'Features', href: '/features' },
              { label: 'Dashboard', href: '/dashboard' },
            ].map(n => (
              <Link key={n.label} href={n.href} className="font-mono text-xs tracking-widest uppercase transition-colors text-emperor-cream/30 hover:text-emperor-gold">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>

    </main>
  )
}

