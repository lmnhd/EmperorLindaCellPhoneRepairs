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
    }, speed)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [text, speed, visibleLength, onComplete])

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
          className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-emperor-gold hero-text-shadow"
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
        <div className="mt-8 h-1.5 w-48 rounded-full bg-emperor-gold/10 overflow-hidden" role="status" aria-live="polite">
          <div className="h-full w-1/2 shimmer" />
        </div>
      )}
    </div>
  )
}
