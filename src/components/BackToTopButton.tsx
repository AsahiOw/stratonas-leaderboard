'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 600)
    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateVisibility)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to the top"
      className="fade-up fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-card/95 px-3.5 py-2.5 text-xs font-bold text-accent shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:bottom-7 sm:right-7"
    >
      <ArrowUp size={16} aria-hidden /> Back to top
    </button>
  )
}
