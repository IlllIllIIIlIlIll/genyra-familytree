'use client'

import {
  ReactFlow,
  ReactFlowProvider,
  Panel,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toPng } from 'html-to-image'
import { apiClient } from '@/lib/api-client'
import { useMapUIStore, useAuthStore } from '@/store/map-store'
import { CANVAS, COLOR } from '@/lib/design-tokens'
import { PersonNodeComponent } from './person-node'
import { RelationshipEdgeComponent } from './relationship-edge'
import { BracketEdgeComponent } from './bracket-edge'
import { ProfileCard } from '@/components/profile/profile-card'
import { computeFamilyLayout } from './family-layout'
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

interface FamilyMapCanvasProps {
  familyGroupId: string
}

// Use visualViewport when available (more accurate on mobile — excludes browser chrome).
function getMinimapSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 120, height: 75 }
  const vp    = window.visualViewport
  const vw    = vp?.width  ?? window.innerWidth
  const vh    = vp?.height ?? window.innerHeight
  const ratio = vw / vh
  const BASE_H = 75
  if (ratio >= 1) {
    return { width: Math.min(Math.max(Math.round(BASE_H * ratio), 80), 200), height: BASE_H }
  }
  return { width: BASE_H, height: Math.min(Math.max(Math.round(BASE_H / ratio), 80), 150) }
}

// ── SVG icons ──────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

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

// ── Inner component (must be inside ReactFlowProvider to use useReactFlow) ─────
function FamilyMapInner({ familyGroupId }: FamilyMapCanvasProps) {
  const { fitView, setCenter, getNode, getViewport, setViewport } = useReactFlow()
  const queryClient = useQueryClient()

  const {
    isProfilePanelOpen, selectedNodeId,
    closeProfilePanel, openProfilePanel,
    isCleanView, toggleCleanView,
  } = useMapUIStore()

  const router        = useRouter()
  const clearAuth     = useAuthStore((s) => s.clear)
  const currentUserId = useAuthStore((s) => s.userId)
  const canvasRef     = useRef<HTMLDivElement>(null)
  const [minimapSize, setMinimapSize] = useState(getMinimapSize)

  useEffect(() => {
    const update = () => setMinimapSize(getMinimapSize())
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn:  () => apiClient.getMapData(familyGroupId),
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])
  const [rawEdges, setRawEdges, onEdgesChange] = useEdgesState<Edge>([])
  const positionSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldFitViewRef   = useRef(false)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [translateExtent, setTranslateExtent] = useState<[[number, number], [number, number]]>(
    [[-Infinity, -Infinity], [Infinity, Infinity]],
  )

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) =>
      apiClient.updateCanvasPosition(id, { canvasX: x, canvasY: y }),
  })

  useEffect(() => {
    if (!mapData) return
    const { positions, edges: edgeMetas } = computeFamilyLayout(mapData)

    const personNodes: Node<FlowNodeData>[] = mapData.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: n.canvasX, y: n.canvasY }
      return {
        id: n.id, type: 'personNode', position: pos,
        data: { node: n, isCurrentUser: n.userId === currentUserId } satisfies PersonNodeData,
        draggable: true,
      }
    })

    setNodes(personNodes)
    setRawEdges(edgeMetas.map((em) => ({
      id: em.id, source: em.source, target: em.target,
      sourceHandle: em.sourceHandle, targetHandle: em.targetHandle,
      type: em.edgeType,
      data: {
        relationshipType: em.relationshipType,
        ...(em.bracketParentIds && {
          parentIds: em.bracketParentIds,
          childIds:  em.bracketChildIds,
          junctionY: em.bracketJunctionY,
        }),
      },
    })))

    // Compute translate extent from layout bounding box + generous padding
    if (positions.size > 0) {
      const PAD = 600
      const xs = [...positions.values()].map((p) => p.x)
      const ys = [...positions.values()].map((p) => p.y)
      setTranslateExtent([
        [Math.min(...xs) - PAD, Math.min(...ys) - PAD],
        [Math.max(...xs) + CANVAS.NODE_W + PAD, Math.max(...ys) + CANVAS.NODE_H + PAD],
      ])
    }

    if (shouldFitViewRef.current) {
      shouldFitViewRef.current = false
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitView({ padding: CANVAS.FIT_PADDING, duration: 400 })
        })
      })
    }
  // layoutVersion forces re-layout even when mapData hasn't changed (drag reset).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData, layoutVersion, setNodes, setRawEdges, currentUserId, fitView])

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<FlowNodeData>>[]) => {
      onNodesChange(changes)
      for (const c of changes) {
        if (
          c.type === 'position' && 'dragging' in c && !c.dragging &&
          'position' in c && c.position != null && !c.id.startsWith('junc_')
        ) {
          const pos = c.position
          if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current)
          positionSaveTimer.current = setTimeout(() => {
            updatePositionMutation.mutate({ id: c.id, x: pos.x, y: pos.y })
          }, 500)
          break
        }
      }
    },
    [onNodesChange, updatePositionMutation],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FlowNodeData>) => {
      if (node.type !== 'personNode') return
      openProfilePanel(node.id)
    },
    [openProfilePanel],
  )

  const handleLogout = useCallback(() => {
    clearAuth()
    router.push('/login')
  }, [clearAuth, router])

  // Refresh: bump layoutVersion so the layout useEffect always re-runs (even if
  // mapData hasn't changed), and flag fitView to fire after re-layout.
  const handleRefresh = useCallback(() => {
    shouldFitViewRef.current = true
    setLayoutVersion((v) => v + 1)
    void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
  }, [queryClient, familyGroupId])

  // Navigate to the current user's person node, centred and zoomed.
  const currentUserPersonNode = mapData?.nodes.find((n) => n.userId === currentUserId)
  const handleViewCurrentUser = useCallback(() => {
    if (!currentUserPersonNode) return
    const rfNode = getNode(currentUserPersonNode.id)
    if (!rfNode) return
    setCenter(
      rfNode.position.x + CANVAS.NODE_W / 2,
      rfNode.position.y + CANVAS.NODE_H / 2,
      { zoom: 1.5, duration: 600 },
    )
  }, [currentUserPersonNode, getNode, setCenter])

  // Download: fit the view first so the export shows the full tree.
  const handleDownload = useCallback(async () => {
    const el = canvasRef.current
    if (!el) return
    const savedViewport = getViewport()
    try {
      await fitView({ padding: CANVAS.FIT_PADDING, duration: 0 })
      // Give the browser a paint cycle to apply the new viewport transform.
      await new Promise<void>((r) => { requestAnimationFrame(() => { requestAnimationFrame(() => r()) }) })
      const dataUrl = await toPng(el, { backgroundColor: '#f5f0e8', quality: 0.95 })
      const a = document.createElement('a')
      a.href     = dataUrl
      a.download = `${mapData?.familyName ?? 'family-tree'}.png`
      a.click()
    } catch {
      // Silent fail — toPng can fail on cross-origin images
    } finally {
      setViewport(savedViewport, { duration: 0 })
    }
  }, [mapData?.familyName, fitView, getViewport, setViewport])

  // Highlight only directly-connected edges for the selected node.
  //
  // Relationship edges (SPOUSE / SIBLING): highlight if node is source or target.
  // Bracket edges: highlight the whole bracket if node is a PARENT.
  //   If node is a CHILD, inject highlightedChildId instead (only that stem lights up).
  const highlightedEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    const ids = new Set<string>()
    for (const e of rawEdges) {
      const d       = e.data as Record<string, unknown> | undefined
      const edgeType = (d?.edgeType ?? e.type) as string | undefined

      if (edgeType === 'bracketEdge') {
        const parents = (d?.parentIds as string[] | undefined) ?? []
        // Only fully highlight when selected node is a PARENT (owns this bracket)
        if (parents.includes(selectedNodeId)) ids.add(e.id)
        // Child case handled via highlightedChildId in displayEdges below
      } else {
        // SPOUSE / SIBLING: direct connection only
        if (e.source === selectedNodeId || e.target === selectedNodeId) ids.add(e.id)
      }
    }
    return ids
  }, [selectedNodeId, rawEdges])

  const displayEdges = useMemo(
    () => rawEdges.map((e) => {
      const d        = e.data as Record<string, unknown> | undefined
      const edgeType = (d?.edgeType ?? e.type) as string | undefined
      const extra: Record<string, unknown> = {}

      if (edgeType === 'bracketEdge' && selectedNodeId) {
        const children = (d?.childIds as string[] | undefined) ?? []
        if (children.includes(selectedNodeId)) {
          extra.highlightedChildId = selectedNodeId
        }
      }

      return {
        ...e,
        data: { ...(d ?? {}), highlighted: highlightedEdgeIds.has(e.id), ...extra },
      }
    }),
    [rawEdges, highlightedEdgeIds, selectedNodeId],
  )

  const selectedNode = mapData?.nodes.find((n) => n.id === selectedNodeId)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#f5f0e8' }}>
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-2 border-brand-400 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading your family tree…</p>
        </div>
      </div>
    )
  }

  return (
    // touch-action: none overrides `html { touch-action: manipulation }` in globals.css
    // which would otherwise swallow React Flow's pointer drag events on touch screens.
    <div className="flex-1 flex flex-col" style={{ touchAction: 'none' }}>

      {/* ── Family header bar (hidden in clean view) ────────────────────────── */}
      {!isCleanView && (
        <header className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-sm border-b border-stone-200 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-brand-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="text-sm font-semibold text-slate-700">
              {mapData?.familyName ?? 'Family Map'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg text-slate-500 hover:bg-stone-100 transition-colors"
              title="Download family tree as PNG"
            >
              <DownloadIcon />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:bg-stone-100 transition-colors"
              title="Log out"
            >
              <LogoutIcon />
            </button>
          </div>
        </header>
      )}

      {/* ── Canvas area ────────────────────────────────────────────────────── */}
      <div ref={canvasRef} className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={closeProfilePanel}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={true}
          elementsSelectable={true}
          panOnDrag={true}
          fitView
          fitViewOptions={{ padding: CANVAS.FIT_PADDING }}
          minZoom={CANVAS.MIN_ZOOM}
          maxZoom={CANVAS.MAX_ZOOM}
          translateExtent={translateExtent}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#f5f0e8' }}
        >
          <Background
            variant={BackgroundVariant.Cross}
            color={COLOR.MAP_GRID_DOT}
            gap={32}
            size={5}
          />

          {/* ── Person + Refresh buttons (above the standard Controls) ───────── */}
          {!isCleanView && (
            <Panel position="bottom-left" style={{ bottom: 110 }}>
              <div className="flex flex-col gap-1">
                {currentUserPersonNode && (
                  <button
                    onClick={handleViewCurrentUser}
                    className="react-flow__controls-button"
                    title="Find me on the map"
                  >
                    <PersonIcon />
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  className="react-flow__controls-button"
                  title="Reset tree layout"
                >
                  <RefreshIcon />
                </button>
              </div>
            </Panel>
          )}

          {!isCleanView && (
            <Controls className="!shadow-sm !border-stone-200" showInteractive={false} />
          )}
          {!isCleanView && (
            <MiniMap
              nodeColor={COLOR.MINIMAP_NODE}
              maskColor={COLOR.MINIMAP_MASK}
              className="!border-stone-200 !rounded-xl overflow-hidden"
              style={{ width: minimapSize.width, height: minimapSize.height }}
            />
          )}
        </ReactFlow>

        {/* ── Eye toggle (always visible, top-right corner of canvas) ─────── */}
        <button
          onClick={toggleCleanView}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-stone-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
          title={isCleanView ? 'Show interface' : 'Hide interface (clean view)'}
        >
          {isCleanView ? <EyeOffIcon /> : <EyeIcon />}
        </button>

        {/* ── Profile card (hidden in clean view, closes via onPaneClick) ───── */}
        {!isCleanView && isProfilePanelOpen && selectedNode && (
          <div className="absolute inset-x-0 bottom-0 z-10">
            <ProfileCard node={selectedNode} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Public export: wraps with ReactFlowProvider so useReactFlow() works ────────
export function FamilyMapCanvas({ familyGroupId }: FamilyMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <FamilyMapInner familyGroupId={familyGroupId} />
    </ReactFlowProvider>
  )
}
