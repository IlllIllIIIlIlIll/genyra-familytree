import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeName = 'rose' | 'ocean' | 'forest' | 'violet' | 'amber' | 'coral'

export const THEME_NAMES: readonly ThemeName[] = ['rose', 'ocean', 'forest', 'violet', 'amber', 'coral']

interface ThemeState {
  mode: ThemeMode
  theme: ThemeName
  setMode: (mode: ThemeMode) => void
  setTheme: (theme: ThemeName) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      theme: 'rose',
      setMode: (mode) => set({ mode }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'genyra-theme' },
  ),
)

/** Resolves a `ThemeMode` to an actual `'light' | 'dark'`, consulting the OS
 *  preference when the mode is `'system'`. */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}
