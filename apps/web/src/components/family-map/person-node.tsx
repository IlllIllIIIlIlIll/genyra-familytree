'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { FONT, CANVAS, MAX_CHARS } from '@/lib/design-tokens'
import type { PersonNode } from '@genyra/shared-types'

interface PersonNodeData {
  node: PersonNode
  isCurrentUser: boolean
}

const handleCls = '!opacity-0 !w-2 !h-2 !border-0 !bg-transparent'

export const PersonNodeComponent = memo(function PersonNodeComponent({
  data,
  selected,
}: NodeProps & { data: PersonNodeData }) {
  const { node, isCurrentUser } = data

  return (
    <>
      {/* Target handles (incoming edges) */}
      <Handle type="target" position={Position.Top}    id="top"    className={handleCls} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleCls} />
      <Handle type="target" position={Position.Left}   id="left"   className={handleCls} />
      <Handle type="target" position={Position.Right}  id="right"  className={handleCls} />

      {/* Source handles (outgoing edges) */}
      <Handle type="source" position={Position.Top}    id="top"    className={handleCls} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleCls} />
      <Handle type="source" position={Position.Left}   id="left"   className={handleCls} />
      <Handle type="source" position={Position.Right}  id="right"  className={handleCls} />

      <div
        style={{ width: CANVAS.NODE_W }}
        className={cn(
          'flex flex-col items-center gap-2 p-3 cursor-pointer select-none',
          'bg-white rounded-2xl border shadow-sm transition-all',
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
        <div className="text-center w-full overflow-hidden">
          <p className={cn(FONT.NODE_NAME, 'font-semibold text-slate-800 leading-tight truncate')}>
            {node.displayName.length > MAX_CHARS.NODE_NAME
              ? `${node.displayName.slice(0, MAX_CHARS.NODE_NAME)}…`
              : node.displayName}
          </p>
          {node.gender && (
            <p className={cn(FONT.NODE_BADGE, 'text-slate-400 mt-0.5')}>
              {node.gender === 'MALE' ? '♂' : '♀'}
              {node.surname && (
                <span className="ml-1 opacity-80">
                  {node.surname.length > MAX_CHARS.NODE_SURNAME
                    ? `${node.surname.slice(0, MAX_CHARS.NODE_SURNAME)}…`
                    : node.surname}
                </span>
              )}
            </p>
          )}
          {node.birthDate && (
            <p className={cn(FONT.NODE_YEAR, 'text-slate-400 mt-0.5')}>
              {new Date(node.birthDate).getFullYear()}
              {node.deathDate ? ` – ${new Date(node.deathDate).getFullYear()}` : ''}
            </p>
          )}
        </div>
        {isCurrentUser && (
          <span className={cn('absolute -top-1.5 -right-1.5 font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded-full', FONT.NODE_BADGE)}>
            You
          </span>
        )}
        {node.isPlaceholder && (
          <span className={cn('absolute -top-1.5 -left-1.5 font-bold bg-slate-400 text-white px-1.5 py-0.5 rounded-full', FONT.NODE_BADGE)}>
            ?
          </span>
        )}
      </div>
    </>
  )
})
