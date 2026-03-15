'use client'

import { memo, useMemo, type FC, type ReactElement } from 'react'
import { useNodes, type EdgeProps } from '@xyflow/react'
import { CANVAS, COLOR } from '@/lib/design-tokens'

const { NODE_W, NODE_H } = CANVAS

export interface BracketEdgeData extends Record<string, unknown> {
  parentIds:          string[]
  childIds:           string[]
  junctionY:          number
  /** True when the selected node is a PARENT in this bracket (highlight whole bracket) */
  highlighted?:       boolean
  /** Set to the selected child's ID to highlight only that child's stem */
  highlightedChildId?: string
}

/**
 * Draws a family H-bar bracket as SVG.
 *
 * Structure:
 *   - One <path> for parent stems + horizontal bar  (highlighted if `highlighted`)
 *   - One <path> per child stem                      (highlighted if that child is selected)
 *
 * This lets clicking a child node highlight only its own stem, not its siblings'.
 */
export const BracketEdgeComponent: FC<EdgeProps & { data: BracketEdgeData }> = memo(
  function BracketEdgeComponent({ data }): ReactElement {
    const nodes = useNodes()

    const posById = useMemo(() => {
      const m = new Map<string, { x: number; y: number }>()
      for (const n of nodes) m.set(n.id, n.position)
      return m
    }, [nodes])

    const parentIds        = data?.parentIds        ?? []
    const childIds         = data?.childIds         ?? []
    const jY               = data?.junctionY        ?? 0
    const highlighted      = data?.highlighted      ?? false
    const highlightedChildId = data?.highlightedChildId as string | undefined

    const parentPos = parentIds.map((id) => posById.get(id))
    const childPos  = childIds.map((id)  => posById.get(id))
    if (parentPos.some((p) => !p) || childPos.some((p) => !p)) return <></>

    const parentXs = parentPos.map((p) => p!.x + NODE_W / 2)
    const childXs  = childPos.map((p)  => p!.x + NODE_W / 2)

    // Bar spans parents AND children so no child stem is ever left "floating"
    const allXs   = [...parentXs, ...childXs]
    const barMinX = Math.min(...allXs)
    const barMaxX = Math.max(...allXs)

    // When a child is selected, the full path parent→junction→child lights up.
    // "anyChildHit" makes parent stems + bar highlight alongside the child stem.
    const anyChildHit = highlighted || (!!highlightedChildId && childIds.includes(highlightedChildId))

    const baseSegs: string[] = []
    for (let i = 0; i < parentIds.length; i++) {
      const px = parentXs[i]!
      const py = parentPos[i]!.y + NODE_H
      baseSegs.push(`M ${px},${py} L ${px},${jY}`)
    }
    if (barMinX < barMaxX) baseSegs.push(`M ${barMinX},${jY} L ${barMaxX},${jY}`)

    const baseStroke  = anyChildHit ? COLOR.EDGE_HIGHLIGHT : COLOR.EDGE_JUNCTION
    const baseWidth   = anyChildHit ? 2.5 : 1.5
    const baseOpacity = anyChildHit ? 1   : 0.6

    // ── Per-child stems (individually highlightable) ───────────────────────────
    const childSegs = childIds.map((cid, i) => {
      const cx    = childXs[i]!
      const cy    = childPos[i]!.y
      const isHit = highlighted || cid === highlightedChildId
      return {
        d:       `M ${cx},${jY} L ${cx},${cy}`,
        stroke:  isHit ? COLOR.EDGE_HIGHLIGHT : COLOR.EDGE_JUNCTION,
        width:   isHit ? 2.5 : 1.5,
        opacity: isHit ? 1   : 0.6,
      }
    })

    return (
      <>
        <path
          d={baseSegs.join(' ')}
          fill="none"
          stroke={baseStroke}
          strokeWidth={baseWidth}
          opacity={baseOpacity}
          strokeLinecap="round"
        />
        {childSegs.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.stroke}
            strokeWidth={seg.width}
            opacity={seg.opacity}
            strokeLinecap="round"
          />
        ))}
      </>
    )
  },
)
