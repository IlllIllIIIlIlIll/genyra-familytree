'use client'

import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.89c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.89-3c-1.08.72-2.46 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.92H1.28v3.09A11.998 11.998 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.31 14.32A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.38-2.32V6.59H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.41l4.03-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.59l4.03 3.09C6.25 6.85 8.89 4.75 12 4.75Z" />
    </svg>
  )
}

export function LoginForm() {
  const handleGoogleSignIn = () => {
    window.location.href = apiClient.googleLoginUrl()
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        size="lg"
        className="w-full bg-white dark:bg-stone-900 text-slate-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon />
        Sign in with Google
      </Button>

      <Link href="/demo" className="w-full">
        <Button type="button" variant="ghost" size="lg" className="w-full">
          Try the demo instead
        </Button>
      </Link>
    </div>
  )
}
