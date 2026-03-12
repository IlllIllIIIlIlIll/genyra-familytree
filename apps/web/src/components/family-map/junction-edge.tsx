'use client'

import { memo } from 'react'
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import { COLOR } from '@/lib/design-tokens'

export const JunctionEdgeComponent = memo(function JunctionEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  return (
    <BaseEdge
      path={path}
      style={{
        stroke: COLOR.EDGE_JUNCTION,
        strokeWidth: 1.5,
        opacity: 0.65,
      }}
    />
  )
})
