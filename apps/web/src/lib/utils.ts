import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Smart name abbreviation for card display.
 *
 * Rules (applied when fullName.length > limit):
 *   1. Find the word that *contains* surname as a substring (case-insensitive).
 *      That word is kept full; every other word is abbreviated to "X.".
 *      e.g. "Muhammad Favian Izza Diasputra" + surname "Vian" → "M. Favian I. D."
 *
 *   2. If no word contains the surname (or surname is absent), keep the last
 *      word full and concatenate all preceding words' initials with dots.
 *      e.g. + surname "Viza" → "M.F.I. Diasputra"
 *
 *   3. If the abbreviated form still exceeds limit, truncate with "…".
 *      e.g. "M.F.I.D.S.A.V.X.G.H" (20 chars, limit 18) → "M.F.I.D.S.A.V.X.G…"
 */
export function abbreviateName(
  fullName: string,
  surname: string | null | undefined,
  limit: number,
): string {
  if (fullName.length <= limit) return fullName

  const words = fullName.trim().split(/\s+/)
  if (words.length <= 1) {
    // Single-word name — can only hard-truncate
    return fullName.length > limit ? fullName.slice(0, limit - 1) + '…' : fullName
  }

  let abbreviated: string

  const nicknameLC = surname?.trim().toLowerCase()
  // Rule 1: find the word that contains the surname
  const keyIdx = nicknameLC
    ? words.findIndex((w) => w.toLowerCase().includes(nicknameLC))
    : -1

  if (keyIdx !== -1) {
    // Keep the matched word full; abbreviate all others to "X."
    const parts = words.map((w, i) => (i === keyIdx ? w : `${w[0]!}.`))
    abbreviated = parts.join(' ')
  } else {
    // Rule 2: keep last word full; join preceding initials without spaces
    const lastWord = words[words.length - 1]!
    const initials = words.slice(0, -1).map((w) => w[0]!).join('.') + '.'
    abbreviated = `${initials} ${lastWord}`
  }

  // Rule 3: if abbreviated form still exceeds limit, convert ALL words to
  // initials first — never truncate mid-word.
  // Only apply ellipsis as the final resort when even all-initials won't fit.
  if (abbreviated.length > limit) {
    const allInitials = words.map((w) => w[0]!).join('.') + '.'
    if (allInitials.length <= limit) return allInitials
    return allInitials.slice(0, limit - 1) + '…'
  }

  return abbreviated
}
