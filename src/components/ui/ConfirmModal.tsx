'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { lockBodyScroll } from '@/lib/body-scroll-lock'

type ConfirmTone = 'danger' | 'warning' | 'info'

interface ConfirmModalClassNames {
  overlay?: string
  dialog?: string
  eyebrow?: string
  title?: string
  message?: string
  body?: string
  footer?: string
  cancelButton?: string
  confirmButton?: string
}

interface ConfirmModalProps {
  open: boolean
  title: string
  message?: ReactNode
  eyebrow?: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  icon?: ReactNode
  isLoading?: boolean
  closeOnBackdrop?: boolean
  classNames?: ConfirmModalClassNames
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const toneStyles: Record<ConfirmTone, { icon: string; confirm: string }> = {
  danger: {
    icon: 'border-red/30 bg-red/10 text-red',
    confirm: 'bg-red text-white hover:bg-red/90 focus-visible:ring-red/45',
  },
  warning: {
    icon: 'border-gold/30 bg-gold/10 text-gold',
    confirm: 'bg-gold text-bg hover:bg-gold/90 focus-visible:ring-gold/45',
  },
  info: {
    icon: 'border-accent/30 bg-accent/10 text-accent',
    confirm: 'bg-accent text-white hover:bg-accent/90 focus-visible:ring-accent/45',
  },
}

export function ConfirmModal({
  open,
  title,
  message,
  eyebrow = 'Confirm action',
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon,
  isLoading = false,
  closeOnBackdrop = true,
  classNames,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false)
  const styles = toneStyles[tone]

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    return lockBodyScroll()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isLoading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isLoading, onCancel, open])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[400] flex items-center justify-center overflow-hidden bg-black/75 p-4 ${classNames?.overlay || ''}`}
      onClick={() => {
        if (closeOnBackdrop && !isLoading) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className={`w-full max-w-[440px] overflow-hidden rounded-2xl border border-border2 bg-card shadow-[0_24px_70px_rgba(0,0,0,0.7)] ${classNames?.dialog || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="flex gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-bold ${styles.icon}`}>
              {icon || '!'}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted ${classNames?.eyebrow || ''}`}>
                {eyebrow}
              </div>
              <h2 id="confirm-modal-title" className={`text-lg font-bold tracking-[-0.02em] text-text ${classNames?.title || ''}`}>
                {title}
              </h2>
              {message && (
                <div className={`mt-2 text-sm leading-6 text-muted2 ${classNames?.message || ''}`}>
                  {message}
                </div>
              )}
            </div>
          </div>
          {children && (
            <div className={`mt-5 rounded-xl border border-border bg-bg p-3 text-sm text-muted2 ${classNames?.body || ''}`}>
              {children}
            </div>
          )}
        </div>
        <div className={`flex flex-col-reverse gap-2 border-t border-border bg-card2/50 p-4 sm:flex-row sm:justify-end ${classNames?.footer || ''}`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={`rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60 ${classNames?.cancelButton || ''}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${styles.confirm} ${classNames?.confirmButton || ''}`}
          >
            {isLoading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
