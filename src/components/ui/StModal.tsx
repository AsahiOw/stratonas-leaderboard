'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { lockBodyScroll } from '@/lib/body-scroll-lock'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
  extraWide?: boolean
  variant?: 'default' | 'planner'
  transitionState?: 'from-bottom' | 'rising' | 'to-bottom'
  /**
   * Render a near-full-screen dialog on desktop (mobile is already
   * full-screen). Body becomes a flex column so children can use
   * `flex-1 min-h-0` to fill the available height.
   */
  fullScreen?: boolean
}

export function StModal({ title, onClose, children, wide, extraWide, fullScreen, variant = 'default', transitionState }: Props) {
  // Portal the modal to `document.body` so it overlays the entire viewport
  // regardless of where it is mounted in the React tree. Without this,
  // ancestors that create a containing block for fixed elements (anything
  // with a `transform`, `filter`, `backdrop-filter`, `perspective`, etc.,
  // such as the `.fade-up` animation on `RaidBlock`) trap the modal inside
  // their own bounds.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    return lockBodyScroll()
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

  const planner = variant === 'planner'

  return createPortal(
    <div
      className={`fixed inset-0 z-[300] flex items-stretch justify-center overflow-hidden p-0 sm:items-center sm:p-5 ${
        planner ? 'bg-[rgba(13,13,19,0.72)] backdrop-blur-[3px]' : 'bg-black/75'
      } ${transitionState ? `st-modal-transition-backdrop-${transitionState}` : ''}`}
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full flex-col overflow-hidden overscroll-contain border-0 shadow-[0_24px_60px_rgba(0,0,0,0.65)] sm:rounded-2xl sm:border ${
          planner ? 'border-[#d8cdb8] bg-[#e8ddc8] shadow-[0_28px_70px_rgba(0,0,0,0.58)]' : 'border-border2 bg-card'
        } ${dialogSizeClass} ${transitionState ? `st-modal-transition-shell-${transitionState}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex shrink-0 items-center justify-between border-b px-5 py-4 sm:px-6 sm:py-4 ${
          planner ? 'border-[#cfc2aa] bg-[linear-gradient(90deg,#f8f2e5,#eee4d2)] text-[#302d3b]' : 'border-border bg-card'
        }`}>
          <span className="truncate pr-3 text-base font-bold">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-xl leading-none transition-colors ${
              planner ? 'text-[#807886] hover:bg-[#e1d4bd] hover:text-[#302d3b]' : 'text-muted hover:bg-card2 hover:text-text'
            }`}
          >
            ✕
          </button>
        </div>
        <div
          className={`px-5 py-4 sm:px-6 sm:py-5 ${planner ? 'bg-[#e8ddc8]' : ''} ${
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
