'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
  extraWide?: boolean
  /**
   * Render a near-full-screen dialog on desktop (mobile is already
   * full-screen). Body becomes a flex column so children can use
   * `flex-1 min-h-0` to fill the available height.
   */
  fullScreen?: boolean
}

export function StModal({ title, onClose, children, wide, extraWide, fullScreen }: Props) {
  // Portal the modal to `document.body` so it overlays the entire viewport
  // regardless of where it is mounted in the React tree. Without this,
  // ancestors that create a containing block for fixed elements (anything
  // with a `transform`, `filter`, `backdrop-filter`, `perspective`, etc.,
  // such as the `.fade-up` animation on `RaidBlock`) trap the modal inside
  // their own bounds.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Outer dialog sizing on >= sm. Mobile (`<sm`) always renders edge-to-edge
  // via `w-full h-full`; the `sm:` variants take over from 640 px upward.
  let dialogSizeClass: string
  if (fullScreen) {
    dialogSizeClass =
      'sm:w-[95vw] sm:max-w-[1200px] sm:h-[92vh] sm:max-h-[95vh]'
  } else if (extraWide) {
    dialogSizeClass = 'sm:w-[85vw] sm:max-w-[860px] sm:h-auto sm:max-h-[90vh]'
  } else if (wide) {
    dialogSizeClass = 'sm:w-auto sm:max-w-[700px] sm:h-auto sm:max-h-[90vh]'
  } else {
    dialogSizeClass = 'sm:w-auto sm:max-w-[480px] sm:h-auto sm:max-h-[90vh]'
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/75 flex items-stretch sm:items-center justify-center p-0 sm:p-5 overflow-hidden"
      onClick={onClose}
    >
      <div
        className={`bg-card border-0 sm:border sm:border-border2 sm:rounded-2xl w-full h-full overflow-hidden overscroll-contain shadow-[0_24px_60px_rgba(0,0,0,0.65)] flex flex-col ${dialogSizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-card border-b border-border flex justify-between items-center px-5 py-4 sm:px-6 sm:py-4">
          <span className="font-bold text-base truncate pr-3">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-transparent border-0 text-muted hover:text-text cursor-pointer text-xl leading-none w-9 h-9 inline-flex items-center justify-center rounded-md hover:bg-card2 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
        <div
          className={`px-5 py-4 sm:px-6 sm:py-5 ${
            fullScreen
              ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
              : 'flex-1 overflow-auto overscroll-contain'
          }`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
