'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { FONT } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { AuditLogEntry } from '@genyra/shared-types'

// Human-readable label for the raw action string returned by the backend
// (e.g. "DELETE_PERSON_NODE" -> "Delete person node").
function formatAction(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminActivityPage() {
  const router = useRouter()

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn:  () => apiClient.admin.getAuditLog(),
  })

  return (
    <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950 overflow-y-auto pb-20 min-h-dvh">
      <div className="flex items-center gap-3 px-4 py-4 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-slate-500 dark:text-stone-400 hover:text-slate-700 dark:hover:text-stone-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-700 dark:text-stone-200 flex-1')}>Activity</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-4">
        <p className="text-xs text-slate-500 dark:text-stone-400">
          Most recent {entries.length >= 100 ? '100 ' : ''}actions taken on this family, newest first.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-stone-400 text-center py-10">No activity recorded yet.</p>
        ) : (
          <ul className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm divide-y divide-stone-50 dark:divide-stone-800 overflow-hidden">
            {entries.map((entry: AuditLogEntry) => (
              <li key={entry.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-stone-100">{formatAction(entry.action)}</p>
                  <p className="text-[10px] text-slate-400 dark:text-stone-500 shrink-0 whitespace-nowrap mt-0.5">{formatTimestamp(entry.createdAt)}</p>
                </div>
                {entry.targetId && (
                  <p className="text-[10px] text-slate-400 dark:text-stone-500 font-mono mt-0.5 truncate">Target: {entry.targetId}</p>
                )}
                {entry.details && (
                  <p className="text-xs text-slate-500 dark:text-stone-400 mt-1 leading-relaxed">{entry.details}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
