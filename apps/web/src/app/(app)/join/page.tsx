'use client'

import { JoinForm } from '@/components/auth/join-form'

export default function JoinPage() {

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/genyra_logo.png"
            alt="Genyra"
            className="h-20 w-20 mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold text-slate-800">You're almost in</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your family invite code</p>
        </div>
        <JoinForm />
      </div>
    </main>
  )
}
