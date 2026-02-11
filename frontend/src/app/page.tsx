'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  Shield,
  Clock,
  Zap,
  Phone,
  MessageSquare,
  ChevronRight,
  MapPin,
  Star,
  Battery,
  Monitor,
  Cpu,
} from 'lucide-react'
import ChatWidget from '@/components/ChatWidget'

const SERVICES = [
  { icon: Monitor, label: 'Screen Repair', price: 'From $79', time: '~45 min' },
  { icon: Battery, label: 'Battery Swap', price: 'From $49', time: '~30 min' },
  { icon: Zap, label: 'Charging Port', price: 'From $59', time: '~40 min' },
  { icon: Cpu, label: 'Diagnostics', price: 'Free', time: '~15 min' },
]

const REVIEWS = [
  { name: 'Marcus T.', text: 'Fixed my iPhone screen in 40 minutes. Unreal.', rating: 5 },
  { name: 'Keisha W.', text: 'Best prices in Jax. Brandon is the real deal.', rating: 5 },
  { name: 'David R.', text: 'My Galaxy was dead. He brought it back to life.', rating: 5 },
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const twilioPhone = process.env.NEXT_PUBLIC_TWILIO_PHONE || '+18557995436'

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Large radial glow */}
        <div className="absolute top-[-30%] left-[50%] -translate-x-1/2 w-[120vw] h-[80vh] bg-gradient-radial from-emperor-gold/[0.04] via-transparent to-transparent" />
        {/* Bottom glow */}
        <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[40vh] bg-gradient-radial from-emperor-gold/[0.03] via-transparent to-transparent" />
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 dot-pattern opacity-40" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emperor-gold to-emperor-gold-dark flex items-center justify-center shadow-lg shadow-emperor-gold/20">
            <Smartphone className="w-5 h-5 text-emperor-black" />
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight text-emperor-cream">Emperor<span className="text-emperor-gold">Linda</span></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/features"
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-emperor-gold/70 hover:text-emperor-gold transition-colors font-medium"
          >
            Features
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/dashboard"
            className="btn-ghost text-sm !px-4 !py-2"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-8 lg:pt-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column - Copy */}
          <div className={`space-y-8 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emperor-gold/[0.08] border border-emperor-gold/20">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-xs font-mono text-emperor-gold/80 tracking-wide">JACKSONVILLE, FL</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight">
              Your phone, fixed
              <br />
              <span className="text-emperor-gold italic">while you wait.</span>
            </h1>

            <p className="text-emperor-cream/50 text-lg leading-relaxed max-w-md">
              Professional cell phone repairs with same-day turnaround. 
              Screen replacements, battery swaps, and more — all backed 
              by a <span className="text-emperor-cream/70 font-medium">90-day warranty</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <a href={`tel:${twilioPhone}`} className="btn-emperor flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Call Now
              </a>
              <a href="#chat" className="btn-ghost flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat with AI
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-4 h-4 fill-emperor-gold text-emperor-gold" />
                  ))}
                </div>
                <span className="text-sm text-emperor-cream/40 ml-1">4.9/5</span>
              </div>
              <div className="h-4 w-px bg-emperor-cream/10" />
              <div className="flex items-center gap-1.5 text-sm text-emperor-cream/40">
                <Clock className="w-3.5 h-3.5" />
                Same-day service
              </div>
              <div className="h-4 w-px bg-emperor-cream/10 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-emperor-cream/40">
                <Shield className="w-3.5 h-3.5" />
                90-day warranty
              </div>
            </div>
          </div>

          {/* Right column - Chat Widget */}
          <div
            id="chat"
            className={`${mounted ? 'animate-fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.15s' }}
          >
            <ChatWidget />
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">
            What we <span className="text-emperor-gold italic">fix</span>
          </h2>
          <p className="text-emperor-cream/40 mt-3 text-sm">Walk in or book ahead. Most repairs done same-day.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map((svc, i) => (
            <div
              key={svc.label}
              className={`glass-panel p-6 hover:border-emperor-gold/30 transition-all duration-300 group cursor-default ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              <svc.icon className="w-8 h-8 text-emperor-gold/70 group-hover:text-emperor-gold transition-colors mb-4" />
              <h3 className="font-display font-semibold text-emperor-cream mb-1">{svc.label}</h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-emperor-gold font-mono">{svc.price}</span>
                <span className="text-xs text-emperor-cream/30 font-mono">{svc.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-4">
          {REVIEWS.map((review, i) => (
            <div
              key={review.name}
              className={`glass-panel-light p-6 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.5 + i * 0.1}s` }}
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-emperor-gold text-emperor-gold" />
                ))}
              </div>
              <p className="text-sm text-emperor-cream/60 leading-relaxed italic">&ldquo;{review.text}&rdquo;</p>
              <p className="text-xs text-emperor-cream/30 mt-3 font-mono">{review.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 py-10 border-t border-emperor-gold/10">
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
              Built By Nate @Halimede
            </div>
            <div className="h-3 w-px bg-emperor-cream/10" />
            <Link href="/features" className="hover:text-emperor-gold/60 transition-colors">
              Features
            </Link>
            <div className="h-3 w-px bg-emperor-cream/10" />
            <span className="font-bold text-white">
              904-252-0927
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
