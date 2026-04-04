import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'

export type ToastVariant = 'success' | 'warning' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number  // ms, default 3500; 0 = persistent
}

interface ToastItemProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  error:   <XCircle size={16} />,
  info:    <Info size={16} />,
}

const styles: Record<ToastVariant, string> = {
  success: 'border-[#2ED573]/30 text-[#2ED573]  bg-[rgba(46,213,115,0.1)]',
  warning: 'border-[#FFA502]/30 text-[#FFA502]  bg-[rgba(255,165,2,0.1)]',
  error:   'border-[#FF4757]/30 text-[#FF4757]  bg-[rgba(255,71,87,0.1)]',
  info:    'border-[#6C63FF]/30 text-[#6C63FF]  bg-[rgba(108,99,255,0.1)]',
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const variant = toast.variant ?? 'info'
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const dur = toast.duration ?? 3500
    if (dur === 0) return
    timerRef.current = setTimeout(() => onDismiss(toast.id), dur)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div
      className={clsx(
        'flex items-start gap-2.5 px-4 py-3 rounded-xl border',
        'backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
        'text-sm font-medium min-w-[220px] max-w-[340px]',
        'animate-slide-up',
        styles[variant]
      )}
      role="alert"
    >
      <span className="shrink-0 mt-0.5">{icons[variant]}</span>
      <p className="flex-1 text-text/90 font-normal leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-text/30 hover:text-text/60 mt-0.5 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

/** Mount <ToastContainer> once at the app root */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return createPortal(
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300]
                 flex flex-col gap-2 items-center pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  )
}

export default ToastContainer
