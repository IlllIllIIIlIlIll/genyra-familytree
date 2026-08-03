'use client'

import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Visual intent — 'danger' (red) for destructive actions, 'neutral' (slate) for lower-stakes ones like rejecting a request. */
  tone?: 'danger' | 'neutral'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Centered modal confirmation dialog for destructive/impactful admin actions
 *  (delete, unlink, deactivate, approve/reject requests). Backdrop click and
 *  Cancel both dismiss without side effects. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => { if (!isLoading) onCancel() }} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-100 dark:border-stone-800 p-5"
      >
        <h2 id="confirm-dialog-title" className="text-sm font-semibold text-slate-800 dark:text-stone-100">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-stone-400 mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'flex-1 py-2 text-xs font-medium text-white rounded-xl disabled:opacity-50 transition-colors',
              tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600',
            )}
          >
            {isLoading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
