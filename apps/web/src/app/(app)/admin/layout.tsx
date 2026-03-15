'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/map-store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const role     = useAuthStore((s) => s.role)

  useEffect(() => {
    if (role && role !== 'FAMILY_HEAD') {
      router.push('/map')
    }
  }, [role, router])

  if (role !== 'FAMILY_HEAD') return null

  const navLinkCls = (href: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      pathname === href
        ? 'bg-brand-100 text-brand-700'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-3 flex gap-2">
        <Link href="/admin/approvals"     className={navLinkCls('/admin/approvals')}>Approvals</Link>
        <Link href="/admin/relationships" className={navLinkCls('/admin/relationships')}>Relationships</Link>
      </nav>
      {children}
    </div>
  )
}
