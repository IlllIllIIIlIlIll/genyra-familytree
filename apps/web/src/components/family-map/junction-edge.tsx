'use client'

import { memo, type FC, type ReactElement } from 'react'
import { BaseEdge, type EdgeProps } from '@xyflow/react'
import { COLOR } from '@/lib/design-tokens'

interface JunctionEdgeData extends Record<string, unknown> {
  junctionSide?: 'toJunction' | 'fromJunction'
  highlighted?: boolean
}

/**
 * Right-angle bracket lines for the genealogy tree.
 *
 * toJunction  (parent → junction dot):
 *   Straight down from parent center → horizontal to junction center.
 *   Path: M sx,sy  L sx,ty  L tx,ty
 *
 * fromJunction (junction dot → child):
 *   Horizontal from junction center to child X → straight down to child top.
 *   Path: M sx,sy  L tx,sy  L tx,ty
 */
export const JunctionEdgeComponent: FC<EdgeProps & { data?: JunctionEdgeData }> = memo(
  function JunctionEdgeComponent({
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
  }): ReactElement {
    const side        = data?.junctionSide ?? 'fromJunction'
    const highlighted = data?.highlighted ?? false

    const path =
      side === 'toJunction'
        ? `M ${sourceX},${sourceY} L ${sourceX},${targetY} L ${targetX},${targetY}`
        : `M ${sourceX},${sourceY} L ${targetX},${sourceY} L ${targetX},${targetY}`

    const stroke      = highlighted ? COLOR.EDGE_HIGHLIGHT : COLOR.EDGE_JUNCTION
    const strokeWidth = highlighted ? 2.5 : 1.5
    const opacity     = highlighted ? 1 : 0.6

    return (
      <BaseEdge
        path={path}
        style={{ stroke, strokeWidth, opacity }}
      />
    )
  },
)
