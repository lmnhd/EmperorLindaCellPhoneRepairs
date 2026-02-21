'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { TypewriterTextProps } from '@/types/chat'

export default function TypewriterText({
  text,
  responseKey,
  speed = 22,
  className,
  onComplete,
  isLoading = false,
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(0)
  const renderKey = responseKey ?? text
  const contentLength = text.trim().length

  const sizeClass = useMemo(() => {
    if (contentLength <= 80) {
      return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl'
    }

    if (contentLength <= 140) {
      return 'text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl'
    }

    if (contentLength <= 220) {
      return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl'
    }

    if (contentLength <= 320) {
      return 'text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl'
    }

    return 'text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-4xl'
  }, [contentLength])

  const typingSpeedMs = useMemo(() => {
    if (contentLength <= 80) {
      return speed
    }

    if (contentLength <= 140) {
      return Math.max(16, speed - 4)
    }

    if (contentLength <= 220) {
      return Math.max(13, speed - 7)
    }

    if (contentLength <= 320) {
      return Math.max(11, speed - 9)
    }

    return Math.max(9, speed - 11)
  }, [contentLength, speed])

  useEffect(() => {
    setVisibleLength(0)
  }, [text, renderKey])

  useEffect(() => {
    if (!text) {
      return
    }

    if (visibleLength >= text.length) {
      onComplete?.()
      return
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleLength((current) => Math.min(current + 1, text.length))
    }, typingSpeedMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [text, typingSpeedMs, visibleLength, onComplete])

  const visibleChars = useMemo(() => text.slice(0, visibleLength).split(''), [text, visibleLength])
  const isTyping = visibleLength < text.length

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.p
          key={String(renderKey)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={`font-display ${sizeClass} leading-[1.05] tracking-tight text-emperor-gold hero-text-shadow`}
        >
          {visibleChars.map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {char}
            </motion.span>
          ))}
          <span className={`typewriter-cursor ${isTyping ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
            |
          </span>
        </motion.p>
      </AnimatePresence>

      {isLoading && (
        <div
          className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-emperor-gold/20 bg-emperor-charcoal/55 px-3 py-1.5"
          role="status"
          aria-live="polite"
        >
          <span className="text-[10px] uppercase tracking-[0.16em] text-emperor-gold/80">LINDA is thinking</span>
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-emperor-gold/80" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-emperor-gold/60" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-emperor-gold/45" />
        </div>
      )}
    </div>
  )
}
