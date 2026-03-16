'use client'

import { useToastStore, type ToastType } from '@/store/map-store'
import { cn } from '@/lib/utils'

const STRIPE: Record<ToastType, string> = {
  neutral: 'bg-slate-400',
  success: 'bg-green-500',
  error:   'bg-red-500',
}

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto flex items-stretch overflow-hidden',
            'rounded-lg shadow-lg bg-white border border-slate-100',
            'min-w-[220px] max-w-[320px] text-left',
            'animate-toast-in',
          )}
        >
          {/* Coloured stripe on the left */}
          <div className={cn('w-1.5 shrink-0', STRIPE[t.type])} />
          <p className="px-3 py-2.5 text-sm text-slate-700 flex-1 leading-snug">
            {t.message}
          </p>
        </button>
      ))}
    </div>
  )
}
