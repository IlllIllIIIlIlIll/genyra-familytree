'use client'

import { memo, type FC, type ReactElement } from 'react'
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { COLOR } from '@/lib/design-tokens'

interface RelationshipData {
  relationshipType: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING'
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

    const color = colors[type] ?? COLOR.EDGE_PARENT_CHILD
    const strokeWidth = selected ? 2.5 : type === 'SPOUSE' ? 2 : 1.5
    const strokeDash = type === 'SPOUSE' ? '6 3' : undefined

    return (
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray: strokeDash,
          opacity: selected ? 1 : 0.75,
        }}
      />
    )
  },
)
