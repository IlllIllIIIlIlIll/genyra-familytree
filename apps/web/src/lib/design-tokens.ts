/**
 * Design tokens — single source of truth for all visual constants.
 * Import from here; never hardcode magic numbers or colours in components.
 */

// ─── Typography ───────────────────────────────────────────────────────────────
// Use these Tailwind class strings for consistent type scale.
export const FONT = {
  NODE_NAME:    'text-xs',      // 12px — name label inside map card
  NODE_YEAR:    'text-[10px]',  // 10px — birth/death year on card
  NODE_BADGE:   'text-[9px]',   // 9px  — "You" / "?" / gender badge
  LABEL:        'text-sm',      // 14px — form labels, secondary text
  BODY:         'text-sm',      // 14px — general body copy
  HEADING_SM:   'text-base',    // 16px — section headings
  HEADING_MD:   'text-xl',      // 20px — card headings
  HEADING_LG:   'text-2xl',     // 24px — page headings
} as const

// ─── Character Limits ─────────────────────────────────────────────────────────
export const MAX_CHARS = {
  // Input maximums (must match Zod schemas in shared-types)
  DISPLAY_NAME:    100,
  SURNAME:          50,
  BIRTH_PLACE:     100,
  BIO:            2000,
  NIK:              16,   // exactly 16 digits
  GROUP_NAME:      100,
  NOTES:           500,
  // Display truncation (canvas / UI)
  NODE_NAME:        12,   // chars shown on card before ellipsis
  NODE_SURNAME:     14,
  BIO_PREVIEW:     180,   // chars shown in profile card slide-up
} as const

// ─── Canvas & Layout ──────────────────────────────────────────────────────────
export const CANVAS = {
  NODE_W:          120,   // card width  (px)
  NODE_H:          110,   // card height (px)
  COUPLE_GAP:       24,   // horizontal gap between spouses
  UNIT_GAP:         80,   // horizontal gap between sibling-groups
  GEN_GAP:         220,   // vertical gap between generations
  JUNCTION_SIZE:     6,   // junction dot diameter (px) — kept for reference
  JUNCTION_OFFSET:  35,   // px below parent-row bottom where the horizontal bar sits
  MIN_ZOOM:       0.05,
  MAX_ZOOM:          2,
  FIT_PADDING:    0.35,
} as const

// ─── Minimap ──────────────────────────────────────────────────────────────────
export const MINIMAP = {
  WIDTH:   100,  // px — compact for mobile
  HEIGHT:   75,  // px
} as const

// ─── Avatar ───────────────────────────────────────────────────────────────────
// Pixel sizes must match the Avatar component's sizeMap entries.
export const AVATAR_PX = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
} as const

// Minimum tap target per Apple HIG / WCAG 2.5.5
export const TAP_MIN_PX = 44

// ─── Colours (inline — only use where Tailwind classes are not possible) ──────
// Values are CSS custom properties (defined in globals.css) so every colour
// here follows the active accent theme (`data-theme`) and light/dark mode
// (`.dark`) automatically — no JS-side recomputation needed.
export const COLOR = {
  EDGE_SPOUSE:        'var(--color-edge-spouse)',
  EDGE_PARENT_CHILD:  'var(--color-edge-parent-child)',
  EDGE_SIBLING:       'var(--color-edge-sibling)',
  EDGE_JUNCTION:      'var(--color-edge-junction)',
  EDGE_HIGHLIGHT:     'var(--color-edge-highlight)',
  MAP_GRID_DOT:       'var(--color-map-grid-dot)',
  MINIMAP_NODE:       'var(--color-minimap-node)',
  MINIMAP_MASK:       'var(--color-minimap-mask)',
  CANVAS_BG:          'var(--color-canvas-bg)',
} as const
