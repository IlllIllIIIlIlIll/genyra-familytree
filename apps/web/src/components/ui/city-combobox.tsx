'use client'

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { FONT } from '@/lib/design-tokens'

interface CityResult {
  place_id: number
  display_name: string
  name: string
  address: {
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    country?: string
  }
}

function formatCity(r: CityResult): string {
  const { address } = r
  const city = address.city ?? address.town ?? address.village ?? r.name
  const parts = [city, address.state, address.country].filter(Boolean)
  return parts.join(', ')
}

interface CityComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CityCombobox({
  value,
  onChange,
  placeholder = 'Search city…',
  disabled,
  className,
}: CityComboboxProps) {
  const [inputValue, setInputValue] = useState(value)
  const [results, setResults] = useState<CityResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&featuretype=city`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      if (!res.ok) return
      const data = await res.json() as CityResult[]
      setResults(data)
      setOpen(data.length > 0)
      setActiveIdx(-1)
    } catch {
      // silently ignore network errors
    }
  }, [])

  function handleInput(val: string) {
    setInputValue(val)
    onChange(val) // keep form field synced with typed text
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void search(val) }, 400)
  }

  function selectResult(r: CityResult) {
    const formatted = formatCity(r)
    setInputValue(formatted)
    onChange(formatted)
    setOpen(false)
    setResults([])
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      const r = results[activeIdx]
      if (r) selectResult(r)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5',
          'text-sm text-slate-800 placeholder:text-slate-300',
          'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-shadow',
          className,
        )}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-stone-100 shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {results.map((r, idx) => (
            <li key={r.place_id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectResult(r) }}
                className={cn(
                  'w-full text-left px-3 py-2 transition-colors',
                  FONT.BODY,
                  idx === activeIdx ? 'bg-brand-50 text-brand-700' : 'hover:bg-stone-50 text-slate-700',
                )}
              >
                {formatCity(r)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
