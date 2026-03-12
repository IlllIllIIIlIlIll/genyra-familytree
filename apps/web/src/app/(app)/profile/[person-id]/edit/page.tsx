'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FONT } from '@/lib/design-tokens'

export default function EditProfilePage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col bg-stone-50">

      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-stone-200">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Back
        </button>
        <h1 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-700')}>Edit Profile</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-stone-300">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </div>
        <p className={cn(FONT.HEADING_SM, 'font-semibold text-slate-400')}>Edit Profile</p>
        <p className={cn(FONT.BODY, 'text-slate-300 text-center max-w-xs')}>
          Profile editing is coming soon. You&apos;ll be able to update personal details, add photos, and more.
        </p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-2">
          ← Go Back
        </Button>
      </div>
    </div>
  )
}
