'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, MessageSquareText, X } from 'lucide-react'
import type { ChatMessage } from '@/types/chat'

interface UserMessagePanelProps {
  messages: ChatMessage[]
}

export default function UserMessagePanel({ messages }: UserMessagePanelProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showMobileFab, setShowMobileFab] = useState(true)
  const desktopPanelBodyRef = useRef<HTMLDivElement>(null)
  const mobilePanelBodyRef = useRef<HTMLDivElement>(null)

  const historyMessages = messages

  useEffect(() => {
    if (desktopPanelBodyRef.current) {
      desktopPanelBodyRef.current.scrollTop = desktopPanelBodyRef.current.scrollHeight
    }
    if (mobilePanelBodyRef.current) {
      mobilePanelBodyRef.current.scrollTop = mobilePanelBodyRef.current.scrollHeight
    }
  }, [historyMessages.length])

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 1023px)')

    const syncFabVisibility = () => {
      if (!mobileQuery.matches) {
        setShowMobileFab(true)
        return
      }

      setShowMobileFab(window.scrollY < 24)
    }

    syncFabVisibility()
    window.addEventListener('scroll', syncFabVisibility, { passive: true })

    return () => {
      window.removeEventListener('scroll', syncFabVisibility)
    }
  }, [])

  return (
    <>
      <div className="absolute left-4 top-4 z-30 hidden sm:left-6 sm:top-5 lg:left-8 lg:top-5 lg:block">
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
          className="relative"
        >
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="absolute -right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-emperor-gold/30 bg-emperor-charcoal/90 text-emperor-gold hover:bg-emperor-gold/20 transition"
            aria-label={collapsed ? 'Expand message panel' : 'Collapse message panel'}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence mode="wait">
            {collapsed ? (
              <motion.button
                key="collapsed"
                type="button"
                onClick={() => setCollapsed(false)}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="glass-panel flex items-center gap-2 px-4 py-2.5"
              >
                <MessageSquareText className="h-4 w-4 text-emperor-gold" />
                <span className="text-xs uppercase tracking-[0.15em] text-emperor-cream/70">Messages</span>
                <span className="rounded-full bg-emperor-gold px-2 py-0.5 text-[10px] font-semibold text-emperor-black">
                  {historyMessages.length}
                </span>
              </motion.button>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="glass-panel w-[18rem] overflow-hidden"
              >
                <div className="border-b border-emperor-gold/15 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emperor-gold/70">Your messages</p>
                  <p className="mt-1 text-xs text-emperor-cream/45">Conversation history</p>
                </div>

                <div ref={desktopPanelBodyRef} className="max-h-56 space-y-2 overflow-y-auto p-4">
                  {historyMessages.length === 0 ? (
                    <p className="text-xs text-emperor-cream/40">Messages will appear here.</p>
                  ) : (
                    <AnimatePresence initial={false}>
                      {historyMessages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.2 }}
                          className={`rounded-xl border px-3 py-2 ${
                            message.role === 'user'
                              ? 'border-emperor-gold/10 bg-emperor-black/30'
                              : 'border-accent-blue/20 bg-accent-blue/5'
                          }`}
                        >
                          <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-emperor-cream/45">
                            {message.role === 'user' ? 'You' : 'Linda'}
                          </p>
                          <p className="text-sm leading-relaxed text-emperor-cream/85">{message.content}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div
        className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 lg:hidden transition-all duration-200 ${showMobileFab ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="glass-panel flex items-center gap-2 rounded-full px-3 py-2"
          aria-label="Open message history"
        >
          <MessageSquareText className="h-3.5 w-3.5 text-emperor-gold" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-emperor-cream/75">History</span>
          <span className="rounded-full bg-emperor-gold px-1.5 py-0.5 text-[10px] font-semibold text-emperor-black">
            {historyMessages.length}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close message history"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-emperor-black/70 backdrop-blur-[2px] lg:hidden"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl border-t border-emperor-gold/20 bg-emperor-charcoal/95 p-4 shadow-2xl lg:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emperor-gold/70">Your messages</p>
                  <p className="mt-1 text-xs text-emperor-cream/45">Conversation history</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-emperor-gold/25 text-emperor-gold/80"
                  aria-label="Close message history"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div ref={mobilePanelBodyRef} className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                {historyMessages.length === 0 ? (
                  <p className="text-xs text-emperor-cream/40">Messages will appear here.</p>
                ) : (
                  <AnimatePresence initial={false}>
                    {historyMessages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className={`rounded-xl border px-3 py-2 ${
                          message.role === 'user'
                            ? 'border-emperor-gold/10 bg-emperor-black/35'
                            : 'border-accent-blue/20 bg-accent-blue/10'
                        }`}
                      >
                        <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-emperor-cream/45">
                          {message.role === 'user' ? 'You' : 'Linda'}
                        </p>
                        <p className="text-sm leading-relaxed text-emperor-cream/85">{message.content}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
