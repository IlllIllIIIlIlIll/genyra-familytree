'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/map-store'
import type { RelationshipType } from '@genyra/shared-types'

// Maps 422 error message prefixes from the API to human-readable text
const API_ERROR_LABELS: Record<string, string> = {
  SAME_SEX:      'Only opposite-sex marriages are allowed.',
  AGE_GAP:       'Spouses must be within 25 years of each other.',
  CONSANGUINITY: 'These two people share a blood ancestor within 3 generations.',
  MARRIED:       'This person already has a living spouse.',
}

function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg: string = error.response?.data?.message ?? ''
    for (const [prefix, label] of Object.entries(API_ERROR_LABELS)) {
      if (typeof msg === 'string' && msg.startsWith(prefix)) return label
    }
    if (typeof msg === 'string' && msg.length > 0) return msg
    if (error.response?.status === 409) return 'This relationship already exists.'
    if (error.response?.status === 404) return 'One or both people were not found.'
  }
  return 'Something went wrong. Please try again.'
}

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  PARENT_CHILD: 'Parent → Child',
  SPOUSE:       'Spouse',
  SIBLING:      'Sibling',
}

export default function RelationshipsPage() {
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const queryClient   = useQueryClient()

  const [sourceId, setSourceId]               = useState('')
  const [targetId, setTargetId]               = useState('')
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('SPOUSE')
  const [apiError, setApiError]               = useState<string | null>(null)

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn: () => apiClient.getMapData(familyGroupId!),
    enabled: !!familyGroupId,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createRelationship({ sourceId, targetId, relationshipType }),
    onSuccess: () => {
      setApiError(null)
      setSourceId('')
      setTargetId('')
      void queryClient.invalidateQueries({ queryKey: ['map-data'] })
    },
    onError: (error: unknown) => {
      setApiError(parseApiError(error))
    },
  })

  const nodes = mapData?.nodes ?? []

  const selectCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400'

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">Add Relationship</h1>

      <div className="bg-white rounded-2xl border border-brand-100 p-5 space-y-4">
        {/* Source person */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Person A</label>
          <select
            className={selectCls}
            value={sourceId}
            onChange={(e) => { setSourceId(e.target.value); setApiError(null) }}
          >
            <option value="">Select person…</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id} disabled={n.id === targetId}>
                {n.displayName}{n.surname ? ` ${n.surname}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Relationship type */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Relationship</label>
          <select
            className={selectCls}
            value={relationshipType}
            onChange={(e) => { setRelationshipType(e.target.value as RelationshipType); setApiError(null) }}
          >
            {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((t) => (
              <option key={t} value={t}>{RELATIONSHIP_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Target person */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {relationshipType === 'PARENT_CHILD' ? 'Child (Person B)' : 'Person B'}
          </label>
          <select
            className={selectCls}
            value={targetId}
            onChange={(e) => { setTargetId(e.target.value); setApiError(null) }}
          >
            <option value="">Select person…</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id} disabled={n.id === sourceId}>
                {n.displayName}{n.surname ? ` ${n.surname}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Validation error */}
        {apiError && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
            {apiError}
          </p>
        )}

        <button
          disabled={!sourceId || !targetId || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors"
        >
          {createMutation.isPending ? 'Saving…' : 'Add Relationship'}
        </button>
      </div>
    </div>
  )
}
