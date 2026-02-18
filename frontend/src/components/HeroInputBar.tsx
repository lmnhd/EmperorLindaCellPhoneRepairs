'use client'

import { FormEvent, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUp, Mic } from 'lucide-react'
import type { HeroInputBarProps } from '@/types/chat'

export default function HeroInputBar({ isLoading, disabled = false, onSend, onMicClick }: HeroInputBarProps) {
  const [value, setValue] = useState('')

  const canSend = value.trim().length > 0 && !isLoading && !disabled

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSend) {
      return
    }

    const nextMessage = value.trim()
    setValue('')
    await onSend(nextMessage)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: 0.25 }}
      className="w-full max-w-2xl"
    >
      <form
        onSubmit={handleSubmit}
        className="glass-panel flex items-center gap-2 rounded-full border-emperor-gold/25 bg-emperor-slate/55 px-3 py-3 shadow-2xl shadow-black/40"
      >
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Start typing or click mic to talk"
          disabled={isLoading || disabled}
          className="h-12 flex-1 bg-transparent px-3 text-base text-emperor-cream placeholder:text-emperor-cream/45 focus:outline-none"
        />

        <button
          type="button"
          onClick={onMicClick}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-emperor-gold/30 bg-emperor-black/30 text-emperor-gold transition hover:bg-emperor-gold/20"
          aria-label="Activate microphone"
        >
          <Mic className="h-5 w-5" />
        </button>

        {canSend && (
          <motion.button
            type="submit"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emperor-gold text-emperor-black transition hover:bg-emperor-gold-light"
            aria-label="Send message"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </form>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emperor-cream/50">
        <Mic className="h-3.5 w-3.5 text-emperor-gold/80" />
        <span>Start typing or click mic to talk</span>
      </div>
    </motion.div>
  )
}
