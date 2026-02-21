'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  Zap,
  MapPin,
  Star,
  Battery,
  Monitor,
  Cpu,
} from 'lucide-react'
import ChatHero from '@/components/ChatHero'

type WhatWeFixIcon = 'monitor' | 'battery' | 'zap' | 'cpu'

interface WhatWeFixItem {
  icon: WhatWeFixIcon
  name: string
  price: string
  service: string
}

const WHAT_WE_FIX_ICON_COMPONENTS: Record<WhatWeFixIcon, typeof Monitor> = {
  monitor: Monitor,
  battery: Battery,
  zap: Zap,
  cpu: Cpu,
}

const DEFAULT_WHAT_WE_FIX_ITEMS: WhatWeFixItem[] = [
  { icon: 'monitor', name: 'Screen Repair', price: 'From $79', service: '~45 min' },
  { icon: 'battery', name: 'Battery Swap', price: 'From $49', service: '~30 min' },
  { icon: 'zap', name: 'Charging Port', price: 'From $59', service: '~40 min' },
  { icon: 'cpu', name: 'Diagnostics', price: 'Free', service: '~15 min' },
]

function parseWhatWeFixItems(raw: unknown): WhatWeFixItem[] | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null
    }

    const mapped = parsed
      .map((item): WhatWeFixItem | null => {
        if (!item || typeof item !== 'object') {
          return null
        }

        const candidate = item as Partial<WhatWeFixItem>
        const icon = candidate.icon
        if (icon !== 'monitor' && icon !== 'battery' && icon !== 'zap' && icon !== 'cpu') {
          return null
        }

        const name = typeof candidate.name === 'string' ? candidate.name.trim() : ''
        const price = typeof candidate.price === 'string' ? candidate.price.trim() : ''
        const service = typeof candidate.service === 'string' ? candidate.service.trim() : ''
        if (!name || !price || !service) {
          return null
        }

        return { icon, name, price, service }
      })
      .filter((item): item is WhatWeFixItem => item !== null)

    return mapped.length > 0 ? mapped : null
  } catch {
    return null
  }
}

const REVIEWS = [
  { name: 'Marcus T.', text: 'Fixed my iPhone screen in 40 minutes. Unreal.', rating: 5 },
  { name: 'Keisha W.', text: 'Best prices in Jax. Brandon is the real deal.', rating: 5 },
  { name: 'David R.', text: 'My Galaxy was dead. He brought it back to life.', rating: 5 },
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [whatWeFixItems, setWhatWeFixItems] = useState<WhatWeFixItem[]>(DEFAULT_WHAT_WE_FIX_ITEMS)
  const [isMobileView, setIsMobileView] = useState(false)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [isChatInputFocused, setIsChatInputFocused] = useState(false)
  const [isChatLockActive, setIsChatLockActive] = useState(false)
  const [sectionsExpandedBySwipe, setSectionsExpandedBySwipe] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadWhatWeFixItems = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' })
        if (!res.ok) return

        const payload = await res.json() as { status?: string; state?: { what_we_fix_items?: string } }
        if (payload.status !== 'success') return

        const parsed = parseWhatWeFixItems(payload.state?.what_we_fix_items)
        if (parsed) {
          setWhatWeFixItems(parsed)
        }
      } catch {
        // Keep defaults on failure
      }
    }

    void loadWhatWeFixItems()
  }, [])

  useEffect(() => {
    if (isChatInputFocused) {
      setSectionsExpandedBySwipe(false)
      return
    }

    if (!isChatInputFocused && !isChatLockActive) {
      setSectionsExpandedBySwipe(false)
    }
  }, [isChatInputFocused, isChatLockActive])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateMobileView = () => {
      const mobile = window.innerWidth < 1024
      setIsMobileView(mobile)

      if (!mobile) {
        setIsChatLockActive(false)
        setSectionsExpandedBySwipe(false)
      }
    }

    updateMobileView()
    window.addEventListener('resize', updateMobileView)
    window.addEventListener('orientationchange', updateMobileView)

    return () => {
      window.removeEventListener('resize', updateMobileView)
      window.removeEventListener('orientationchange', updateMobileView)
    }
  }, [])

  const mobileChatLockActive = isMobileView && isChatLockActive
  const mobileInputFocused = isMobileView && isChatInputFocused
  const shouldCollapseLowerSections = (mobileChatLockActive || isKeyboardOpen || mobileInputFocused) && !sectionsExpandedBySwipe

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateKeyboardState = () => {
      const vv = window.visualViewport
      if (!vv) {
        setIsKeyboardOpen(false)
        return
      }

      const likelyKeyboard = window.innerWidth < 1024 && vv.height < window.innerHeight * 0.78
      setIsKeyboardOpen(likelyKeyboard)
    }

    updateKeyboardState()

    const vv = window.visualViewport
    vv?.addEventListener('resize', updateKeyboardState)
    vv?.addEventListener('scroll', updateKeyboardState)
    window.addEventListener('orientationchange', updateKeyboardState)

    return () => {
      vv?.removeEventListener('resize', updateKeyboardState)
      vv?.removeEventListener('scroll', updateKeyboardState)
      window.removeEventListener('orientationchange', updateKeyboardState)
    }
  }, [])

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
      <nav className="relative z-20 flex items-center justify-center px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emperor-gold to-emperor-gold-dark flex items-center justify-center shadow-lg shadow-emperor-gold/20">
            <Smartphone className="w-5 h-5 text-emperor-black" />
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight text-emperor-cream">Emperor<span className="text-emperor-gold">Linda</span></span>
          </div>
        </div>
      </nav>

      <ChatHero
        onInputFocusChange={(focused) => {
          setIsChatInputFocused(focused)
          if (focused && isMobileView) {
            setSectionsExpandedBySwipe(false)
          }
        }}
        onConversationStarted={() => {
          if (!isMobileView) {
            return
          }

          setIsChatLockActive(true)
          setSectionsExpandedBySwipe(false)
        }}
        onHardSwipeUp={() => {
          if (isMobileView && (isChatInputFocused || isKeyboardOpen || isChatLockActive)) {
            setSectionsExpandedBySwipe(true)
          }
        }}
      />

      {shouldCollapseLowerSections && (
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-center px-6 pb-3">
          <div className="rounded-full border border-emperor-gold/25 bg-emperor-charcoal/70 px-3 py-1 text-[10px] font-mono tracking-wide text-emperor-gold/85">
            Swipe up hard to reveal more
          </div>
        </div>
      )}

      {!shouldCollapseLowerSections && (
        <>
      {/* Services Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">
            What we <span className="text-emperor-gold italic">fix</span>
          </h2>
          <p className="text-emperor-cream/40 mt-3 text-sm">Walk in or book ahead. Most repairs done same-day.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {whatWeFixItems.map((svc, i) => {
            const Icon = WHAT_WE_FIX_ICON_COMPONENTS[svc.icon]
            return (
            <div
              key={`${svc.name}-${i}`}
              className={`glass-panel p-6 hover:border-emperor-gold/30 transition-all duration-300 group cursor-default ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              <Icon className="w-8 h-8 text-emperor-gold/70 group-hover:text-emperor-gold transition-colors mb-4" />
              <h3 className="font-display font-semibold text-emperor-cream mb-1">{svc.name}</h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-emperor-gold font-mono">{svc.price}</span>
                <span className="text-xs text-emperor-cream/30 font-mono">{svc.service}</span>
              </div>
            </div>
          )})}
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
            <Link href="/dashboard" className="text-emperor-cream/40 hover:text-emperor-gold/70 transition-colors text-[11px]">
              Dashboard
            </Link>
            <div className="h-3 w-px bg-emperor-cream/10" />
            <Link href="/features" className="hover:text-emperor-gold/60 transition-colors">
              Features
            </Link>

          </div>
        </div>
      </footer>
        </>
      )}
    </main>
  )
}
