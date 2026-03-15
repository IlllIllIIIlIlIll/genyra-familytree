'use client'

import dynamic from 'next/dynamic'

const RegisterForm = dynamic(() => import('@/components/auth/register-form').then(mod => mod.RegisterForm), { ssr: false })

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/genyra_logo.png"
            alt="Genyra"
            className="h-20 w-20 mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold text-slate-800">Create an account</h1>
          <p className="text-sm text-slate-500 mt-1">Register to start building</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  )
}
