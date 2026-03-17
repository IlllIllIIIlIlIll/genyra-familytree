'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore, useMapUIStore } from '@/store/map-store'
import { cn } from '@/lib/utils'

function MapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const accessToken        = useAuthStore((s) => s.accessToken)
  const familyGroupId      = useAuthStore((s) => s.familyGroupId)
  const role               = useAuthStore((s) => s.role)
  const isProfilePanelOpen = useMapUIStore((s) => s.isProfilePanelOpen)
  const isCleanView        = useMapUIStore((s) => s.isCleanView)

  const isSetupPage   = pathname === '/setup'
  const isJoinPage    = pathname === '/join'
  const isOnboarding  = isSetupPage || isJoinPage
  const isFamilyHead  = role === 'FAMILY_HEAD'

  // Nav visible only for FAMILY_HEAD on main app pages, hidden in clean view or when profile is open
  const showNav = isFamilyHead && !!familyGroupId && !isOnboarding && !isCleanView && !isProfilePanelOpen

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
    } else if (!familyGroupId && !isOnboarding) {
      router.push('/setup')
    }
  }, [accessToken, familyGroupId, isOnboarding, router])

  if (!accessToken) return null
  if (!familyGroupId && !isOnboarding) return null

  return (
    <div className="h-screen flex flex-col">
      {children}

      {showNav && (
        <nav className="fixed bottom-0 inset-x-0 z-[9990] flex items-center justify-around bg-white/95 backdrop-blur border-t border-stone-200"
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <Link
            href="/map"
            className={cn(
              'flex flex-col items-center gap-0.5 px-8 py-3 text-xs font-medium transition-colors',
              pathname === '/map' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600',
            )}
          >
            <MapIcon />
            <span>Map</span>
          </Link>

          <Link
            href="/admin"
            className={cn(
              'flex flex-col items-center gap-0.5 px-8 py-3 text-xs font-medium transition-colors',
              pathname.startsWith('/admin') ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600',
            )}
          >
            <ShieldIcon />
            <span>Admin</span>
          </Link>
        </nav>
      )}
    </div>
  )
}
