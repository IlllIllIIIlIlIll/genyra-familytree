'use client'

import { memo, type FC, type ReactElement } from 'react'
import {
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { COLOR } from '@/lib/design-tokens'

interface RelationshipData extends Record<string, unknown> {
  relationshipType: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING'
  highlighted?: boolean
}

export const RelationshipEdgeComponent: FC<EdgeProps & { data: RelationshipData }> = memo(
  function RelationshipEdgeComponent({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  }): ReactElement {
    const type = data?.relationshipType ?? 'PARENT_CHILD'
    const highlighted = data?.highlighted ?? false

    let edgePath: string

    if (type === 'SPOUSE') {
      // Gentle bezier arc between spouses (side by side, left↔right handles)
      ;[edgePath] = getBezierPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        curvature: 0.25,
      })
    } else {
      // Orthogonal step path for PARENT_CHILD / SIBLING
      ;[edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 8,
        offset: 40,
      })
    }

    const colors: Record<string, string> = {
      PARENT_CHILD: COLOR.EDGE_PARENT_CHILD,
      SPOUSE:       COLOR.EDGE_SPOUSE,
      SIBLING:      COLOR.EDGE_SIBLING,
    }

    const isActive    = selected || highlighted
    const color       = isActive ? COLOR.EDGE_HIGHLIGHT : (colors[type] ?? COLOR.EDGE_PARENT_CHILD)
    const strokeWidth = isActive ? 2.5 : type === 'SPOUSE' ? 2 : 1.5
    const strokeDash  = type === 'SPOUSE' ? '6 3' : undefined

    return (
      <>
        {/* White bridge — visually "erases" bracket lines where they cross */}
        <path
          d={edgePath}
          fill="none"
          stroke="#f5f0e8"
          strokeWidth={strokeWidth + 5}
          strokeDasharray={undefined}
          strokeLinecap="round"
        />
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
          strokeLinecap="round"
          opacity={isActive ? 1 : 0.75}
        />
      </>
    )
  },
)
