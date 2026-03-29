'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { FONT } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function PublicSharePage() {
  const params = useParams()
  const token  = params['token'] as string

  const { data, isLoading, isError } = useQuery({
    queryKey: ['share', token],
    queryFn:  () => apiClient.getPublicMapData(token),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-2 border-brand-400 border-t-transparent mx-auto mb-3" />
          <p className={cn(FONT.BODY, 'text-slate-400')}>Loading family tree…</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8">
        <div className="text-center max-w-sm">
          <p className={cn(FONT.HEADING_SM, 'font-semibold text-slate-600 mb-2')}>Link expired or invalid</p>
          <p className={cn(FONT.BODY, 'text-slate-400')}>
            This share link may have expired (links are valid for 30 days) or been revoked. Ask the family head to generate a new one.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
        <img src="/genyra_logo.png" alt="Genyra" className="h-7 w-7" />
        <div>
          <h1 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-800')}>{data.familyName}</h1>
          <p className={cn(FONT.LABEL, 'text-slate-400')}>Read-only family tree</p>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.nodes.filter((n) => !n.isPlaceholder).map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3 text-center">
              <div className={cn(
                'w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold',
                n.gender === 'MALE' ? 'bg-sky-100 text-sky-600' : n.gender === 'FEMALE' ? 'bg-rose-100 text-rose-500' : 'bg-stone-100 text-slate-500',
              )}>
                {n.displayName.charAt(0).toUpperCase()}
              </div>
              <p className={cn(FONT.BODY, 'font-semibold text-slate-800 truncate')}>{n.displayName}</p>
              {n.surname && <p className={cn(FONT.LABEL, 'text-slate-400 truncate')}>{n.surname}</p>}
              {n.birthDate && (
                <p className={cn(FONT.LABEL, 'text-slate-300 mt-0.5')}>
                  {new Date(n.birthDate).getFullYear()}
                  {n.isDeceased && n.deathDate ? ` – ${new Date(n.deathDate).getFullYear()}` : ''}
                  {n.isDeceased && !n.deathDate ? ' †' : ''}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className={cn(FONT.LABEL, 'text-slate-300 text-center mt-8')}>
          Powered by Genyra · Read-only view
        </p>
      </div>
    </div>
  )
}
