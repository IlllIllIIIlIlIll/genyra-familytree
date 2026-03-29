'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/map-store'
import { computeGenerations } from '@/components/family-map/generation-utils'
import { FONT } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function StatsPage() {
  const router        = useRouter()
  const familyGroupId = useAuthStore((s) => s.familyGroupId)

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn:  () => apiClient.getMapData(familyGroupId!),
    enabled:  !!familyGroupId,
  })

  const stats = useMemo(() => {
    if (!mapData) return null
    const { nodes, edges, familyName } = mapData

    const real    = nodes.filter((n) => !n.isPlaceholder)
    const living  = real.filter((n) => !n.isDeceased)
    const deceased = real.filter((n) => n.isDeceased)
    const males   = real.filter((n) => n.gender === 'MALE')
    const females = real.filter((n) => n.gender === 'FEMALE')

    const withBirth = real.filter((n) => n.birthDate)
    const currentYear = new Date().getFullYear()

    const ages = withBirth.map((n) => {
      const birth  = new Date(n.birthDate!).getFullYear()
      const end    = n.deathDate ? new Date(n.deathDate).getFullYear() : currentYear
      return end - birth
    }).filter((a) => a >= 0 && a <= 120)

    const avgAge    = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null
    const oldest    = withBirth.length
      ? withBirth.reduce((a, b) => new Date(a.birthDate!).getFullYear() < new Date(b.birthDate!).getFullYear() ? a : b)
      : null
    const youngest  = withBirth.length
      ? withBirth.filter((n) => !n.isDeceased).reduce((a, b) =>
          new Date(a.birthDate!).getFullYear() > new Date(b.birthDate!).getFullYear() ? a : b
        , withBirth.filter((n) => !n.isDeceased)[0]!)
      : null

    const genMap          = computeGenerations(nodes, edges)
    const totalGenerations = genMap.size > 0 ? Math.max(...genMap.values()) + 1 : 1

    const spouseEdges  = edges.filter((e) => e.relationshipType === 'SPOUSE')
    const divorces     = spouseEdges.filter((e) => e.divorceDate !== null).length

    return {
      familyName,
      total:    real.length,
      living:   living.length,
      deceased: deceased.length,
      males:    males.length,
      females:  females.length,
      avgAge,
      oldest,
      youngest,
      totalGenerations,
      marriages: spouseEdges.length,
      divorces,
    }
  }, [mapData])

  return (
    <div className="flex-1 flex flex-col bg-stone-50 overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-stone-100 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-700 flex-1')}>Family Stats</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      ) : !stats ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className={cn(FONT.BODY, 'text-slate-400')}>No data available.</p>
        </div>
      ) : (
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
          <h2 className={cn(FONT.HEADING_MD, 'font-bold text-slate-800 text-center mt-2')}>{stats.familyName}</h2>

          {/* Overview grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Members" value={stats.total} color="brand" />
            <StatCard label="Living" value={stats.living} color="green" />
            <StatCard label="Generations" value={stats.totalGenerations} color="sky" />
            <StatCard label="Deceased" value={stats.deceased} color="slate" />
          </div>

          {/* Gender breakdown */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <p className={cn(FONT.LABEL, 'text-slate-400 uppercase tracking-wide mb-3')}>Gender</p>
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-sky-600">{stats.males}</p>
                <p className={cn(FONT.LABEL, 'text-slate-400')}>♂ Male</p>
              </div>
              <div className="w-px bg-stone-100" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-rose-500">{stats.females}</p>
                <p className={cn(FONT.LABEL, 'text-slate-400')}>♀ Female</p>
              </div>
            </div>
            {stats.total > 0 && (
              <div className="mt-3 h-2 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full"
                  style={{ width: `${(stats.males / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Age & dates */}
          {(stats.avgAge !== null || stats.oldest || stats.youngest) && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
              <p className={cn(FONT.LABEL, 'text-slate-400 uppercase tracking-wide')}>Ages</p>
              {stats.avgAge !== null && (
                <div className="flex items-center justify-between">
                  <span className={cn(FONT.BODY, 'text-slate-600')}>Average age</span>
                  <span className={cn(FONT.BODY, 'font-semibold text-slate-800')}>{stats.avgAge} yrs</span>
                </div>
              )}
              {stats.oldest && (
                <div className="flex items-center justify-between">
                  <span className={cn(FONT.BODY, 'text-slate-600')}>Oldest</span>
                  <span className={cn(FONT.BODY, 'font-semibold text-slate-800 truncate max-w-[160px]')} title={stats.oldest.displayName}>
                    {stats.oldest.displayName} ({new Date(stats.oldest.birthDate!).getFullYear()})
                  </span>
                </div>
              )}
              {stats.youngest && (
                <div className="flex items-center justify-between">
                  <span className={cn(FONT.BODY, 'text-slate-600')}>Youngest living</span>
                  <span className={cn(FONT.BODY, 'font-semibold text-slate-800 truncate max-w-[160px]')} title={stats.youngest.displayName}>
                    {stats.youngest.displayName} ({new Date(stats.youngest.birthDate!).getFullYear()})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Relationships */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
            <p className={cn(FONT.LABEL, 'text-slate-400 uppercase tracking-wide')}>Relationships</p>
            <div className="flex items-center justify-between">
              <span className={cn(FONT.BODY, 'text-slate-600')}>Marriages</span>
              <span className={cn(FONT.BODY, 'font-semibold text-slate-800')}>{stats.marriages}</span>
            </div>
            {stats.divorces > 0 && (
              <div className="flex items-center justify-between">
                <span className={cn(FONT.BODY, 'text-slate-600')}>Divorces</span>
                <span className={cn(FONT.BODY, 'font-semibold text-slate-800')}>{stats.divorces}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'brand' | 'green' | 'sky' | 'slate'
}) {
  const colorMap = {
    brand: 'text-brand-600 bg-brand-50',
    green: 'text-emerald-600 bg-emerald-50',
    sky:   'text-sky-600 bg-sky-50',
    slate: 'text-slate-500 bg-stone-50',
  }
  return (
    <div className={cn('rounded-2xl border border-stone-100 shadow-sm p-4 text-center', 'bg-white')}>
      <p className={cn('text-3xl font-bold', colorMap[color]?.split(' ')[0])}>{value}</p>
      <p className={cn(FONT.LABEL, 'text-slate-400 mt-1')}>{label}</p>
    </div>
  )
}
