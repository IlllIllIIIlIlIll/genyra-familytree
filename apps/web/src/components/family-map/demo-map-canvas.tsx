'use client'

import {
  ReactFlow,
  ReactFlowProvider,
  Panel,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToastStore } from '@/store/map-store'
import { CANVAS, COLOR } from '@/lib/design-tokens'
import { PersonNodeComponent } from './person-node'
import { RelationshipEdgeComponent } from './relationship-edge'
import { BracketEdgeComponent } from './bracket-edge'
import { DemoProfileCard } from './demo-profile-card'
import { computeFamilyLayout } from './family-layout'
import { demoMapData } from '@/lib/demo-data'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import type { PersonNode } from '@genyra/shared-types'

const nodeTypes = {
  personNode: PersonNodeComponent,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdgeComponent,
  bracketEdge:      BracketEdgeComponent,
}

interface PersonNodeData extends Record<string, unknown> {
  node: PersonNode
  isCurrentUser: boolean
}

type FlowNodeData = PersonNodeData

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

// Layout is fixed data, so it's computed once outside the component.
const { positions: DEMO_POSITIONS, edges: DEMO_EDGE_METAS } = computeFamilyLayout(demoMapData)

function buildInitialNodes(): Node<FlowNodeData>[] {
  return demoMapData.nodes.map((n) => ({
    id: n.id,
    type: 'personNode',
    position: DEMO_POSITIONS.get(n.id) ?? { x: 0, y: 0 },
    data: { node: n, isCurrentUser: false } satisfies PersonNodeData,
    draggable: true,
  }))
}

function buildInitialEdges(): Edge[] {
  return DEMO_EDGE_METAS.map((em) => ({
    id: em.id, source: em.source, target: em.target,
    sourceHandle: em.sourceHandle, targetHandle: em.targetHandle,
    type: em.edgeType,
    data: {
      relationshipType: em.relationshipType,
      ...(em.bracketParentIds && {
        parentIds:         em.bracketParentIds,
        childIds:          em.bracketChildIds,
        junctionY:         em.bracketJunctionY,
        parentStemOffsets: em.bracketParentStemOffsets,
      }),
    },
  }))
}

// ── Inner component (must be inside ReactFlowProvider to use useReactFlow) ─────
function DemoMapInner() {
  const { fitView, setCenter } = useReactFlow()
  const toast = useToastStore((s) => s.toast)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(buildInitialNodes())
  const [edges] = useEdgesState<Edge>(buildInitialEdges())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Ambient, hard-to-miss reminder: fires once on load, in addition to the
  // persistent banner rendered by the page shell.
  useEffect(() => {
    toast('This is a demo — nothing you do here is saved.', 'neutral', 6000)
  }, [toast])

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FlowNodeData>) => {
      if (node.type !== 'personNode') return
      setSelectedNodeId(node.id)
      setCenter(
        node.position.x + CANVAS.NODE_W / 2,
        node.position.y + CANVAS.NODE_H / 2,
        { zoom: 1.5, duration: 600 },
      )
    },
    [setCenter],
  )

  const handleResetLayout = useCallback(() => {
    setNodes(buildInitialNodes())
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: CANVAS.FIT_PADDING, duration: 400 })
      })
    })
  }, [setNodes, fitView])

  // Highlight only directly-connected edges for the selected node (same rule
  // as the authenticated canvas).
  const highlightedEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    const ids = new Set<string>()
    for (const e of edges) {
      const d        = e.data as Record<string, unknown> | undefined
      const edgeType = (d?.edgeType ?? e.type) as string | undefined
      if (edgeType === 'bracketEdge') {
        const parents = (d?.parentIds as string[] | undefined) ?? []
        if (parents.includes(selectedNodeId)) ids.add(e.id)
      } else if (e.source === selectedNodeId || e.target === selectedNodeId) {
        ids.add(e.id)
      }
    }
    return ids
  }, [selectedNodeId, edges])

  const displayEdges = useMemo(
    () => edges.map((e) => {
      const d        = e.data as Record<string, unknown> | undefined
      const edgeType = (d?.edgeType ?? e.type) as string | undefined
      const extra: Record<string, unknown> = {}
      if (edgeType === 'bracketEdge' && selectedNodeId) {
        const children = (d?.childIds as string[] | undefined) ?? []
        if (children.includes(selectedNodeId)) extra.highlightedChildId = selectedNodeId
      }
      return { ...e, data: { ...(d ?? {}), highlighted: highlightedEdgeIds.has(e.id), ...extra } }
    }),
    [edges, highlightedEdgeIds, selectedNodeId],
  )

  const selectedNode = demoMapData.nodes.find((n) => n.id === selectedNodeId)

  return (
    <div className="flex-1 flex flex-col" style={{ touchAction: 'none' }}>
      {/* ── Persistent demo banner — ambient "nothing is saved" reminder ───── */}
      <div className="shrink-0 z-30 flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
        <span>You&apos;re exploring a demo family tree — nothing you do here is saved.</span>
      </div>

      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-brand-400 shrink-0">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-sm font-semibold text-slate-700 dark:text-stone-100 truncate">
            {demoMapData.familyName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitcher />
          <Link
            href="/login"
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={true}
          elementsSelectable={true}
          panOnDrag={true}
          fitView
          fitViewOptions={{ padding: CANVAS.FIT_PADDING }}
          minZoom={CANVAS.MIN_ZOOM}
          maxZoom={CANVAS.MAX_ZOOM}
          proOptions={{ hideAttribution: true }}
          style={{ background: COLOR.CANVAS_BG }}
        >
          <Panel position="bottom-left" style={{ bottom: 8 }}>
            <button
              onClick={handleResetLayout}
              className="react-flow__controls-button"
              title="Reset tree layout"
            >
              <RefreshIcon />
            </button>
          </Panel>

          <MiniMap
            nodeColor={COLOR.MINIMAP_NODE}
            maskColor={COLOR.MINIMAP_MASK}
            className="!border-stone-200 dark:!border-stone-700 !rounded-xl overflow-hidden"
            style={{ width: 120, height: 75 }}
          />
        </ReactFlow>

        {/* ── Dark backdrop when a card is selected ───────────────────────── */}
        {selectedNode && (
          <div className="absolute inset-0 z-[9] bg-black/40 pointer-events-none transition-opacity duration-200" />
        )}

        {/* ── Read-only profile card ──────────────────────────────────────── */}
        {selectedNode && (
          <div className="absolute inset-x-0 bottom-0 z-10">
            <DemoProfileCard node={selectedNode} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Public export: wraps with ReactFlowProvider so useReactFlow() works ────────
export function DemoMapCanvas() {
  return (
    <ReactFlowProvider>
      <DemoMapInner />
    </ReactFlowProvider>
  )
}
