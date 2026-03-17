'use client'

import dynamic from 'next/dynamic'

const LoginForm = dynamic(() => import('@/components/auth/login-form').then(mod => mod.LoginForm), { ssr: false })

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
        </div>
        <LoginForm />
        <p className="text-center text-sm text-slate-500 mt-4">
          New family member?{' '}
          <a href="/register" className="text-brand-600 font-medium hover:underline">
            Register here
          </a>
        </p>
      </div>
    </main>
  )
}
