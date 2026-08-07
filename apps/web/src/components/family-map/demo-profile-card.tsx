'use client'

import { Avatar } from '@/components/ui/avatar'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { PersonNode } from '@genyra/shared-types'

interface DemoProfileCardProps {
  node: PersonNode
}

/**
 * Read-only profile panel for the public demo. Deliberately does not reuse
 * the authenticated `ProfileCard` — that component navigates to
 * `/profile/[id]` (an authenticated route) and offers "Add child" (a save
 * action), neither of which apply here. Viewing a node's details is not a
 * "save", so no demo reminder is needed for this panel.
 */
export function DemoProfileCard({ node }: DemoProfileCardProps) {
  const birthYear = node.birthDate ? new Date(node.birthDate).getFullYear() : null
  const deathYear = node.deathDate ? new Date(node.deathDate).getFullYear() : null

  return (
    <div className="bg-white dark:bg-stone-900 rounded-t-3xl border-t border-stone-200 dark:border-stone-800 shadow-xl p-6 pb-safe animate-in slide-in-from-bottom-4 duration-200">
      <div className="w-10 h-1 bg-stone-200 dark:bg-stone-700 rounded-full mx-auto mb-4" />

      <div className="flex items-center gap-4 mb-2">
        <Avatar src={node.avatarUrl} name={node.displayName} size="xl" />
        <div className="flex-1 min-w-0">
          <h2 className={cn(FONT.HEADING_MD, 'font-bold text-slate-800 dark:text-stone-100 truncate')}>
            {node.displayName.length > MAX_CHARS.DISPLAY_NAME
              ? `${node.displayName.slice(0, MAX_CHARS.DISPLAY_NAME)}…`
              : node.displayName}
          </h2>
          {node.surname && (
            <p className={cn(FONT.LABEL, 'text-slate-500 dark:text-stone-400 font-medium')}>{node.surname}</p>
          )}
          {(birthYear ?? deathYear) && (
            <p className={cn(FONT.BODY, 'text-slate-500 dark:text-stone-400 mt-0.5')}>
              {birthYear}
              {node.isDeceased && deathYear ? ` – ${deathYear}` : ''}
              {node.isDeceased && !deathYear ? ' (deceased)' : ''}
            </p>
          )}
          {node.birthPlace && (
            <p className={cn(FONT.BODY, 'text-slate-500 dark:text-stone-400')}>{node.birthPlace}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-stone-500 italic">
        This is sample data for the demo — nothing here is saved.
      </p>
    </div>
  )
}
