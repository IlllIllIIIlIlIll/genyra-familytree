'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/map-store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const familyGroupId = useAuthStore((s) => s.familyGroupId)

  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const isSetupPage = pathname === '/setup'
  const isJoinPage = pathname === '/join'
  const isOnboarding = isSetupPage || isJoinPage

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
    } else if (!familyGroupId && !isOnboarding) {
      router.push('/setup')
    }
  }, [accessToken, familyGroupId, isOnboarding, router])

  if (!accessToken) return null
  if (!familyGroupId && !isOnboarding) return null

  return (
    <div className="h-screen flex flex-col">
      {children}
    </div>
  )
}
