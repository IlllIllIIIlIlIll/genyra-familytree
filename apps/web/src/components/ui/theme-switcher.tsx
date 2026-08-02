'use client'

import { useState } from 'react'
import { THEME_NAMES, useThemeStore, type ThemeMode, type ThemeName } from '@/store/theme-store'
import { cn } from '@/lib/utils'

// Mid-tone (500) preview colour per theme — mirrors the oklch hue values
// defined in globals.css. Kept in sync manually since swatches must show
// every theme's colour regardless of which theme is currently active.
const THEME_SWATCH_COLOR: Record<ThemeName, string> = {
  rose:   'oklch(0.62 0.18 350)',
  ocean:  'oklch(0.62 0.18 250)',
  forest: 'oklch(0.62 0.18 160)',
  violet: 'oklch(0.62 0.18 290)',
  amber:  'oklch(0.62 0.18 60)',
  coral:  'oklch(0.62 0.18 20)',
}

const THEME_LABEL: Record<ThemeName, string> = {
  rose:   'Rose',
  ocean:  'Ocean',
  forest: 'Forest',
  violet: 'Violet',
  amber:  'Amber',
  coral:  'Coral',
}

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light',  label: 'Light' },
  { value: 'dark',   label: 'Dark' },
  { value: 'system', label: 'Auto' },
]

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  )
}

/** Small popover: dark/light/system toggle + accent theme swatches.
 *  Drop-in trigger, consistent with the icon-button style used throughout
 *  the map header and admin dashboard. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const mode = useThemeStore((s) => s.mode)
  const theme = useThemeStore((s) => s.theme)
  const setMode = useThemeStore((s) => s.setMode)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-slate-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        title="Appearance"
        aria-label="Appearance settings"
      >
        {mode === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-[41] w-64 bg-white dark:bg-stone-900 rounded-xl shadow-lg border border-stone-100 dark:border-stone-800 p-3 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">Appearance</p>
              <div className="flex gap-1 bg-stone-50 dark:bg-stone-800 rounded-lg p-1">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={cn(
                      'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                      mode === m.value
                        ? 'bg-white dark:bg-stone-700 text-slate-800 dark:text-stone-100 shadow-sm'
                        : 'text-slate-500 dark:text-stone-400 hover:text-slate-700 dark:hover:text-stone-200',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">Accent colour</p>
              <div className="flex flex-wrap gap-2">
                {THEME_NAMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    title={THEME_LABEL[t]}
                    aria-label={THEME_LABEL[t]}
                    aria-pressed={theme === t}
                    className={cn(
                      'w-7 h-7 rounded-full shrink-0 transition-transform',
                      theme === t
                        ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-stone-900 dark:ring-stone-400 scale-105'
                        : 'hover:scale-105',
                    )}
                    style={{ backgroundColor: THEME_SWATCH_COLOR[t] }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
