'use client'

import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/store/map-store'
import { apiClient } from '@/lib/api-client'
import { saveTokens } from '@/lib/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAdmin, accountId, setUser, clear } = useAuthStore()

  useEffect(() => {
    if (!accessToken) return

    // We already know whether this is an admin or personal session from the
    // persisted store (set at login time via select-admin / select-nik), so
    // we can validate against the right endpoint on a cold page load.
    if (isAdmin) {
      apiClient.admin
        .getFamily()
        .then(() => {
          // Session is alive; nothing else to hydrate for admins.
        })
        .catch((err: unknown) => {
          // 404 just means the admin hasn't created their family yet —
          // the session itself is still valid.
          if (axios.isAxiosError(err) && err.response?.status === 404) return
          clear()
        })
    } else {
      apiClient
        .getMe()
        .then((user) => {
          setUser({
            accountId: accountId ?? '',
            isAdmin: false,
            nik: user.nik,
            familyGroupId: user.familyGroupId,
          })
        })
        .catch(() => {
          clear()
        })
    }
    // Only re-run when the access token itself changes — isAdmin/accountId
    // are read from the store at that moment, not treated as reactive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, clear])

  // Sync tokens to localStorage when store updates
  const { refreshToken } = useAuthStore()
  useEffect(() => {
    if (accessToken && refreshToken) {
      saveTokens(accessToken, refreshToken)
    }
  }, [accessToken, refreshToken])

  return <>{children}</>
}
