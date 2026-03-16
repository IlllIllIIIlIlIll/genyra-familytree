'use client'

import { memo, useMemo, type FC, type ReactElement } from 'react'
import { useNodes, type EdgeProps } from '@xyflow/react'
import { CANVAS, COLOR } from '@/lib/design-tokens'

const { NODE_W, NODE_H, JUNCTION_OFFSET } = CANVAS

export interface BracketEdgeData extends Record<string, unknown> {
  parentIds:           string[]
  childIds:            string[]
  junctionY:           number
  /**
   * Per-parent x-offset for the stem exit point (px).
   * Set for remarried parents so each marriage's child line exits from a
   * slightly different position on the card bottom (left vs right of centre).
   */
  parentStemOffsets?:  Record<string, number>
  /** True when the selected node is a PARENT in this bracket */
  highlighted?:        boolean
  /** Set to the selected child's ID to highlight only that child's path */
  highlightedChildId?: string
}

/**
 * Two-level T-junction bracket:
 *
 *   Parent1   Parent2
 *      |          |          ← parent stems
 *      +----+-----+          ← parent bar  (parentBarY = junctionY)
 *           |                ← trunk
 *      +----+-----+          ← child bar   (childBarY  = childTop − JUNCTION_OFFSET)
 *      |          |          ← child L-paths (bar segment + stem combined)
 *   Child1    Child2
 *
 * Highlight rules:
 *   • Parent selected  → everything highlighted
 *   • Child C selected → parent stems + bar + trunk highlighted;
 *                        only C's L-path highlighted; siblings stay dim
 *   • Nothing selected → everything dim
 */
export const BracketEdgeComponent: FC<EdgeProps & { data: BracketEdgeData }> = memo(
  function BracketEdgeComponent({ data }): ReactElement {
    const nodes = useNodes()

    const posById = useMemo(() => {
      const m = new Map<string, { x: number; y: number }>()
      for (const n of nodes) m.set(n.id, n.position)
      return m
    }, [nodes])

    const parentIds          = data?.parentIds          ?? []
    const childIds           = data?.childIds           ?? []
    const jY                 = data?.junctionY          ?? 0
    const parentStemOffsets  = data?.parentStemOffsets  as Record<string, number> | undefined
    const highlighted        = data?.highlighted        ?? false
    const highlightedChildId = data?.highlightedChildId as string | undefined

    const parentPos = parentIds.map((id) => posById.get(id))
    const childPos  = childIds.map((id)  => posById.get(id))
    if (parentPos.some((p) => !p) || childPos.some((p) => !p)) return <></>

    const parentXs = parentPos.map((p) => p!.x + NODE_W / 2)
    const childXs  = childPos.map((p)  => p!.x + NODE_W / 2)

    // Apply per-parent stem offsets (remarried parents get distinct exit points)
    const parentXsOffset = parentIds.map((id, i) =>
      parentXs[i]! + (parentStemOffsets?.[id] ?? 0),
    )

    // ── Geometry ──────────────────────────────────────────────────────────────

    const parentBarY = jY                                      // just below parents
    const childTopY  = Math.min(...childPos.map((p) => p!.y))
    const childBarY  = childTopY - JUNCTION_OFFSET             // just above children

    // Bar and trunk use the offset X values so the bar endpoint + trunk root
    // align with the actual stem exit point on each card.
    const parentBarMinX = Math.min(...parentXsOffset)
    const parentBarMaxX = Math.max(...parentXsOffset)
    // Trunk hangs from the center of the parent bar (or the single parent X)
    const trunkX = parentXsOffset.length === 1
      ? parentXsOffset[0]!
      : (parentBarMinX + parentBarMaxX) / 2

    // ── Highlight logic ───────────────────────────────────────────────────────

    // Base paths (stems + bar + trunk) light up when any child OR the parent is selected
    const baseHit = highlighted || (!!highlightedChildId && childIds.includes(highlightedChildId))
    const baseStroke  = baseHit ? COLOR.EDGE_HIGHLIGHT : COLOR.EDGE_JUNCTION
    const baseWidth   = baseHit ? 2.5 : 1.5
    const baseOpacity = baseHit ? 1   : 0.6

    // ── Parent stems ──────────────────────────────────────────────────────────
    const parentStemD = parentIds.map((_, i) => {
      const px = parentXsOffset[i]!   // offset point on card bottom
      const py = parentPos[i]!.y + NODE_H
      return `M ${px},${py} L ${px},${parentBarY}`
    }).join(' ')

    // ── Parent bar (only when 2 parents at different X) ───────────────────────
    const parentBarD = parentBarMinX < parentBarMaxX
      ? `M ${parentBarMinX},${parentBarY} L ${parentBarMaxX},${parentBarY}`
      : ''

    // ── Trunk ─────────────────────────────────────────────────────────────────
    const trunkD = `M ${trunkX},${parentBarY} L ${trunkX},${childBarY}`

    // ── Per-child L-paths (child bar segment + child stem) ────────────────────
    //   Each path: trunk → child X (horizontally) → child top (vertically)
    const childPaths = childIds.map((cid, i) => {
      const cx    = childXs[i]!
      const cy    = childPos[i]!.y
      const isHit = highlighted || cid === highlightedChildId
      const d = Math.abs(cx - trunkX) < 1
        ? `M ${cx},${childBarY} L ${cx},${cy}`
        : `M ${trunkX},${childBarY} L ${cx},${childBarY} L ${cx},${cy}`
      return { d, isHit }
    })

    return (
      <>
        {/* Parent stems */}
        <path
          d={parentStemD}
          fill="none"
          stroke={baseStroke}
          strokeWidth={baseWidth}
          opacity={baseOpacity}
          strokeLinecap="round"
        />
        {/* Parent bar */}
        {parentBarD && (
          <path
            d={parentBarD}
            fill="none"
            stroke={baseStroke}
            strokeWidth={baseWidth}
            opacity={baseOpacity}
            strokeLinecap="round"
          />
        )}
        {/* Trunk */}
        <path
          d={trunkD}
          fill="none"
          stroke={baseStroke}
          strokeWidth={baseWidth}
          opacity={baseOpacity}
          strokeLinecap="round"
        />
        {/* Per-child L-paths */}
        {childPaths.map((cp, i) => (
          <path
            key={i}
            d={cp.d}
            fill="none"
            stroke={cp.isHit ? COLOR.EDGE_HIGHLIGHT : COLOR.EDGE_JUNCTION}
            strokeWidth={cp.isHit ? 2.5 : 1.5}
            opacity={cp.isHit ? 1   : 0.6}
            strokeLinecap="round"
          />
        ))}
      </>
    )
  },
)
