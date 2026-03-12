'use client'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { PersonNode } from '@genyra/shared-types'

interface ProfileCardProps {
  node: PersonNode
}

export function ProfileCard({ node }: ProfileCardProps) {
  const router = useRouter()
  const birthYear = node.birthDate ? new Date(node.birthDate).getFullYear() : null
  const deathYear = node.deathDate ? new Date(node.deathDate).getFullYear() : null

  return (
    <div className="bg-white rounded-t-3xl border-t border-stone-200 shadow-xl p-6 pb-safe animate-in slide-in-from-bottom-4 duration-200">
      {/* Drag handle / tap-to-close hint */}
      <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4" />

      <div className="flex items-center gap-4 mb-4">
        <Avatar src={node.avatarUrl} name={node.displayName} size="xl" />
        <div className="flex-1 min-w-0">
          <h2 className={cn(FONT.HEADING_MD, 'font-bold text-slate-800 truncate')}>
            {node.displayName.length > MAX_CHARS.DISPLAY_NAME
              ? `${node.displayName.slice(0, MAX_CHARS.DISPLAY_NAME)}…`
              : node.displayName}
          </h2>
          {node.surname && (
            <p className={cn(FONT.LABEL, 'text-slate-500 font-medium')}>{node.surname}</p>
          )}
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

      <div className="flex gap-3 mb-4">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => router.push(`/profile/${node.id}`)}
        >
          View Full Profile
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push(`/profile/${node.id}/edit`)}
        >
          Edit
        </Button>
      </div>

      {/* Coming-soon features teaser */}
      <p className={cn(FONT.NODE_BADGE, 'text-center text-slate-300 tracking-wide uppercase')}>
        Photos · Timeline · Family tree export — more to add soon
      </p>
    </div>
  )
}
