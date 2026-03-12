'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/map-store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const isJoinPage = typeof window !== 'undefined' && window.location.pathname === '/join'

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
    } else if (!familyGroupId && !isJoinPage) {
      router.push('/join')
    }
  }, [accessToken, familyGroupId, isJoinPage, router])

  if (!accessToken) return null
  if (!familyGroupId && !isJoinPage) return null

  return (
    <div className="h-screen flex flex-col">
      {children}
    </div>
  )
}
