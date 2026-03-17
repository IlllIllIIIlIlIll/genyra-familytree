'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const LoginForm    = dynamic(() => import('@/components/auth/login-form').then(m => m.LoginForm),    { ssr: false })
const RegisterForm = dynamic(() => import('@/components/auth/register-form').then(m => m.RegisterForm), { ssr: false })

function AuthPageContent() {
  const params = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(
    params.get('tab') === 'register' ? 'register' : 'login',
  )
  const [pendingApproval, setPendingApproval] = useState(false)

  const handleRegisterSuccess = (usedInvite: boolean) => {
    setMode('login')
    setPendingApproval(usedInvite)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/genyra_logo.png" alt="Genyra" className="h-20 w-20 mx-auto mb-4" />
          {mode === 'register' && (
            <>
              <h1 className="text-2xl font-semibold text-slate-800">Create an account</h1>
              <p className="text-sm text-slate-500 mt-1">Register to start building</p>
            </>
          )}
        </div>

        {/* Pending approval notice */}
        {mode === 'login' && pendingApproval && (
          <div className="mb-5 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-center">
            <p className="text-sm font-medium text-brand-700">Registration submitted!</p>
            <p className="text-xs text-brand-500 mt-0.5">
              Waiting for the Family Head to approve your request.
            </p>
          </div>
        )}

        {/* Form */}
        {mode === 'login'
          ? <LoginForm />
          : <RegisterForm onSuccess={handleRegisterSuccess} />
        }

        {/* Toggle link */}
        <p className="text-center text-sm text-slate-500 mt-4">
          {mode === 'login' ? (
            <>
              New family member?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setPendingApproval(false) }}
                className="text-brand-600 font-medium hover:underline"
              >
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-brand-600 font-medium hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>

      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  )
}
