'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/map-store'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const params        = useParams()
  const router        = useRouter()
  const personId      = params['person-id'] as string
  const familyGroupId = useAuthStore((s) => s.familyGroupId)

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn:  () => apiClient.getMapData(familyGroupId!),
    enabled:  !!familyGroupId,
  })

  const node = mapData?.nodes.find((n) => n.id === personId)

  const birthYear = node?.birthDate ? new Date(node.birthDate).getFullYear() : null
  const deathYear = node?.deathDate ? new Date(node.deathDate).getFullYear() : null

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  if (!node) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-stone-50 p-8">
        <p className="text-slate-400">Person not found.</p>
        <Button variant="secondary" onClick={() => router.back()}>← Back</Button>
      </div>
    )
  }

  const headerBg = node.gender === 'MALE'
    ? 'bg-sky-50 border-sky-100'
    : node.gender === 'FEMALE'
      ? 'bg-rose-50 border-rose-100'
      : 'bg-stone-50 border-stone-100'

  return (
    <div className="flex-1 flex flex-col bg-stone-50 overflow-y-auto">

      {/* Header */}
      <div className={cn('border-b px-4 pt-10 pb-6', headerBg)}>
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 mb-4 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex items-end gap-4">
          <Avatar src={node.avatarUrl} name={node.displayName} size="xl" />
          <div className="pb-1 min-w-0">
            <h1 className={cn(FONT.HEADING_LG, 'font-bold text-slate-800 leading-tight truncate')}>
              {node.displayName.length > MAX_CHARS.DISPLAY_NAME
                ? `${node.displayName.slice(0, MAX_CHARS.DISPLAY_NAME)}…`
                : node.displayName}
            </h1>
            {node.surname && (
              <p className={cn(FONT.LABEL, 'text-slate-500 font-medium mt-0.5')}>{node.surname}</p>
            )}
            {(birthYear ?? deathYear) && (
              <p className={cn(FONT.BODY, 'text-slate-400 mt-1')}>
                {birthYear}
                {node.isDeceased && deathYear ? ` – ${deathYear}` : ''}
                {node.isDeceased && !deathYear ? ' (deceased)' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50">
          {node.birthPlace && (
            <ProfileRow label="Birth place" value={node.birthPlace} />
          )}
          {node.birthDate && (
            <ProfileRow
              label="Date of birth"
              value={new Date(node.birthDate).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
          )}
          {node.deathDate && (
            <ProfileRow
              label="Date of death"
              value={new Date(node.deathDate).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
          )}
          {node.nik && <ProfileRow label="NIK" value={node.nik} />}
          {node.gender && (
            <ProfileRow label="Gender" value={node.gender === 'MALE' ? 'Male' : 'Female'} />
          )}
        </div>

        {node.bio && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">About</p>
            <p className={cn(FONT.BODY, 'text-slate-700 leading-relaxed')}>{node.bio}</p>
          </div>
        )}

        {/* Coming-soon placeholder */}
        <div className="rounded-2xl border border-dashed border-stone-200 p-5 text-center bg-white/50">
          <p className={cn(FONT.LABEL, 'text-slate-300 font-medium')}>Photos · Relationships · Timeline</p>
          <p className="text-[10px] text-slate-200 mt-1 tracking-wide uppercase">More to add soon</p>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => router.push(`/profile/${node.id}/edit`)}
        >
          Edit Profile
        </Button>
      </div>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className={cn(FONT.LABEL, 'text-slate-400 shrink-0')}>{label}</span>
      <span className={cn(FONT.LABEL, 'text-slate-700 text-right truncate')}>{value}</span>
    </div>
  )
}
