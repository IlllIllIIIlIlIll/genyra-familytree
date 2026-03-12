'use client'

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import { useMapUIStore } from '@/store/map-store'
import { CANVAS, MINIMAP, COLOR } from '@/lib/design-tokens'
import { PersonNodeComponent } from './person-node'
import { JunctionNodeComponent } from './junction-node'
import { RelationshipEdgeComponent } from './relationship-edge'
import { JunctionEdgeComponent } from './junction-edge'
import { ProfileCard } from '@/components/profile/profile-card'
import { computeFamilyLayout } from './family-layout'
import type { PersonNode } from '@genyra/shared-types'

const nodeTypes = {
  personNode:   PersonNodeComponent,
  junctionNode: JunctionNodeComponent,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdgeComponent,
  junctionEdge:     JunctionEdgeComponent,
}

interface PersonNodeData extends Record<string, unknown> {
  node: PersonNode
  isCurrentUser: boolean
}

interface JunctionData extends Record<string, unknown> {
  isJunction: true
}

type FlowNodeData = PersonNodeData | JunctionData

interface FamilyMapCanvasProps {
  familyGroupId: string
}

export function FamilyMapCanvas({ familyGroupId }: FamilyMapCanvasProps) {
  const { isProfilePanelOpen, selectedNodeId, closeProfilePanel, openProfilePanel } =
    useMapUIStore()

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn: () => apiClient.getMapData(familyGroupId),
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) =>
      apiClient.updateCanvasPosition(id, { canvasX: x, canvasY: y }),
  })

  useEffect(() => {
    if (!mapData) return

    const { positions, junctions, edges: edgeMetas } = computeFamilyLayout(mapData)

    const personNodes: Node<FlowNodeData>[] = mapData.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: n.canvasX, y: n.canvasY }
      return {
        id:       n.id,
        type:     'personNode',
        position: pos,
        data:     { node: n, isCurrentUser: false } satisfies PersonNodeData,
        draggable: true,
      }
    })

    const junctionNodes: Node<FlowNodeData>[] = junctions.map((j) => ({
      id:         j.id,
      type:       'junctionNode',
      position:   { x: j.x, y: j.y },
      data:       { isJunction: true } satisfies JunctionData,
      draggable:  false,
      selectable: false,
      focusable:  false,
    }))

    const flowEdges: Edge[] = edgeMetas.map((em) => ({
      id:           em.id,
      source:       em.source,
      target:       em.target,
      sourceHandle: em.sourceHandle,
      targetHandle: em.targetHandle,
      type:         em.edgeType,
      data:         { relationshipType: em.relationshipType },
    }))

    setNodes([...personNodes, ...junctionNodes])
    setEdges(flowEdges)
  }, [mapData, setNodes, setEdges])

  // Debounced position save — only for person nodes, never junctions
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<FlowNodeData>>[]) => {
      onNodesChange(changes)

      for (const c of changes) {
        if (
          c.type === 'position' &&
          'dragging' in c && !c.dragging &&
          'position' in c && c.position != null &&
          !c.id.startsWith('junc_')
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

  const selectedNode = mapData?.nodes.find((n) => n.id === selectedNodeId)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-2 border-brand-400 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading your family tree…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: CANVAS.FIT_PADDING }}
        minZoom={CANVAS.MIN_ZOOM}
        maxZoom={CANVAS.MAX_ZOOM}
        proOptions={{ hideAttribution: true }}
        className="bg-brand-50"
      >
        <Background color={COLOR.MAP_GRID_DOT} gap={24} size={1} />
        <Controls className="!shadow-sm !border-brand-100" showInteractive={false} />
        <MiniMap
          nodeColor={COLOR.MINIMAP_NODE}
          maskColor={COLOR.MINIMAP_MASK}
          className="!border-brand-100 !rounded-xl overflow-hidden"
          width={MINIMAP.WIDTH}
          height={MINIMAP.HEIGHT}
        />
      </ReactFlow>

      {isProfilePanelOpen && selectedNode && (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <ProfileCard node={selectedNode} onClose={closeProfilePanel} />
        </div>
      )}
    </div>
  )
}
