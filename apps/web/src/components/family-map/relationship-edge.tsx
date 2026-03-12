'use client'

import { memo, type FC, type ReactElement } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

interface RelationshipData {
  relationshipType: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING'
}

const edgeColors: Record<string, string> = {
  PARENT_CHILD: '#e8829a',
  SPOUSE: '#b8b8c8',
  SIBLING: '#d4a0b0',
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
    const [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 16,
    })

    const type = data?.relationshipType ?? 'PARENT_CHILD'
    const color = edgeColors[type] ?? '#e8829a'

    return (
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.7,
        }}
      />
    )
  },
)

