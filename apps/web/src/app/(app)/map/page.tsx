'use client'

import { FamilyMapCanvas } from '@/components/family-map/family-map-canvas'
import { useAuthStore } from '@/store/map-store'

export default function MapPage() {
  const familyGroupId = useAuthStore((s) => s.familyGroupId)

  if (!familyGroupId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">No family group found.</p>
      </div>
    )
  }

  return <FamilyMapCanvas familyGroupId={familyGroupId} />
}
