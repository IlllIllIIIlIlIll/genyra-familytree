'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { CANVAS } from '@/lib/design-tokens'

const H = '!opacity-0 !w-1 !h-1 !border-0 !bg-transparent'
const S = CANVAS.JUNCTION_SIZE

export const JunctionNodeComponent = memo(function JunctionNodeComponent() {
  return (
    <div
      style={{ width: S, height: S }}
      className="rounded-full bg-brand-300 opacity-40"
    >
      <Handle type="target" position={Position.Top}    id="top"    className={H} />
      <Handle type="target" position={Position.Left}   id="left"   className={H} />
      <Handle type="target" position={Position.Right}  id="right"  className={H} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={H} />
    </div>
  )
})
