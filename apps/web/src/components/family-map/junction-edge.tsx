'use client'

import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { COLOR } from '@/lib/design-tokens'

export const JunctionEdgeComponent = memo(function JunctionEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: 20,
  })

  return (
    <BaseEdge
      path={path}
      style={{
        stroke: COLOR.EDGE_JUNCTION,
        strokeWidth: 1.5,
        opacity: 0.6,
      }}
    />
  )
})
