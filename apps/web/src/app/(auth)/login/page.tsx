'use client'

import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/genyra_logo.png"
            alt="Genyra"
            className="h-20 w-20 mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold text-slate-800">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your family tree</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-slate-500 mt-4">
          New family member?{' '}
          <a href="/register" className="text-brand-600 font-medium hover:underline">
            Join with an invite code
          </a>
        </p>
      </div>
    </main>
  )
}
