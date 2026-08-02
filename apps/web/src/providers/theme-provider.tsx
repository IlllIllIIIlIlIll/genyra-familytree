'use client'

import { useEffect } from 'react'
import { resolveMode, useThemeStore } from '@/store/theme-store'

/** Applies the persisted theme (`data-theme`) and dark/light mode (`.dark`
 *  class) to <html> whenever the store changes or the OS preference changes
 *  (while in `'system'` mode). Mounted once in the root layout. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode)
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      root.classList.toggle('dark', resolveMode(mode) === 'dark')
    }
    apply()

    if (mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [mode])

  return <>{children}</>
}
