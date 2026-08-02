'use client'

import dynamic from 'next/dynamic'

const LoginForm = dynamic(() => import('@/components/auth/login-form').then(m => m.LoginForm), { ssr: false })

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-brand-50 dark:bg-stone-950">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/genyra_logo.png" alt="Genyra" className="h-20 w-20 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-stone-100">Welcome to Genyra</h1>
          <p className="text-sm text-slate-500 dark:text-stone-400 mt-1">Sign in to view your family tree</p>
        </div>

        {/* Form */}
        <LoginForm />

        <p className="text-center text-xs text-slate-500 dark:text-stone-500 mt-6">
          Don&apos;t have access yet? Ask your family admin to link your Google account to your NIK.
        </p>

      </div>
    </main>
  )
}
