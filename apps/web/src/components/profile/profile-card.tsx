'use client'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { PersonNode } from '@genyra/shared-types'

interface ProfileCardProps {
  node: PersonNode
  onClose?: () => void
}

export function ProfileCard({ node, onClose }: ProfileCardProps) {
  const birthYear = node.birthDate ? new Date(node.birthDate).getFullYear() : null
  const deathYear = node.deathDate ? new Date(node.deathDate).getFullYear() : null

  return (
    <div className="bg-white rounded-t-3xl border-t border-brand-100 shadow-xl p-6 pb-safe animate-in slide-in-from-bottom-4 duration-200">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400"
          aria-label="Close"
        >
          ✕
        </button>
      )}

      <div className="flex items-center gap-4 mb-4">
        <Avatar src={node.avatarUrl} name={node.displayName} size="xl" />
        <div>
          <h2 className={cn(FONT.HEADING_MD, 'font-bold text-slate-800')}>
            {node.displayName.length > MAX_CHARS.DISPLAY_NAME ? `${node.displayName.slice(0, MAX_CHARS.DISPLAY_NAME)}…` : node.displayName}
          </h2>
          {(birthYear ?? deathYear) && (
            <p className={cn(FONT.BODY, 'text-slate-400 mt-0.5')}>
              {birthYear}
              {node.isDeceased && deathYear ? ` – ${deathYear}` : ''}
              {node.isDeceased && !deathYear ? ' (deceased)' : ''}
            </p>
          )}
          {node.birthPlace && (
            <p className={cn(FONT.BODY, 'text-slate-400')}>{node.birthPlace}</p>
          )}
        </div>
      </div>

      {node.bio && (
        <p className={cn(FONT.BODY, 'text-slate-600 leading-relaxed mb-4')}>
          {node.bio.length > MAX_CHARS.BIO_PREVIEW
            ? `${node.bio.slice(0, MAX_CHARS.BIO_PREVIEW)}…`
            : node.bio}
        </p>
      )}

      <div className="flex gap-3">
        <Button size="sm" variant="secondary" className="flex-1">
          View Full Profile
        </Button>
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      </div>
    </div>
  )
}
