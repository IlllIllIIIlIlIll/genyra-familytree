'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ProfileCard } from '@/components/profile/profile-card'

export default function PersonProfilePage() {
  const { 'person-id': personId } = useParams<{ 'person-id': string }>()

  const { data: node, isLoading } = useQuery({
    queryKey: ['person-node', personId],
    queryFn: () => apiClient.getPersonNode(personId),
    enabled: !!personId,
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Person not found.</p>
      </div>
    )
  }

  return <ProfileCard node={node} />
}
