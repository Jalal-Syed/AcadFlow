import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Mobile: sheet from bottom. Desktop: centered dialog. */
}

const sizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={clsx(
          'relative w-full z-10',
          // Mobile: bottom sheet
          'rounded-t-3xl sm:rounded-2xl',
          // Desktop: centered
          sizes[size],
          'bg-surface border border-border/[0.09]',
          'shadow-[0_-8px_40px_rgba(0,0,0,0.5)] sm:shadow-[0_8px_40px_rgba(0,0,0,0.5)]',
          'max-h-[90dvh] overflow-y-auto'
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/[0.07]">
            <h2 className="text-text font-semibold text-base">{title}</h2>
            <button
              onClick={onClose}
              className="text-text/40 hover:text-text/80 transition-colors p-1 rounded-lg hover:bg-white/5"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
