'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/map-store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter()
  const isAdmin = useAuthStore((s) => s.isAdmin)

  useEffect(() => {
    if (!isAdmin) {
      router.push('/map')
    }
  }, [isAdmin, router])

  if (!isAdmin) return null

  return <>{children}</>
}
