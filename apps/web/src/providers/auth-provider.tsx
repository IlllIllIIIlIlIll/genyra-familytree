'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/map-store'
import { apiClient } from '@/lib/api-client'
import { saveTokens } from '@/lib/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setUser, clear } = useAuthStore()

  useEffect(() => {
    if (!accessToken) return

    // Hydrate user info on mount
    apiClient
      .getMe()
      .then((user) => {
        setUser({
          userId: user.id,
          familyGroupId: user.familyGroupId,
          role: user.role,
        })
      })
      .catch(() => {
        clear()
      })
  }, [accessToken, setUser, clear])

  // Sync tokens to localStorage when store updates
  const { refreshToken } = useAuthStore()
  useEffect(() => {
    if (accessToken && refreshToken) {
      saveTokens(accessToken, refreshToken)
    }
  }, [accessToken, refreshToken])

  return <>{children}</>
}
