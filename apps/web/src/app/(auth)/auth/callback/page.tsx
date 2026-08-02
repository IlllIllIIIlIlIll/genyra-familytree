'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { saveTokens } from '@/lib/auth'
import { useAuthStore, useToastStore } from '@/store/map-store'
import type { AuthTokens, GoogleExchangeResponse, NikPersona } from '@genyra/shared-types'

function decodeJwtPayload(token: string): { sub: string; isAdmin: boolean; nik?: string; fid?: string } {
  return JSON.parse(atob(token.split('.')[1]!)) as { sub: string; isAdmin: boolean; nik?: string; fid?: string }
}

type Status = 'loading' | 'no-access' | 'select' | 'error'

function CallbackContent() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const code        = searchParams.get('code')
  const setTokens   = useAuthStore((s) => s.setTokens)
  const setUser     = useAuthStore((s) => s.setUser)
  const toast       = useToastStore((s) => s.toast)

  const [exchange, setExchange]         = useState<GoogleExchangeResponse | null>(null)
  const [status, setStatus]             = useState<Status>('loading')
  const [pendingNik, setPendingNik]     = useState<string | null>(null)

  const finalize = (tokens: AuthTokens) => {
    const payload = decodeJwtPayload(tokens.accessToken)
    saveTokens(tokens.accessToken, tokens.refreshToken)
    setTokens(tokens)
    setUser({
      accountId: payload.sub,
      isAdmin: payload.isAdmin,
      nik: payload.nik ?? null,
      familyGroupId: payload.fid ?? null,
    })
  }

  const selectAdminMutation = useMutation({
    mutationFn: (sessionToken: string) => apiClient.selectAdmin(sessionToken),
    onSuccess: (tokens) => {
      finalize(tokens)
      router.replace('/admin')
    },
    onError: () => {
      toast('Failed to sign in', 'error')
      setStatus('error')
    },
  })

  const selectNikMutation = useMutation({
    mutationFn: ({ sessionToken, nik, familyGroupId }: { sessionToken: string; nik: string; familyGroupId: string }) =>
      apiClient.selectNik(sessionToken, nik, familyGroupId),
    onSuccess: (tokens) => {
      finalize(tokens)
      router.replace('/map')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to sign in'
      toast(msg, 'error')
      setStatus(exchange && exchange.personas.length > 0 ? 'select' : 'error')
    },
  })

  useEffect(() => {
    if (!code) {
      setStatus('error')
      return
    }
    apiClient
      .exchangeGoogleCode(code)
      .then((res) => {
        setExchange(res)
        if (res.isAdmin) {
          selectAdminMutation.mutate(res.sessionToken)
          return
        }
        if (res.personas.length === 0) {
          setStatus('no-access')
          return
        }
        if (res.personas.length === 1 && res.personas[0]!.families.length === 1) {
          const persona = res.personas[0]!
          setPendingNik(persona.nik)
          selectNikMutation.mutate({
            sessionToken: res.sessionToken,
            nik: persona.nik,
            familyGroupId: persona.families[0]!.id,
          })
          return
        }
        setStatus('select')
      })
      .catch(() => {
        toast('Google sign-in failed', 'error')
        setStatus('error')
      })
    // Run once on mount with the code from the URL — mutations are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const handleSelectFamily = (nik: string, familyGroupId: string) => {
    if (!exchange) return
    setPendingNik(nik)
    selectNikMutation.mutate({ sessionToken: exchange.sessionToken, nik, familyGroupId })
  }

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-brand-400 border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-slate-500 dark:text-stone-400">Signing you in…</p>
      </div>
    )
  }

  if (status === 'no-access') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-brand-100 dark:border-stone-800 p-8">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-stone-100 mb-2">No family access yet</h1>
          <p className="text-sm text-slate-500 dark:text-stone-400 leading-relaxed">
            Your Google account isn&apos;t linked to a family member yet. Ask your family admin
            to link your email to your NIK to get access.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900 p-8">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-stone-100 mb-2">Sign-in failed</h1>
          <p className="text-sm text-slate-500 dark:text-stone-400 leading-relaxed">
            Something went wrong signing you in. Please go back and try again.
          </p>
        </div>
      </div>
    )
  }

  // status === 'select'
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-stone-100">Choose your profile</h1>
        <p className="text-sm text-slate-500 dark:text-stone-400 mt-1">Select who you are and which family to enter</p>
      </div>
      <div className="space-y-3">
        {exchange?.personas.map((persona: NikPersona) => (
          <div key={persona.nik} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-4">
            <p className="font-semibold text-slate-800 dark:text-stone-100 text-sm mb-2">{persona.displayName}</p>
            <div className="space-y-1.5">
              {persona.families.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFamily(persona.nik, f.id)}
                  disabled={selectNikMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 hover:bg-brand-50 dark:hover:bg-stone-700 rounded-xl text-slate-700 dark:text-stone-200 transition-colors disabled:opacity-50"
                >
                  {f.name}
                  {selectNikMutation.isPending && pendingNik === persona.nik ? ' …' : ''}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-brand-50 dark:bg-stone-950">
      <Suspense>
        <CallbackContent />
      </Suspense>
    </main>
  )
}
