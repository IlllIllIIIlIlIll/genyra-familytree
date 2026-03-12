'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { PersonNode } from '@genyra/shared-types'

interface PersonNodeData {
  node: PersonNode
  isCurrentUser: boolean
}

export const PersonNodeComponent = memo(function PersonNodeComponent({
  data,
  selected,
}: NodeProps & { data: PersonNodeData }) {
  const { node, isCurrentUser } = data

  return (
    <>
      <Handle type="target" position={Position.Top} className="!opacity-0" />

      <div
        className={cn(
          'flex flex-col items-center gap-2 p-3 cursor-pointer select-none',
          'bg-white rounded-2xl border shadow-sm transition-all',
          'min-w-[88px] max-w-[110px]',
          selected
            ? 'border-brand-400 shadow-brand-200 shadow-md scale-105'
            : 'border-slate-100 hover:border-brand-300 hover:shadow-md',
          isCurrentUser && 'ring-2 ring-brand-400 ring-offset-1',
          node.isDeceased && 'opacity-70 grayscale',
        )}
      >
        <Avatar
          src={node.avatarUrl}
          name={node.displayName}
          size="md"
          className={cn(node.isDeceased && 'grayscale')}
        />
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">
            {node.displayName}
          </p>
          {node.birthDate && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {new Date(node.birthDate).getFullYear()}
              {node.deathDate ? ` – ${new Date(node.deathDate).getFullYear()}` : ''}
            </p>
          )}
        </div>
        {isCurrentUser && (
          <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded-full">
            You
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </>
  )
})
