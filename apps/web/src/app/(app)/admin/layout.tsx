'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/map-store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const role   = useAuthStore((s) => s.role)

  useEffect(() => {
    if (role && role !== 'FAMILY_HEAD') {
      router.push('/map')
    }
  }, [role, router])

  if (role !== 'FAMILY_HEAD') return null

  return <>{children}</>
}
